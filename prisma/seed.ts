import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Get seed credentials from environment
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create Tenant
  console.log("Creating tenant...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-warehouse" },
    update: {},
    create: {
      name: "Acme Warehouse",
      slug: "acme-warehouse",
      enabledModules: ["inventory", "cycle-counts", "jobs", "dashboards"],
    },
  });

  // Create Sites
  console.log("Creating sites...");
  const mainSite = await prisma.site.upsert({
    where: { id: "main-warehouse" },
    update: {},
    create: {
      id: "main-warehouse",
      tenantId: tenant.id,
      name: "Main Warehouse",
      address: "123 Industrial Pkwy, City, ST 12345",
    },
  });

  const distroSite = await prisma.site.upsert({
    where: { id: "distribution-center" },
    update: {},
    create: {
      id: "distribution-center",
      tenantId: tenant.id,
      name: "Distribution Center",
      address: "456 Commerce Dr, City, ST 12346",
    },
  });

  // Create Departments
  console.log("Creating departments...");
  const receiving = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      name: "Receiving",
    },
  });

  const production = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      name: "Production",
    },
  });

  const shipping = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      name: "Shipping",
    },
  });

  const warehouse = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      siteId: distroSite.id,
      name: "Warehouse",
    },
  });

  // Create Workcells
  console.log("Creating workcells...");
  await prisma.workcell.createMany({
    data: [
      {
        tenantId: tenant.id,
        siteId: mainSite.id,
        departmentId: receiving.id,
        name: "Receiving Dock",
        description: "Incoming material receiving",
      },
      {
        tenantId: tenant.id,
        siteId: mainSite.id,
        departmentId: production.id,
        name: "Pleater Line 1",
        description: "Filter pleating line 1",
      },
      {
        tenantId: tenant.id,
        siteId: mainSite.id,
        departmentId: production.id,
        name: "Pleater Line 2",
        description: "Filter pleating line 2",
      },
      {
        tenantId: tenant.id,
        siteId: mainSite.id,
        departmentId: production.id,
        name: "Assembly",
        description: "Final assembly station",
      },
      {
        tenantId: tenant.id,
        siteId: mainSite.id,
        departmentId: shipping.id,
        name: "Shipping Dock",
        description: "Outgoing shipments",
      },
      {
        tenantId: tenant.id,
        siteId: distroSite.id,
        departmentId: warehouse.id,
        name: "Picking",
        description: "Order picking area",
      },
    ],
  });

  // Create Devices
  console.log("Creating devices...");
  const workcells = await prisma.workcell.findMany({
    where: { tenantId: tenant.id },
  });

  for (const workcell of workcells.slice(0, 3)) {
    await prisma.device.create({
      data: {
        tenantId: tenant.id,
        siteId: workcell.siteId,
        workcellId: workcell.id,
        name: `${workcell.name} Scanner`,
        type: "BARCODE_SCANNER",
        serialNumber: `SN-${Math.random().toString(36).substring(7).toUpperCase()}`,
        status: "online",
      },
    });
  }

  // Create Admin User
  console.log("Creating admin user...");
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      password: passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "Admin",
      siteIds: [mainSite.id, distroSite.id],
      isActive: true,
    },
  });

  // Create Additional Users
  console.log("Creating additional users...");
  const supervisor = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "supervisor@acme.com",
      password: passwordHash,
      firstName: "Jane",
      lastName: "Supervisor",
      role: "Supervisor",
      siteIds: [mainSite.id],
      isActive: true,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        tenantId: tenant.id,
        email: "inventory@acme.com",
        password: passwordHash,
        firstName: "Bob",
        lastName: "Inventory",
        role: "Inventory",
        siteIds: [mainSite.id],
        isActive: true,
      },
      {
        tenantId: tenant.id,
        email: "operator@acme.com",
        password: passwordHash,
        firstName: "Alice",
        lastName: "Operator",
        role: "Operator",
        siteIds: [mainSite.id],
        isActive: true,
      },
      {
        tenantId: tenant.id,
        email: "viewer@acme.com",
        password: passwordHash,
        firstName: "Charlie",
        lastName: "Viewer",
        role: "Viewer",
        siteIds: [mainSite.id, distroSite.id],
        isActive: true,
      },
    ],
  });

  // Create Locations
  console.log("Creating locations...");
  const receivingDock = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      zone: "RECEIVING",
      label: "RECEIVING-01",
      type: "RECEIVING",
    },
  });

  const stockA1 = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      zone: "STOCK",
      bin: "A1",
      label: "STOCK-A1",
      type: "STOCK",
    },
  });

  const pleaterStage = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      zone: "PRODUCTION",
      label: "PLEATER-STAGE",
      type: "WIP",
    },
  });

  // Create Items
  console.log("Creating items...");
  const filterMedia = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: "PAPER-MEDIA-24",
      name: "Paper Media 24\"",
      description: "24 inch wide filter media for pleating",
      category: "PRODUCTION",
      baseUom: "FT",
      allowedUoms: [
        { uom: "FT", toBase: 1 },
        { uom: "YD", toBase: 3 },
        { uom: "ROLL", toBase: 100 },
      ],
      minQtyBase: 100,
      maxQtyBase: 1000,
      reorderPointBase: 200,
      leadTimeDays: 7,
    },
  });

  const caps = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: "CAPS-BLACK",
      name: "End Caps (Black)",
      description: "Black plastic end caps for filters",
      category: "PACKAGING",
      baseUom: "EA",
      allowedUoms: [
        { uom: "EA", toBase: 1 },
      ],
      minQtyBase: 50,
      maxQtyBase: 500,
      reorderPointBase: 100,
      leadTimeDays: 14,
    },
  });

  const coreStocks = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: "CORE-STOCK-12",
      name: "Core Material 12\"",
      description: "12 inch diameter core stock",
      category: "PRODUCTION",
      baseUom: "EA",
      allowedUoms: [
        { uom: "EA", toBase: 1 },
      ],
      minQtyBase: 20,
      maxQtyBase: 200,
      reorderPointBase: 40,
      leadTimeDays: 10,
    },
  });

  // Create Reason Codes
  console.log("Creating reason codes...");
  await prisma.reasonCode.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "SCRAP",
        code: "SCRAP-DAMAGE",
        description: "Material damaged during handling",
      },
      {
        tenantId: tenant.id,
        type: "SCRAP",
        code: "SCRAP-DEFECT",
        description: "Manufacturing defect",
      },
      {
        tenantId: tenant.id,
        type: "ADJUST",
        code: "ADJUST-AUDIT",
        description: "Physical count adjustment",
      },
      {
        tenantId: tenant.id,
        type: "ADJUST",
        code: "ADJUST-ERROR",
        description: "Correcting entry error",
      },
      {
        tenantId: tenant.id,
        type: "HOLD",
        code: "HOLD-QC",
        description: "Quality control hold",
      },
      {
        tenantId: tenant.id,
        type: "HOLD",
        code: "HOLD-CUSTOMER",
        description: "Customer hold",
      },
    ],
  });

  // Create sample inventory transactions
  console.log("Creating inventory events...");

  // Receive filter media
  await prisma.inventoryEvent.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      eventType: "RECEIVE",
      itemId: filterMedia.id,
      qtyEntered: 5,
      uomEntered: "ROLL",
      qtyBase: 500, // 5 rolls * 100 ft/roll
      toLocationId: receivingDock.id,
      createdByUserId: admin.id,
    },
  });

  // Create initial balance for filter media
  await prisma.inventoryBalance.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      itemId: filterMedia.id,
      locationId: receivingDock.id,
      qtyBase: 500,
    },
  });

  // Move to stock
  await prisma.inventoryEvent.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      eventType: "MOVE",
      itemId: filterMedia.id,
      qtyEntered: 400,
      uomEntered: "FT",
      qtyBase: 400,
      fromLocationId: receivingDock.id,
      toLocationId: stockA1.id,
      createdByUserId: admin.id,
    },
  });

  // Update balances
  await prisma.inventoryBalance.update({
    where: {
      tenantId_itemId_locationId: {
        tenantId: tenant.id,
        itemId: filterMedia.id,
        locationId: receivingDock.id,
      },
    },
    data: { qtyBase: 100 },
  });

  await prisma.inventoryBalance.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      itemId: filterMedia.id,
      locationId: stockA1.id,
      qtyBase: 400,
    },
  });

  // Receive caps
  await prisma.inventoryEvent.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      eventType: "RECEIVE",
      itemId: caps.id,
      qtyEntered: 200,
      uomEntered: "EA",
      qtyBase: 200,
      toLocationId: stockA1.id,
      createdByUserId: admin.id,
    },
  });

  await prisma.inventoryBalance.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      itemId: caps.id,
      locationId: stockA1.id,
      qtyBase: 200,
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`\n📧 Admin Login: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}\n`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
