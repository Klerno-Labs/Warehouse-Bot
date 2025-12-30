import type { IStorage } from "./storage";
import type { SessionUser } from "@shared/schema";
import type {
  Item,
  InventoryEvent,
  InventoryEventType,
  Uom,
} from "@shared/inventory";

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function convertQuantity(
  storage: IStorage,
  tenantId: string,
  itemId: string,
  qtyEntered: number,
  uomEntered: Uom,
): Promise<{ item: Item; qtyBase: number }> {
  const item = await storage.getItemById(itemId);
  if (!item || item.tenantId !== tenantId) {
    throw new InventoryError("Item not found", 404);
  }

  const conversion =
    item.allowedUoms.find((u) => u.uom === uomEntered) ||
    (item.baseUom === uomEntered ? { uom: uomEntered, toBase: 1 } : undefined);

  if (!conversion) {
    throw new InventoryError("Invalid UoM for item");
  }

  return { item, qtyBase: qtyEntered * conversion.toBase };
}

type ApplyEventInput = Omit<InventoryEvent, "id" | "createdAt" | "qtyBase"> & {
  qtyBase: number;
};

export async function applyInventoryEvent(
  storage: IStorage,
  user: SessionUser,
  event: ApplyEventInput,
): Promise<InventoryEvent> {
  const {
    tenantId,
    siteId,
    eventType,
    itemId,
    qtyBase,
    fromLocationId,
    toLocationId,
    reasonCodeId,
  } = event;

  if (tenantId !== user.tenantId) {
    throw new InventoryError("Tenant mismatch", 403);
  }

  const requiresReason = ["SCRAP", "ADJUST", "HOLD"].includes(eventType);
  if (requiresReason && !reasonCodeId) {
    throw new InventoryError("Reason code is required");
  }

  const isAdminAdjust =
    eventType === "ADJUST" && ["Admin", "Supervisor"].includes(user.role);

  const ensureLocation = (id?: string | null, label?: string) => {
    if (!id) {
      throw new InventoryError(`${label || "Location"} is required`);
    }
  };

  if (eventType === "RECEIVE") {
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "MOVE") {
    ensureLocation(fromLocationId, "fromLocationId");
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "ISSUE_TO_WORKCELL") {
    ensureLocation(fromLocationId, "fromLocationId");
  } else if (eventType === "RETURN") {
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "SCRAP") {
    ensureLocation(fromLocationId, "fromLocationId");
  } else if (eventType === "HOLD") {
    ensureLocation(fromLocationId, "fromLocationId");
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "RELEASE") {
    ensureLocation(fromLocationId, "fromLocationId");
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "COUNT") {
    ensureLocation(toLocationId, "toLocationId");
  }

  const deltas = new Map<string, number>();
  const addDelta = (locationId: string | null | undefined, delta: number) => {
    if (!locationId) return;
    deltas.set(locationId, (deltas.get(locationId) || 0) + delta);
  };

  switch (eventType as InventoryEventType) {
    case "RECEIVE":
      addDelta(toLocationId, qtyBase);
      break;
    case "MOVE":
      addDelta(fromLocationId, -qtyBase);
      addDelta(toLocationId, qtyBase);
      break;
    case "ISSUE_TO_WORKCELL":
      addDelta(fromLocationId, -qtyBase);
      addDelta(toLocationId, qtyBase);
      break;
    case "RETURN":
      addDelta(fromLocationId, -qtyBase);
      addDelta(toLocationId, qtyBase);
      break;
    case "SCRAP":
      addDelta(fromLocationId, -qtyBase);
      break;
    case "HOLD":
    case "RELEASE":
      addDelta(fromLocationId, -qtyBase);
      addDelta(toLocationId, qtyBase);
      break;
    case "COUNT": {
      if (!toLocationId) {
        throw new InventoryError("toLocationId is required");
      }
      const current = await storage.getInventoryBalance(
        tenantId,
        siteId,
        itemId,
        toLocationId,
      );
      const currentQty = current?.qtyBase || 0;
      addDelta(toLocationId, qtyBase - currentQty);
      break;
    }
    case "ADJUST":
      addDelta(fromLocationId, -qtyBase);
      addDelta(toLocationId, qtyBase);
      break;
    default:
      throw new InventoryError("Unsupported event type");
  }

  for (const [locationId, delta] of deltas.entries()) {
    const current = await storage.getInventoryBalance(
      tenantId,
      siteId,
      itemId,
      locationId,
    );
    const nextQty = (current?.qtyBase || 0) + delta;
    if (nextQty < 0 && !isAdminAdjust) {
      throw new InventoryError("Negative balance prevented");
    }
  }

  for (const [locationId, delta] of deltas.entries()) {
    const current = await storage.getInventoryBalance(
      tenantId,
      siteId,
      itemId,
      locationId,
    );
    const nextQty = (current?.qtyBase || 0) + delta;
    await storage.upsertInventoryBalance({
      tenantId,
      siteId,
      itemId,
      locationId,
      qtyBase: nextQty,
    });
  }

  return storage.createInventoryEvent(event);
}
