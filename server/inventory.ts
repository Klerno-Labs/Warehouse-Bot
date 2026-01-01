import { PrismaClient, type InventoryEventType, type Uom } from "@prisma/client";

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type AllowedUom = {
  uom: Uom;
  toBase: number;
};

export async function convertQuantity(
  prisma: PrismaClient,
  tenantId: string,
  itemId: string,
  qtyEntered: number,
  uomEntered: Uom,
): Promise<{ qtyBase: number }> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, tenantId },
  });

  if (!item) {
    throw new InventoryError("Item not found", 404);
  }

  const allowedUoms = item.allowedUoms as AllowedUom[];
  const conversion =
    allowedUoms.find((u) => u.uom === uomEntered) ||
    (item.baseUom === uomEntered ? { uom: uomEntered, toBase: 1 } : undefined);

  if (!conversion) {
    throw new InventoryError("Invalid UoM for item");
  }

  return { qtyBase: qtyEntered * conversion.toBase };
}

type ApplyEventInput = {
  tenantId: string;
  siteId: string;
  eventType: InventoryEventType;
  itemId: string;
  qtyEntered: number;
  uomEntered: Uom;
  qtyBase: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  workcellId?: string | null;
  referenceId?: string | null;
  reasonCodeId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  deviceId?: string | null;
};

type UserContext = {
  tenantId: string;
  role: string;
};

export async function applyInventoryEvent(
  prisma: PrismaClient,
  user: UserContext,
  event: ApplyEventInput,
): Promise<void> {
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

  // Validate reason code requirement
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

  // Validate location requirements based on event type
  if (eventType === "RECEIVE") {
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "MOVE") {
    ensureLocation(fromLocationId, "fromLocationId");
    ensureLocation(toLocationId, "toLocationId");
  } else if (eventType === "ISSUE_TO_WORKCELL") {
    ensureLocation(fromLocationId, "fromLocationId");
  } else if (eventType === "RETURN") {
    ensureLocation(fromLocationId, "fromLocationId");
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
  } else if (eventType === "ADJUST") {
    if (!fromLocationId && !toLocationId) {
      throw new InventoryError("fromLocationId or toLocationId is required");
    }
  }

  // Calculate balance deltas
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
      const current = await prisma.inventoryBalance.findUnique({
        where: {
          tenantId_itemId_locationId: {
            tenantId,
            itemId,
            locationId: toLocationId,
          },
        },
      });
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

  // Validate no negative balances (unless admin adjust)
  for (const [locationId, delta] of deltas.entries()) {
    const current = await prisma.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_locationId: {
          tenantId,
          itemId,
          locationId,
        },
      },
    });
    const nextQty = (current?.qtyBase || 0) + delta;
    if (nextQty < 0 && !isAdminAdjust) {
      throw new InventoryError("Negative balance prevented");
    }
  }

  // Execute in transaction
  await prisma.$transaction(async (tx) => {
    // Create the event
    await tx.inventoryEvent.create({
      data: {
        ...event,
        createdAt: new Date(),
      },
    });

    // Update balances
    for (const [locationId, delta] of deltas.entries()) {
      const current = await tx.inventoryBalance.findUnique({
        where: {
          tenantId_itemId_locationId: {
            tenantId,
            itemId,
            locationId,
          },
        },
      });

      const nextQty = (current?.qtyBase || 0) + delta;

      if (current) {
        await tx.inventoryBalance.update({
          where: {
            tenantId_itemId_locationId: {
              tenantId,
              itemId,
              locationId,
            },
          },
          data: {
            qtyBase: nextQty,
          },
        });
      } else {
        await tx.inventoryBalance.create({
          data: {
            tenantId,
            siteId,
            itemId,
            locationId,
            qtyBase: nextQty,
          },
        });
      }
    }
  });
}
