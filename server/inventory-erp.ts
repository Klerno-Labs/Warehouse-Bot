import { Prisma, PrismaClient, InventoryTxnType, AdjustDirection } from "@prisma/client";

export class InventoryTxnError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function convertQty(
  prisma: PrismaClient,
  itemId: string,
  qty: number,
  fromUomId: string,
  toUomId: string,
): Promise<number> {
  if (fromUomId === toUomId) return qty;
  const conversion = await prisma.itemUomConversion.findUnique({
    where: {
      itemId_fromUomId_toUomId: {
        itemId,
        fromUomId,
        toUomId,
      },
    },
  });
  if (!conversion) {
    throw new InventoryTxnError("Missing unit conversion");
  }
  return qty * Number(conversion.factor);
}

type CreateTxnInput = {
  type: InventoryTxnType;
  itemId: string;
  qty: number;
  uomId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId: string;
  direction?: AdjustDirection | null;
};

export async function applyInventoryTxn(
  prisma: PrismaClient,
  input: CreateTxnInput,
) {
  const item = await prisma.item.findUnique({
    where: { id: input.itemId },
  });
  if (!item) throw new InventoryTxnError("Item not found", 404);

  const baseQty = await convertQty(prisma, input.itemId, input.qty, input.uomId, item.baseUomId);

  if (input.type === "RECEIVE" && !input.toLocationId) {
    throw new InventoryTxnError("toLocationId is required");
  }
  if (input.type === "MOVE" && (!input.fromLocationId || !input.toLocationId)) {
    throw new InventoryTxnError("fromLocationId and toLocationId are required");
  }
  if (input.type === "ISSUE" && !input.fromLocationId) {
    throw new InventoryTxnError("fromLocationId is required");
  }
  if (input.type === "COUNT" && !input.toLocationId) {
    throw new InventoryTxnError("toLocationId is required");
  }
  if (input.type === "ADJUST" && !input.direction) {
    throw new InventoryTxnError("direction is required for ADJUST");
  }

  return prisma.$transaction(async (tx) => {
    const applyBalance = async (locationId: string, delta: number) => {
      const existing = await tx.stockBalance.findUnique({
        where: {
          itemId_locationId: {
            itemId: input.itemId,
            locationId,
          },
        },
      });
      const nextQty = (existing?.qtyBase || new Prisma.Decimal(0)).plus(delta);
      if (nextQty.lessThan(0) && ["ISSUE", "MOVE"].includes(input.type)) {
        throw new InventoryTxnError("Insufficient stock");
      }
      if (existing) {
        await tx.stockBalance.update({
          where: { id: existing.id },
          data: { qtyBase: nextQty },
        });
      } else {
        await tx.stockBalance.create({
          data: {
            itemId: input.itemId,
            locationId,
            qtyBase: nextQty,
          },
        });
      }
    };

    let countedQtyBase: Prisma.Decimal | null = null;
    let deltaBase: Prisma.Decimal | null = null;

    if (input.type === "RECEIVE") {
      await applyBalance(input.toLocationId!, baseQty);
    } else if (input.type === "MOVE") {
      await applyBalance(input.fromLocationId!, -baseQty);
      await applyBalance(input.toLocationId!, baseQty);
    } else if (input.type === "ISSUE") {
      await applyBalance(input.fromLocationId!, -baseQty);
    } else if (input.type === "ADJUST") {
      const signed = input.direction === "ADD" ? baseQty : -baseQty;
      const locationId = input.toLocationId || input.fromLocationId;
      if (!locationId) throw new InventoryTxnError("Location required for ADJUST");
      await applyBalance(locationId, signed);
    } else if (input.type === "COUNT") {
      const locationId = input.toLocationId!;
      const existing = await tx.stockBalance.findUnique({
        where: {
          itemId_locationId: {
            itemId: input.itemId,
            locationId,
          },
        },
      });
      countedQtyBase = new Prisma.Decimal(baseQty);
      const currentQty = existing?.qtyBase || new Prisma.Decimal(0);
      deltaBase = countedQtyBase.minus(currentQty);
      await applyBalance(locationId, deltaBase.toNumber());
    }

    return tx.inventoryTxn.create({
      data: {
        type: input.type,
        itemId: input.itemId,
        qty: new Prisma.Decimal(input.qty),
        uomId: input.uomId,
        fromLocationId: input.fromLocationId || null,
        toLocationId: input.toLocationId || null,
        note: input.note || null,
        referenceType: input.referenceType || null,
        referenceId: input.referenceId || null,
        direction: input.direction || null,
        countedQtyBase,
        deltaBase,
        createdByUserId: input.createdByUserId,
      },
    });
  });
}
