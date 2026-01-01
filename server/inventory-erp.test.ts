import { describe, expect, it } from "vitest";
import { AdjustDirection, InventoryTxnType, Prisma } from "@prisma/client";
import { applyInventoryTxn, convertQty, InventoryTxnError } from "./inventory-erp";

type ItemRow = {
  id: string;
  baseUomId: string;
};

type ConversionRow = {
  itemId: string;
  fromUomId: string;
  toUomId: string;
  factor: number;
};

type BalanceRow = {
  id: string;
  itemId: string;
  locationId: string;
  qtyBase: Prisma.Decimal;
};

class FakePrisma {
  items = new Map<string, ItemRow>();
  conversions: ConversionRow[] = [];
  balances: BalanceRow[] = [];
  txns: Array<Record<string, unknown>> = [];

  item = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.items.get(where.id) || null;
    },
  };

  itemUomConversion = {
    findUnique: async ({
      where,
    }: {
      where: { itemId_fromUomId_toUomId: { itemId: string; fromUomId: string; toUomId: string } };
    }) => {
      const key = where.itemId_fromUomId_toUomId;
      return this.conversions.find(
        (row) =>
          row.itemId === key.itemId &&
          row.fromUomId === key.fromUomId &&
          row.toUomId === key.toUomId,
      ) || null;
    },
  };

  stockBalance = {
    findUnique: async ({
      where,
    }: {
      where: { itemId_locationId: { itemId: string; locationId: string } };
    }) => {
      const key = where.itemId_locationId;
      return this.balances.find(
        (row) => row.itemId === key.itemId && row.locationId === key.locationId,
      ) || null;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { qtyBase: Prisma.Decimal };
    }) => {
      const index = this.balances.findIndex((row) => row.id === where.id);
      if (index >= 0) {
        this.balances[index] = { ...this.balances[index], qtyBase: data.qtyBase };
        return this.balances[index];
      }
      return null;
    },
    create: async ({
      data,
    }: {
      data: { itemId: string; locationId: string; qtyBase: Prisma.Decimal };
    }) => {
      const row = {
        id: `bal_${this.balances.length + 1}`,
        itemId: data.itemId,
        locationId: data.locationId,
        qtyBase: data.qtyBase,
      };
      this.balances.push(row);
      return row;
    },
  };

  inventoryTxn = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `txn_${this.txns.length + 1}`, ...data };
      this.txns.push(row);
      return row;
    },
  };

  $transaction = async (fn: (client: this) => Promise<unknown>) => fn(this);
}

describe("unit conversions", () => {
  it("converts YD and ROLL into FT base", async () => {
    const prisma = new FakePrisma() as any;
    prisma.items.set("item_roll", { id: "item_roll", baseUomId: "uom_ft" });
    prisma.conversions.push(
      { itemId: "item_roll", fromUomId: "uom_yd", toUomId: "uom_ft", factor: 3 },
      { itemId: "item_roll", fromUomId: "uom_roll", toUomId: "uom_ft", factor: 100 },
    );

    const yd = await convertQty(prisma, "item_roll", 2, "uom_yd", "uom_ft");
    expect(yd).toBe(6);

    const roll = await convertQty(prisma, "item_roll", 1, "uom_roll", "uom_ft");
    expect(roll).toBe(100);
  });
});

describe("transaction application", () => {
  it("updates balances for receive, move, issue", async () => {
    const prisma = new FakePrisma() as any;
    prisma.items.set("item_roll", { id: "item_roll", baseUomId: "uom_ft" });
    prisma.conversions.push({ itemId: "item_roll", fromUomId: "uom_roll", toUomId: "uom_ft", factor: 100 });

    await applyInventoryTxn(prisma, {
      type: InventoryTxnType.RECEIVE,
      itemId: "item_roll",
      qty: 1,
      uomId: "uom_roll",
      toLocationId: "loc_receiving",
      createdByUserId: "user_admin",
    });

    await applyInventoryTxn(prisma, {
      type: InventoryTxnType.MOVE,
      itemId: "item_roll",
      qty: 100,
      uomId: "uom_ft",
      fromLocationId: "loc_receiving",
      toLocationId: "loc_stock",
      createdByUserId: "user_admin",
    });

    await applyInventoryTxn(prisma, {
      type: InventoryTxnType.ISSUE,
      itemId: "item_roll",
      qty: 50,
      uomId: "uom_ft",
      fromLocationId: "loc_stock",
      createdByUserId: "user_admin",
    });

    const stockBalance = await prisma.stockBalance.findUnique({
      where: { itemId_locationId: { itemId: "item_roll", locationId: "loc_stock" } },
    });
    expect(stockBalance?.qtyBase.toNumber()).toBe(50);
  });

  it("prevents negative balances on non-adjust", async () => {
    const prisma = new FakePrisma() as any;
    prisma.items.set("item_caps", { id: "item_caps", baseUomId: "uom_ea" });

    await expect(
      applyInventoryTxn(prisma, {
        type: InventoryTxnType.ISSUE,
        itemId: "item_caps",
        qty: 1,
        uomId: "uom_ea",
        fromLocationId: "loc_stock",
        createdByUserId: "user_operator",
      }),
    ).rejects.toBeInstanceOf(InventoryTxnError);
  });

  it("allows adjust to subtract", async () => {
    const prisma = new FakePrisma() as any;
    prisma.items.set("item_caps", { id: "item_caps", baseUomId: "uom_ea" });

    await applyInventoryTxn(prisma, {
      type: InventoryTxnType.ADJUST,
      itemId: "item_caps",
      qty: 2,
      uomId: "uom_ea",
      toLocationId: "loc_stock",
      direction: AdjustDirection.SUBTRACT,
      createdByUserId: "user_admin",
    });

    const stockBalance = await prisma.stockBalance.findUnique({
      where: { itemId_locationId: { itemId: "item_caps", locationId: "loc_stock" } },
    });
    expect(stockBalance?.qtyBase.toNumber()).toBe(-2);
  });
});
