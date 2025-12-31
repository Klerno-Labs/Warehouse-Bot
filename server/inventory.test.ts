import { describe, expect, it } from "vitest";
import { MemStorage } from "./storage";
import { applyInventoryEvent, convertQuantity, InventoryError } from "./inventory";

describe("inventory conversions", () => {
  it("converts YD to FT and ROLL to FT", async () => {
    const storage = new MemStorage();
    const admin = await storage.getUserByEmail("admin@example.com");
    expect(admin).toBeTruthy();
    const item = await storage.getItemBySku(admin!.tenantId, "PAPER-MEDIA");
    expect(item).toBeTruthy();

    const yd = await convertQuantity(storage, admin!.tenantId, item!.id, 2, "YD");
    expect(yd.qtyBase).toBe(6);

    const roll = await convertQuantity(storage, admin!.tenantId, item!.id, 1, "ROLL");
    expect(roll.qtyBase).toBe(100);
  });
});

describe("inventory event application", () => {
  it("updates balances for receive, issue, return", async () => {
    const storage = new MemStorage();
    const admin = await storage.getUserByEmail("admin@example.com");
    const session = await storage.getSessionUser(admin!.id);
    expect(session).toBeTruthy();

    const item = await storage.getItemBySku(admin!.tenantId, "PAPER-MEDIA");
    const locations = await storage.getLocationsBySite(admin!.siteIds[0]);
    const receiving = locations.find((l) => l.label === "RECEIVING-01");
    const stock = locations.find((l) => l.label === "STOCK-A1");
    const pleater = locations.find((l) => l.label === "PLEATER-STAGE");
    expect(item && receiving && stock && pleater).toBeTruthy();

    const receive = await convertQuantity(storage, admin!.tenantId, item!.id, 1, "ROLL");
    await applyInventoryEvent(storage, session!, {
      tenantId: admin!.tenantId,
      siteId: admin!.siteIds[0],
      eventType: "RECEIVE",
      itemId: item!.id,
      qtyEntered: 1,
      uomEntered: "ROLL",
      qtyBase: receive.qtyBase,
      fromLocationId: null,
      toLocationId: receiving!.id,
      workcellId: null,
      referenceId: null,
      reasonCodeId: null,
      notes: null,
      createdByUserId: admin!.id,
      deviceId: null,
    });

    await applyInventoryEvent(storage, session!, {
      tenantId: admin!.tenantId,
      siteId: admin!.siteIds[0],
      eventType: "MOVE",
      itemId: item!.id,
      qtyEntered: 100,
      uomEntered: "FT",
      qtyBase: 100,
      fromLocationId: receiving!.id,
      toLocationId: stock!.id,
      workcellId: null,
      referenceId: null,
      reasonCodeId: null,
      notes: null,
      createdByUserId: admin!.id,
      deviceId: null,
    });

    await applyInventoryEvent(storage, session!, {
      tenantId: admin!.tenantId,
      siteId: admin!.siteIds[0],
      eventType: "ISSUE_TO_WORKCELL",
      itemId: item!.id,
      qtyEntered: 50,
      uomEntered: "FT",
      qtyBase: 50,
      fromLocationId: stock!.id,
      toLocationId: pleater!.id,
      workcellId: null,
      referenceId: null,
      reasonCodeId: null,
      notes: null,
      createdByUserId: admin!.id,
      deviceId: null,
    });

    await applyInventoryEvent(storage, session!, {
      tenantId: admin!.tenantId,
      siteId: admin!.siteIds[0],
      eventType: "RETURN",
      itemId: item!.id,
      qtyEntered: 10,
      uomEntered: "FT",
      qtyBase: 10,
      fromLocationId: pleater!.id,
      toLocationId: stock!.id,
      workcellId: null,
      referenceId: null,
      reasonCodeId: null,
      notes: null,
      createdByUserId: admin!.id,
      deviceId: null,
    });

    const stockBalance = await storage.getInventoryBalance(
      admin!.tenantId,
      admin!.siteIds[0],
      item!.id,
      stock!.id,
    );
    expect(stockBalance?.qtyBase).toBe(60);
  });

  it("prevents negative balances for non-adjust", async () => {
    const storage = new MemStorage();
    const operator = (await storage.getUsersByTenant(
      (await storage.getUserByEmail("admin@example.com"))!.tenantId,
    )).find((u) => u.role === "Operator");
    const session = await storage.getSessionUser(operator!.id);
    const item = await storage.getItemBySku(operator!.tenantId, "CAPS");
    const locations = await storage.getLocationsBySite(operator!.siteIds[0]);
    const stock = locations.find((l) => l.label === "STOCK-A1");
    const receiving = locations.find((l) => l.label === "RECEIVING-01");

    await expect(
      applyInventoryEvent(storage, session!, {
        tenantId: operator!.tenantId,
        siteId: operator!.siteIds[0],
        eventType: "MOVE",
        itemId: item!.id,
        qtyEntered: 1,
        uomEntered: "EA",
        qtyBase: 1,
        fromLocationId: stock!.id,
        toLocationId: receiving!.id,
        workcellId: null,
        referenceId: null,
        reasonCodeId: null,
        notes: null,
        createdByUserId: operator!.id,
        deviceId: null,
      }),
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
