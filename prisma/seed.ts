import { PrismaClient, InventoryTxnType, AdjustDirection, UomKind, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { applyInventoryTxn } from "../server/inventory-erp";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, role: Role.ADMIN },
  });

  const uoms = [
    { code: "ea", name: "Each", kind: UomKind.COUNT },
    { code: "ft", name: "Feet", kind: UomKind.LENGTH },
    { code: "yd", name: "Yard", kind: UomKind.LENGTH },
    { code: "roll", name: "Roll", kind: UomKind.LENGTH },
    { code: "box", name: "Box", kind: UomKind.COUNT },
    { code: "case", name: "Case", kind: UomKind.COUNT },
    { code: "pallet", name: "Pallet", kind: UomKind.COUNT },
    { code: "gal", name: "Gallon", kind: UomKind.VOLUME },
  ];

  for (const uom of uoms) {
    await prisma.uom.upsert({
      where: { code: uom.code },
      update: {},
      create: uom,
    });
  }

  const [ftUom, rollUom, eaUom] = await Promise.all([
    prisma.uom.findUniqueOrThrow({ where: { code: "ft" } }),
    prisma.uom.findUniqueOrThrow({ where: { code: "roll" } }),
    prisma.uom.findUniqueOrThrow({ where: { code: "ea" } }),
  ]);

  const receiving = await prisma.location.upsert({
    where: { code: "RECEIVING-01" },
    update: {},
    create: { code: "RECEIVING-01", name: "Receiving Dock" },
  });

  const stock = await prisma.location.upsert({
    where: { code: "STOCK-A1" },
    update: {},
    create: { code: "STOCK-A1", name: "Stock A1" },
  });

  const pleater = await prisma.location.upsert({
    where: { code: "PLEATER-STAGE" },
    update: {},
    create: { code: "PLEATER-STAGE", name: "Pleater Stage" },
  });

  const filterRoll = await prisma.item.upsert({
    where: { publicCode: "filter-roll" },
    update: {},
    create: {
      publicCode: "filter-roll",
      sku: "FILTER-ROLL",
      name: "Filter Media Roll",
      description: "Roll stock used in pleater",
      baseUomId: ftUom.id,
      defaultLocationId: stock.id,
      specs: { width: "24in", material: "Synthetic" },
    },
  });

  const caps = await prisma.item.upsert({
    where: { publicCode: "caps" },
    update: {},
    create: {
      publicCode: "caps",
      sku: "CAPS",
      name: "Caps",
      description: "End caps",
      baseUomId: eaUom.id,
      defaultLocationId: stock.id,
      specs: { color: "black" },
    },
  });

  await prisma.itemUomConversion.upsert({
    where: {
      itemId_fromUomId_toUomId: {
        itemId: filterRoll.id,
        fromUomId: rollUom.id,
        toUomId: ftUom.id,
      },
    },
    update: {},
    create: {
      itemId: filterRoll.id,
      fromUomId: rollUom.id,
      toUomId: ftUom.id,
      factor: 100,
    },
  });

  await applyInventoryTxn(prisma, {
    type: InventoryTxnType.RECEIVE,
    itemId: filterRoll.id,
    qty: 1,
    uomId: rollUom.id,
    toLocationId: receiving.id,
    createdByUserId: admin.id,
  });

  await applyInventoryTxn(prisma, {
    type: InventoryTxnType.MOVE,
    itemId: filterRoll.id,
    qty: 100,
    uomId: ftUom.id,
    fromLocationId: receiving.id,
    toLocationId: stock.id,
    createdByUserId: admin.id,
  });

  await applyInventoryTxn(prisma, {
    type: InventoryTxnType.ISSUE,
    itemId: filterRoll.id,
    qty: 50,
    uomId: ftUom.id,
    fromLocationId: stock.id,
    toLocationId: pleater.id,
    createdByUserId: admin.id,
  });

  await applyInventoryTxn(prisma, {
    type: InventoryTxnType.ADJUST,
    itemId: caps.id,
    qty: 10,
    uomId: eaUom.id,
    toLocationId: stock.id,
    direction: AdjustDirection.ADD,
    createdByUserId: admin.id,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
