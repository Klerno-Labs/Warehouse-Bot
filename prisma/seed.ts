import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data (in reverse order of dependencies)
  console.log("Cleaning up existing data...");
  await prisma.shipmentLine.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.pickTaskLine.deleteMany({});
  await prisma.pickTask.deleteMany({});
  await prisma.salesOrderLine.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.inventoryBalance.deleteMany({});
  await prisma.inventoryEvent.deleteMany({});
  await prisma.cycleCountLine.deleteMany({});
  await prisma.cycleCount.deleteMany({});
  await prisma.componentScan.deleteMany({});
  await prisma.operationScanEvent.deleteMany({});
  await prisma.jobOperation.deleteMany({});
  await prisma.jobLine.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.productionOutput.deleteMany({});
  await prisma.productionConsumption.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.bOMComponent.deleteMany({});
  await prisma.billOfMaterial.deleteMany({});
  await prisma.receiptLine.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.purchaseOrderLine.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.reasonCode.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.workcell.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.auditEvent.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.tenant.deleteMany({});
  console.log("Cleanup complete.");

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
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@acme.com" },
    update: {},
    create: {
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

  // Upsert additional users one by one
  await prisma.user.upsert({
    where: { email: "inventory@acme.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "inventory@acme.com",
      password: passwordHash,
      firstName: "Bob",
      lastName: "Inventory",
      role: "Inventory",
      siteIds: [mainSite.id],
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "operator@acme.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "operator@acme.com",
      password: passwordHash,
      firstName: "Alice",
      lastName: "Operator",
      role: "Operator",
      siteIds: [mainSite.id],
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@acme.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "viewer@acme.com",
      password: passwordHash,
      firstName: "Charlie",
      lastName: "Viewer",
      role: "Viewer",
      siteIds: [mainSite.id, distroSite.id],
      isActive: true,
    },
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

  // =========================================================================
  // SALES MODULE - Customers, Orders, Shipments
  // =========================================================================

  console.log("Creating customers...");
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-001",
      name: "Acme Manufacturing",
      email: "john.smith@acme-mfg.com",
      phone: "555-123-4567",
      billingAddress1: "100 Industrial Way",
      billingCity: "Chicago",
      billingState: "IL",
      billingZip: "60601",
      billingCountry: "USA",
      shippingAddress1: "100 Industrial Way",
      shippingCity: "Chicago",
      shippingState: "IL",
      shippingZip: "60601",
      shippingCountry: "USA",
      paymentTerms: "Net 30",
      creditLimit: 50000,
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-002",
      name: "Global Filters Inc",
      email: "sjohnson@globalfilters.com",
      phone: "555-234-5678",
      billingAddress1: "500 Commerce Blvd",
      billingCity: "Detroit",
      billingState: "MI",
      billingZip: "48201",
      billingCountry: "USA",
      shippingAddress1: "502 Commerce Blvd, Dock B",
      shippingCity: "Detroit",
      shippingState: "MI",
      shippingZip: "48201",
      shippingCountry: "USA",
      paymentTerms: "Net 45",
      creditLimit: 75000,
      isActive: true,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-003",
      name: "TechCorp Solutions",
      email: "mchen@techcorp.io",
      phone: "555-345-6789",
      billingAddress1: "2000 Tech Park Drive",
      billingCity: "Austin",
      billingState: "TX",
      billingZip: "78701",
      billingCountry: "USA",
      paymentTerms: "Net 15",
      creditLimit: 25000,
      isActive: true,
    },
  });

  console.log("Creating sales orders...");
  // Order 1 - Shipped order
  const order1 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer1.id,
      orderNumber: "SO-2026-0001",
      status: "SHIPPED",
      orderDate: new Date("2026-01-02"),
      requestedDate: new Date("2026-01-10"),
      subtotal: 1500,
      taxAmount: 112.50,
      shippingAmount: 75,
      total: 1687.50,
      shipToAddress1: "100 Industrial Way",
      shipToCity: "Chicago",
      shipToState: "IL",
      shipToZip: "60601",
      shipToCountry: "USA",
      notes: "Rush order - priority shipping",
      createdByUserId: admin.id,
      approvedByUserId: supervisor.id,
      approvedAt: new Date("2026-01-02"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: filterMedia.id,
            description: "Paper Media 24\" - Premium Grade",
            qtyOrdered: 100,
            qtyAllocated: 100,
            qtyPicked: 100,
            qtyShipped: 100,
            uom: "FT",
            unitPrice: 10,
            lineTotal: 1000,
            status: "SHIPPED",
          },
          {
            lineNumber: 2,
            itemId: caps.id,
            description: "End Caps (Black)",
            qtyOrdered: 50,
            qtyAllocated: 50,
            qtyPicked: 50,
            qtyShipped: 50,
            uom: "EA",
            unitPrice: 10,
            lineTotal: 500,
            status: "SHIPPED",
          },
        ],
      },
    },
  });

  // Order 2 - Confirmed order, needs picking
  const order2 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer2.id,
      orderNumber: "SO-2026-0002",
      status: "ALLOCATED",
      orderDate: new Date("2026-01-03"),
      requestedDate: new Date("2026-01-15"),
      subtotal: 2500,
      taxAmount: 187.50,
      shippingAmount: 100,
      total: 2787.50,
      shipToAddress1: "502 Commerce Blvd, Dock B",
      shipToCity: "Detroit",
      shipToState: "MI",
      shipToZip: "48201",
      shipToCountry: "USA",
      createdByUserId: admin.id,
      approvedByUserId: admin.id,
      approvedAt: new Date("2026-01-03"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: filterMedia.id,
            description: "Paper Media 24\"",
            qtyOrdered: 200,
            qtyAllocated: 200,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "FT",
            unitPrice: 10,
            lineTotal: 2000,
            status: "ALLOCATED",
          },
          {
            lineNumber: 2,
            itemId: caps.id,
            description: "End Caps (Black)",
            qtyOrdered: 50,
            qtyAllocated: 50,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 10,
            lineTotal: 500,
            status: "ALLOCATED",
          },
        ],
      },
    },
  });

  // Order 3 - Draft order
  const order3 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer3.id,
      orderNumber: "SO-2026-0003",
      status: "DRAFT",
      orderDate: new Date("2026-01-04"),
      requestedDate: new Date("2026-01-20"),
      subtotal: 500,
      taxAmount: 37.50,
      shippingAmount: 50,
      total: 587.50,
      shipToAddress1: "2000 Tech Park Drive",
      shipToCity: "Austin",
      shipToState: "TX",
      shipToZip: "78701",
      shipToCountry: "USA",
      createdByUserId: admin.id,
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: caps.id,
            description: "End Caps (Black)",
            qtyOrdered: 50,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 10,
            lineTotal: 500,
            status: "OPEN",
          },
        ],
      },
    },
  });

  console.log("Creating shipment for shipped order...");
  // First get the sales order lines for the shipped order
  const order1Lines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: order1.id },
    orderBy: { lineNumber: "asc" },
  });
  
  const shipment1 = await prisma.shipment.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      salesOrderId: order1.id,
      customerId: customer1.id,
      shipmentNumber: "SH-2026-0001",
      status: "SHIPPED",
      carrier: "FedEx",
      trackingNumber: "794644790047",
      shipDate: new Date("2026-01-08"),
      shipToAddress1: "100 Industrial Way",
      shipToCity: "Chicago",
      shipToState: "IL",
      shipToZip: "60601",
      shipToCountry: "USA",
      notes: "Shipped via FedEx Ground",
      shippedByUserId: admin.id,
      lines: {
        create: [
          {
            salesOrderLineId: order1Lines[0].id,
            itemId: filterMedia.id,
            qtyShipped: 100,
            uom: "FT",
          },
          {
            salesOrderLineId: order1Lines[1].id,
            itemId: caps.id,
            qtyShipped: 50,
            uom: "EA",
          },
        ],
      },
      packages: {
        create: [
          {
            packageNumber: 1,
            weight: 25.5,
            trackingNumber: "794644790047-1",
          },
        ],
      },
    },
  });

  console.log("Creating pick task for allocated order...");
  // Get order 2 lines
  const order2Lines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: order2.id },
    orderBy: { lineNumber: "asc" },
  });
  
  const pickTask1 = await prisma.pickTask.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      salesOrderId: order2.id,
      taskNumber: "PICK-2026-0001",
      status: "PENDING",
      priority: 1,
      lines: {
        create: [
          {
            salesOrderLineId: order2Lines[0].id,
            itemId: filterMedia.id,
            qtyToPick: 200,
            qtyPicked: 0,
            uom: "FT",
            locationId: stockA1.id,
            status: "PENDING",
          },
          {
            salesOrderLineId: order2Lines[1].id,
            itemId: caps.id,
            qtyToPick: 50,
            qtyPicked: 0,
            uom: "EA",
            locationId: stockA1.id,
            status: "PENDING",
          },
        ],
      },
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
