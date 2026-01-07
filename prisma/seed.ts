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
  const inventory = await prisma.user.upsert({
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

  const operator = await prisma.user.upsert({
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

  const viewer = await prisma.user.upsert({
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

  // Create Items - NOW WITH COMPREHENSIVE INVENTORY DATA
  console.log("Creating items (50+ items)...");
  
  // Raw Materials (using PRODUCTION category for production materials)
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
      costBase: 2.50,
      avgCostBase: 2.45,
      lastCostBase: 2.55,
      minQtyBase: 100,
      maxQtyBase: 10000,
      reorderPointBase: 500,
      leadTimeDays: 7,
      barcode: "7890123456001",
      barcodeType: "EAN-13",
    },
  });

  const caps = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: "CAPS-BLACK",
      name: "End Caps (Black)",
      description: "Black plastic end caps for filters",
      category: "PRODUCTION",
      baseUom: "EA",
      allowedUoms: [{ uom: "EA", toBase: 1 }],
      costBase: 0.75,
      avgCostBase: 0.72,
      lastCostBase: 0.78,
      minQtyBase: 100,
      maxQtyBase: 5000,
      reorderPointBase: 500,
      leadTimeDays: 14,
      barcode: "7890123456002",
      barcodeType: "EAN-13",
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
      allowedUoms: [{ uom: "EA", toBase: 1 }],
      costBase: 4.25,
      avgCostBase: 4.20,
      lastCostBase: 4.35,
      minQtyBase: 50,
      maxQtyBase: 1000,
      reorderPointBase: 100,
      leadTimeDays: 10,
      barcode: "7890123456003",
      barcodeType: "EAN-13",
    },
  });

  // Create additional items programmatically for scale
  const additionalItems = [];
  
  // More Raw Materials
  const rawMaterials = [
    { sku: "PAPER-MEDIA-18", name: "Paper Media 18\"", cost: 2.00, reorder: 400 },
    { sku: "PAPER-MEDIA-36", name: "Paper Media 36\"", cost: 3.75, reorder: 300 },
    { sku: "ADHESIVE-SPRAY", name: "Adhesive Spray", cost: 12.50, reorder: 50 },
    { sku: "WIRE-MESH-24", name: "Wire Mesh 24\"", cost: 8.25, reorder: 200 },
    { sku: "WIRE-MESH-18", name: "Wire Mesh 18\"", cost: 6.75, reorder: 200 },
    { sku: "FRAME-CARDBOARD-24", name: "Cardboard Frame 24\"", cost: 1.50, reorder: 500 },
    { sku: "FRAME-CARDBOARD-18", name: "Cardboard Frame 18\"", cost: 1.25, reorder: 500 },
    { sku: "SEALANT-URETHANE", name: "Urethane Sealant", cost: 15.00, reorder: 25 },
    { sku: "CAPS-WHITE", name: "End Caps (White)", cost: 0.80, reorder: 500 },
    { sku: "CORE-STOCK-10", name: "Core Material 10\"", cost: 3.50, reorder: 100 },
  ];

  for (const rm of rawMaterials) {
    additionalItems.push(await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: rm.sku,
        name: rm.name,
        description: `${rm.name} for filter manufacturing`,
        category: "PRODUCTION",
        baseUom: "EA",
        allowedUoms: [{ uom: "EA", toBase: 1 }],
        costBase: rm.cost,
        avgCostBase: rm.cost * 0.98,
        lastCostBase: rm.cost * 1.02,
        reorderPointBase: rm.reorder,
        leadTimeDays: Math.floor(Math.random() * 14) + 7,
      },
    }));
  }

  // Finished Goods
  const finishedGoods = [
    { sku: "FILTER-HVAC-24x24x2", name: "HVAC Filter 24x24x2", cost: 18.50, price: 32.00 },
    { sku: "FILTER-HVAC-20x20x2", name: "HVAC Filter 20x20x2", cost: 15.00, price: 26.00 },
    { sku: "FILTER-HVAC-16x20x2", name: "HVAC Filter 16x20x2", cost: 12.50, price: 22.00 },
    { sku: "FILTER-HVAC-18x24x2", name: "HVAC Filter 18x24x2", cost: 16.00, price: 28.00 },
    { sku: "FILTER-IND-24x24x4", name: "Industrial Filter 24x24x4", cost: 45.00, price: 78.00 },
    { sku: "FILTER-IND-20x20x4", name: "Industrial Filter 20x20x4", cost: 38.00, price: 65.00 },
    { sku: "FILTER-HEPA-24x24x6", name: "HEPA Filter 24x24x6", cost: 125.00, price: 220.00 },
    { sku: "FILTER-HEPA-18x24x6", name: "HEPA Filter 18x24x6", cost: 105.00, price: 185.00 },
    { sku: "FILTER-PLEATED-20x25x1", name: "Pleated Filter 20x25x1", cost: 8.50, price: 15.00 },
    { sku: "FILTER-PLEATED-16x25x1", name: "Pleated Filter 16x25x1", cost: 7.50, price: 13.00 },
    { sku: "FILTER-PLEATED-14x20x1", name: "Pleated Filter 14x20x1", cost: 6.00, price: 11.00 },
    { sku: "FILTER-CARBON-24x24x2", name: "Carbon Filter 24x24x2", cost: 65.00, price: 115.00 },
    { sku: "FILTER-CARBON-20x20x2", name: "Carbon Filter 20x20x2", cost: 55.00, price: 98.00 },
    { sku: "PREFILTER-24x24x1", name: "Pre-Filter 24x24x1", cost: 4.50, price: 8.50 },
    { sku: "PREFILTER-20x20x1", name: "Pre-Filter 20x20x1", cost: 3.75, price: 7.00 },
  ];

  const finishedItems = [];
  for (const fg of finishedGoods) {
    finishedItems.push(await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: fg.sku,
        name: fg.name,
        description: `High-quality ${fg.name}`,
        category: "PRODUCTION",
        baseUom: "EA",
        allowedUoms: [
          { uom: "EA", toBase: 1 },
          { uom: "CASE", toBase: 12 },
        ],
        costBase: fg.cost,
        avgCostBase: fg.cost * 0.97,
        lastCostBase: fg.cost * 1.01,
        reorderPointBase: 50,
        leadTimeDays: 3,
      },
    }));
  }

  // Packaging & Supplies
  const packaging = [
    { sku: "BOX-SMALL", name: "Shipping Box Small", cost: 2.50 },
    { sku: "BOX-MEDIUM", name: "Shipping Box Medium", cost: 4.00 },
    { sku: "BOX-LARGE", name: "Shipping Box Large", cost: 6.50 },
    { sku: "PALLET-WRAP", name: "Pallet Wrap Roll", cost: 35.00 },
    { sku: "TAPE-PACKING", name: "Packing Tape Roll", cost: 4.50 },
    { sku: "LABEL-SHIPPING", name: "Shipping Labels (100)", cost: 12.00 },
    { sku: "BUBBLE-WRAP", name: "Bubble Wrap Roll", cost: 28.00 },
    { sku: "PACKING-PEANUTS", name: "Packing Peanuts Bag", cost: 18.00 },
  ];

  for (const pkg of packaging) {
    additionalItems.push(await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: pkg.sku,
        name: pkg.name,
        description: `${pkg.name} for shipping`,
        category: "PACKAGING",
        baseUom: "EA",
        allowedUoms: [{ uom: "EA", toBase: 1 }],
        costBase: pkg.cost,
        avgCostBase: pkg.cost,
        lastCostBase: pkg.cost,
        reorderPointBase: 25,
        leadTimeDays: 5,
      },
    }));
  }

  // MRO Items (Chemical/MRO)
  const mroItems = [
    { sku: "GLOVES-NITRILE-L", name: "Nitrile Gloves Large (Box)", cost: 15.00 },
    { sku: "GLOVES-NITRILE-M", name: "Nitrile Gloves Medium (Box)", cost: 15.00 },
    { sku: "SAFETY-GLASSES", name: "Safety Glasses", cost: 8.50 },
    { sku: "EARPLUGS-BOX", name: "Ear Plugs (Box 200)", cost: 22.00 },
    { sku: "CLEANING-SOLVENT", name: "Cleaning Solvent Gallon", cost: 45.00 },
    { sku: "BLADE-CUTTING", name: "Cutting Blade", cost: 12.50 },
    { sku: "OIL-MACHINE", name: "Machine Oil Quart", cost: 18.00 },
  ];

  for (const mro of mroItems) {
    additionalItems.push(await prisma.item.create({
      data: {
        tenantId: tenant.id,
        sku: mro.sku,
        name: mro.name,
        description: `MRO: ${mro.name}`,
        category: "CHEMICAL_MRO",
        baseUom: "EA",
        allowedUoms: [{ uom: "EA", toBase: 1 }],
        costBase: mro.cost,
        avgCostBase: mro.cost,
        lastCostBase: mro.cost,
        reorderPointBase: 10,
        leadTimeDays: 7,
      },
    }));
  }

  const allItems = [filterMedia, caps, coreStocks, ...additionalItems, ...finishedItems];
  console.log(`Created ${allItems.length} items total`);

  // =========================================================================
  // SUPPLIERS & PURCHASING MODULE
  // =========================================================================
  console.log("Creating suppliers...");
  
  const supplier1 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-001",
      name: "Industrial Papers Co",
      contactName: "Bob Wilson",
      email: "orders@indpapers.com",
      phone: "800-555-1001",
      address: "1000 Paper Mill Road",
      city: "Green Bay",
      state: "WI",
      zipCode: "54301",
      country: "USA",
      paymentTerms: "Net 30",
      leadTimeDays: 7,
      isActive: true,
      notes: "Primary paper/media supplier",
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-002",
      name: "Plastic Components Inc",
      contactName: "Susan Miller",
      email: "sales@plasticcomp.com",
      phone: "800-555-2002",
      address: "500 Polymer Drive",
      city: "Toledo",
      state: "OH",
      zipCode: "43601",
      country: "USA",
      paymentTerms: "Net 45",
      leadTimeDays: 14,
      isActive: true,
      notes: "Caps and plastic components",
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-003",
      name: "Metal Works LLC",
      contactName: "Mike Johnson",
      email: "purchasing@metalworks.net",
      phone: "800-555-3003",
      address: "250 Steel Avenue",
      city: "Pittsburgh",
      state: "PA",
      zipCode: "15201",
      country: "USA",
      paymentTerms: "Net 30",
      leadTimeDays: 10,
      isActive: true,
      notes: "Wire mesh and metal components",
    },
  });

  const supplier4 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-004",
      name: "PackRight Solutions",
      contactName: "Lisa Brown",
      email: "orders@packright.com",
      phone: "800-555-4004",
      address: "800 Packaging Lane",
      city: "Memphis",
      state: "TN",
      zipCode: "38101",
      country: "USA",
      paymentTerms: "Net 15",
      leadTimeDays: 5,
      isActive: true,
      notes: "Boxes, tape, packaging supplies",
    },
  });

  const supplier5 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-005",
      name: "Safety First Supply",
      contactName: "Tom Davis",
      email: "sales@safetyfirst.com",
      phone: "800-555-5005",
      address: "1200 Safety Boulevard",
      city: "Columbus",
      state: "OH",
      zipCode: "43201",
      country: "USA",
      paymentTerms: "Net 30",
      leadTimeDays: 7,
      isActive: true,
      notes: "MRO and safety supplies",
    },
  });

  console.log("Creating purchase orders...");
  
  // PO 1 - Received
  const po1 = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      supplierId: supplier1.id,
      poNumber: "PO-2026-0001",
      status: "RECEIVED",
      orderDate: new Date("2025-12-20"),
      expectedDelivery: new Date("2025-12-28"),
      subtotal: 2500,
      tax: 0,
      shipping: 150,
      total: 2650,
      notes: "Q1 media stock replenishment",
      createdByUserId: admin.id,
      approvedByUserId: supervisor.id,
      approvedAt: new Date("2025-12-20"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: filterMedia.id,
            description: "Paper Media 24\" - 10 rolls",
            qtyOrdered: 10,
            qtyReceived: 10,
            uom: "ROLL",
            unitPrice: 250,
            lineTotal: 2500,
            status: "RECEIVED",
          },
        ],
      },
    },
  });

  // PO 2 - Partially Received
  const po2 = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      supplierId: supplier2.id,
      poNumber: "PO-2026-0002",
      status: "PARTIALLY_RECEIVED",
      orderDate: new Date("2025-12-22"),
      expectedDelivery: new Date("2026-01-05"),
      subtotal: 1500,
      tax: 0,
      shipping: 75,
      total: 1575,
      notes: "End caps reorder",
      createdByUserId: admin.id,
      approvedByUserId: admin.id,
      approvedAt: new Date("2025-12-22"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: caps.id,
            description: "End Caps (Black) - 1000 units",
            qtyOrdered: 1000,
            qtyReceived: 500,
            uom: "EA",
            unitPrice: 0.75,
            lineTotal: 750,
            status: "PARTIALLY_RECEIVED",
          },
          {
            lineNumber: 2,
            itemId: coreStocks.id,
            description: "Core Material 12\" - 200 units",
            qtyOrdered: 200,
            qtyReceived: 200,
            uom: "EA",
            unitPrice: 3.75,
            lineTotal: 750,
            status: "RECEIVED",
          },
        ],
      },
    },
  });

  // PO 3 - Approved, awaiting shipment
  const po3 = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      supplierId: supplier3.id,
      poNumber: "PO-2026-0003",
      status: "SENT",
      orderDate: new Date("2026-01-02"),
      expectedDelivery: new Date("2026-01-12"),
      subtotal: 3300,
      tax: 0,
      shipping: 200,
      total: 3500,
      notes: "Wire mesh for Q1 production",
      createdByUserId: admin.id,
      approvedByUserId: supervisor.id,
      approvedAt: new Date("2026-01-02"),
      sentAt: new Date("2026-01-02"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: additionalItems[3].id, // WIRE-MESH-24
            description: "Wire Mesh 24\" - 200 units",
            qtyOrdered: 200,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 8.25,
            lineTotal: 1650,
            status: "PENDING",
          },
          {
            lineNumber: 2,
            itemId: additionalItems[4].id, // WIRE-MESH-18
            description: "Wire Mesh 18\" - 200 units",
            qtyOrdered: 200,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 6.75,
            lineTotal: 1350,
            status: "PENDING",
          },
          {
            lineNumber: 3,
            itemId: additionalItems[7].id, // SEALANT-URETHANE
            description: "Urethane Sealant - 20 units",
            qtyOrdered: 20,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 15.00,
            lineTotal: 300,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // PO 4 - Draft
  const po4 = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      supplierId: supplier4.id,
      poNumber: "PO-2026-0004",
      status: "DRAFT",
      orderDate: new Date("2026-01-04"),
      expectedDelivery: new Date("2026-01-10"),
      subtotal: 1200,
      tax: 0,
      shipping: 50,
      total: 1250,
      notes: "Packaging supplies restock",
      createdByUserId: operator.id,
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: additionalItems[10].id, // BOX-SMALL
            description: "Shipping Box Small - 100 units",
            qtyOrdered: 100,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 2.50,
            lineTotal: 250,
            status: "PENDING",
          },
          {
            lineNumber: 2,
            itemId: additionalItems[11].id, // BOX-MEDIUM
            description: "Shipping Box Medium - 100 units",
            qtyOrdered: 100,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 4.00,
            lineTotal: 400,
            status: "PENDING",
          },
          {
            lineNumber: 3,
            itemId: additionalItems[12].id, // BOX-LARGE
            description: "Shipping Box Large - 50 units",
            qtyOrdered: 50,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 6.50,
            lineTotal: 325,
            status: "PENDING",
          },
          {
            lineNumber: 4,
            itemId: additionalItems[14].id, // TAPE-PACKING
            description: "Packing Tape Roll - 50 units",
            qtyOrdered: 50,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 4.50,
            lineTotal: 225,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // PO 5 - Pending approval
  const po5 = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      supplierId: supplier5.id,
      poNumber: "PO-2026-0005",
      status: "PENDING_APPROVAL",
      orderDate: new Date("2026-01-04"),
      expectedDelivery: new Date("2026-01-11"),
      subtotal: 485,
      tax: 0,
      shipping: 35,
      total: 520,
      notes: "MRO supplies monthly order",
      createdByUserId: operator.id,
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: additionalItems[18].id, // GLOVES-NITRILE-L
            description: "Nitrile Gloves Large (Box) - 10 boxes",
            qtyOrdered: 10,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 15.00,
            lineTotal: 150,
            status: "PENDING",
          },
          {
            lineNumber: 2,
            itemId: additionalItems[19].id, // GLOVES-NITRILE-M
            description: "Nitrile Gloves Medium (Box) - 10 boxes",
            qtyOrdered: 10,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 15.00,
            lineTotal: 150,
            status: "PENDING",
          },
          {
            lineNumber: 3,
            itemId: additionalItems[20].id, // SAFETY-GLASSES
            description: "Safety Glasses - 10 units",
            qtyOrdered: 10,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 8.50,
            lineTotal: 85,
            status: "PENDING",
          },
          {
            lineNumber: 4,
            itemId: additionalItems[22].id, // CLEANING-SOLVENT
            description: "Cleaning Solvent Gallon - 2 units",
            qtyOrdered: 2,
            qtyReceived: 0,
            uom: "EA",
            unitPrice: 45.00,
            lineTotal: 90,
            status: "PENDING",
          },
        ],
      },
    },
  });

  console.log("Creating purchase receipts...");
  
  // Get PO1 lines for receipt
  const po1Lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrderId: po1.id },
    orderBy: { lineNumber: "asc" },
  });

  const receipt1 = await prisma.receipt.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      purchaseOrderId: po1.id,
      receiptNumber: "RCV-2026-0001",
      receiptDate: new Date("2025-12-27"),
      receivedBy: operator.id,
      locationId: receivingDock.id,
      notes: "Full shipment received in good condition",
      lines: {
        create: [
          {
            purchaseOrderLineId: po1Lines[0].id,
            itemId: filterMedia.id,
            qtyReceived: 10,
            uom: "ROLL",
          },
        ],
      },
    },
  });

  // Get PO2 lines for partial receipt
  const po2Lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrderId: po2.id },
    orderBy: { lineNumber: "asc" },
  });

  const receipt2 = await prisma.receipt.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      purchaseOrderId: po2.id,
      receiptNumber: "RCV-2026-0002",
      receiptDate: new Date("2026-01-02"),
      receivedBy: operator.id,
      locationId: receivingDock.id,
      notes: "Partial shipment - caps backordered",
      lines: {
        create: [
          {
            purchaseOrderLineId: po2Lines[0].id,
            itemId: caps.id,
            qtyReceived: 500,
            uom: "EA",
          },
          {
            purchaseOrderLineId: po2Lines[1].id,
            itemId: coreStocks.id,
            qtyReceived: 200,
            uom: "EA",
          },
        ],
      },
    },
  });

  // =========================================================================
  // JOBS / WORK ORDERS (using the Job model from schema)
  // =========================================================================
  console.log("Creating jobs/work orders...");

  const job1 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0001",
      description: "HVAC Filter Production - January Batch",
      type: "PRODUCTION",
      status: "IN_PROGRESS",
      scheduledDate: new Date("2026-01-02"),
      startedAt: new Date("2026-01-02"),
      createdByUserId: admin.id,
      assignedToUserId: operator.id,
    },
  });

  const job2 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0002",
      description: "Industrial Filter Production Run",
      type: "PRODUCTION",
      status: "IN_PROGRESS",
      scheduledDate: new Date("2026-01-03"),
      startedAt: new Date("2026-01-03"),
      createdByUserId: supervisor.id,
      assignedToUserId: operator.id,
    },
  });

  const job3 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0003",
      description: "HEPA Filter Special Order",
      type: "PRODUCTION",
      status: "PENDING",
      scheduledDate: new Date("2026-01-10"),
      createdByUserId: admin.id,
    },
  });

  const job4 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0004",
      description: "Carbon Filter Assembly",
      type: "ASSEMBLY",
      status: "PENDING",
      scheduledDate: new Date("2026-01-15"),
      createdByUserId: supervisor.id,
    },
  });

  const job5 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0005",
      description: "Pleated Filter Quick Run",
      type: "PRODUCTION",
      status: "IN_PROGRESS",
      scheduledDate: new Date("2025-12-28"),
      startedAt: new Date("2025-12-28"),
      createdByUserId: operator.id,
      assignedToUserId: operator.id,
    },
  });

  const job6 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0006",
      description: "Pre-Filter Stock Build",
      type: "PRODUCTION",
      status: "COMPLETED",
      scheduledDate: new Date("2025-12-15"),
      startedAt: new Date("2025-12-15"),
      completedAt: new Date("2025-12-21"),
      createdByUserId: supervisor.id,
      assignedToUserId: operator.id,
    },
  });

  const job7 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0007",
      description: "Small HVAC Filter Run",
      type: "PRODUCTION",
      status: "PENDING",
      scheduledDate: new Date("2026-01-20"),
      createdByUserId: admin.id,
    },
  });

  const job8 = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      jobNumber: "JOB-2026-0008",
      description: "Emergency HEPA Order - Hospital",
      type: "PRODUCTION",
      status: "PENDING",
      scheduledDate: new Date("2026-01-06"),
      createdByUserId: admin.id,
    },
  });

  // Create job lines for the jobs
  const jobLineData = [
    // Job 1 - HVAC Filter Production
    { jobId: job1.id, itemId: filterMedia.id, qtyOrdered: 500, qtyCompleted: 175, qtyBase: 500, status: "IN_PROGRESS" },
    { jobId: job1.id, itemId: caps.id, qtyOrdered: 1000, qtyCompleted: 350, qtyBase: 1000, status: "IN_PROGRESS" },
    // Job 2 - Industrial Filter
    { jobId: job2.id, itemId: additionalItems[3].id, qtyOrdered: 200, qtyCompleted: 80, qtyBase: 200, status: "IN_PROGRESS" },
    // Job 5 - Pleated Filter
    { jobId: job5.id, itemId: filterMedia.id, qtyOrdered: 1000, qtyCompleted: 450, qtyBase: 1000, status: "IN_PROGRESS" },
    // Job 6 - Pre-Filter (completed)
    { jobId: job6.id, itemId: filterMedia.id, qtyOrdered: 300, qtyCompleted: 300, qtyBase: 300, status: "COMPLETED" },
  ];

  for (const line of jobLineData) {
    await prisma.jobLine.create({
      data: {
        jobId: line.jobId,
        itemId: line.itemId,
        qtyOrdered: line.qtyOrdered,
        qtyCompleted: line.qtyCompleted,
        qtyBase: line.qtyBase,
        fromLocationId: stockA1.id,
        toLocationId: pleaterStage.id,
        status: line.status,
      },
    });
  }



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
  console.log("Creating inventory events and balances...");

  // Create inventory balances for all items with significant quantities
  // This gives realistic stock levels to demonstrate functionality

  // Raw materials - high stock levels
  const rawMaterialBalances = [
    { item: filterMedia, location: stockA1, qty: 5000, cost: 2.50 },
    { item: caps, location: stockA1, qty: 3500, cost: 0.75 },
    { item: coreStocks, location: stockA1, qty: 800, cost: 4.25 },
    { item: filterMedia, location: receivingDock, qty: 1000, cost: 2.50 },
    { item: caps, location: receivingDock, qty: 500, cost: 0.75 },
  ];

  // Add raw material inventory events and balances
  for (const bal of rawMaterialBalances) {
    await prisma.inventoryEvent.create({
      data: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        eventType: "RECEIVE",
        itemId: bal.item.id,
        qtyEntered: bal.qty,
        uomEntered: bal.item.baseUom,
        qtyBase: bal.qty,
        toLocationId: bal.location.id,
        createdByUserId: operator.id,
        notes: "Initial stock load",
      },
    });

    await prisma.inventoryBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId: tenant.id,
          itemId: bal.item.id,
          locationId: bal.location.id,
        },
      },
      update: { qtyBase: bal.qty },
      create: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        itemId: bal.item.id,
        locationId: bal.location.id,
        qtyBase: bal.qty,
      },
    });
  }

  // Add inventory for additional raw materials
  for (let i = 0; i < 10; i++) {
    const item = additionalItems[i];
    if (item) {
      const qty = 200 + Math.floor(Math.random() * 800);
      await prisma.inventoryEvent.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          eventType: "RECEIVE",
          itemId: item.id,
          qtyEntered: qty,
          uomEntered: "EA",
          qtyBase: qty,
          toLocationId: stockA1.id,
          createdByUserId: operator.id,
          notes: "Initial stock load",
        },
      });

      await prisma.inventoryBalance.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          itemId: item.id,
          locationId: stockA1.id,
          qtyBase: qty,
        },
      });
    }
  }

  // Finished goods - moderate stock
  for (let i = 0; i < finishedItems.length; i++) {
    const item = finishedItems[i];
    const qty = 50 + Math.floor(Math.random() * 150);
    await prisma.inventoryEvent.create({
      data: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        eventType: "RECEIVE",
        itemId: item.id,
        qtyEntered: qty,
        uomEntered: "EA",
        qtyBase: qty,
        toLocationId: stockA1.id,
        createdByUserId: operator.id,
        notes: "Production output - initial load",
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        itemId: item.id,
        locationId: stockA1.id,
        qtyBase: qty,
      },
    });
  }

  // Packaging items
  for (let i = 10; i < 18; i++) {
    const item = additionalItems[i];
    if (item) {
      const qty = 50 + Math.floor(Math.random() * 100);
      await prisma.inventoryEvent.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          eventType: "RECEIVE",
          itemId: item.id,
          qtyEntered: qty,
          uomEntered: "EA",
          qtyBase: qty,
          toLocationId: stockA1.id,
          createdByUserId: operator.id,
          notes: "Packaging supplies restock",
        },
      });

      await prisma.inventoryBalance.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          itemId: item.id,
          locationId: stockA1.id,
          qtyBase: qty,
        },
      });
    }
  }

  // MRO items
  for (let i = 18; i < additionalItems.length; i++) {
    const item = additionalItems[i];
    if (item) {
      const qty = 10 + Math.floor(Math.random() * 40);
      await prisma.inventoryEvent.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          eventType: "RECEIVE",
          itemId: item.id,
          qtyEntered: qty,
          uomEntered: "EA",
          qtyBase: qty,
          toLocationId: stockA1.id,
          createdByUserId: operator.id,
          notes: "MRO supplies restock",
        },
      });

      await prisma.inventoryBalance.create({
        data: {
          tenantId: tenant.id,
          siteId: mainSite.id,
          itemId: item.id,
          locationId: stockA1.id,
          qtyBase: qty,
        },
      });
    }
  }

  // Add some items at pleater staging location for manufacturing
  const stagingItems = [filterMedia, caps, coreStocks];
  for (const item of stagingItems) {
    const qty = 100 + Math.floor(Math.random() * 200);
    await prisma.inventoryEvent.create({
      data: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        eventType: "MOVE",
        itemId: item.id,
        qtyEntered: qty,
        uomEntered: item.baseUom,
        qtyBase: qty,
        fromLocationId: stockA1.id,
        toLocationId: pleaterStage.id,
        createdByUserId: operator.id,
        notes: "Staged for production",
      },
    });

    await prisma.inventoryBalance.create({
      data: {
        tenantId: tenant.id,
        siteId: mainSite.id,
        itemId: item.id,
        locationId: pleaterStage.id,
        qtyBase: qty,
      },
    });
  }

  console.log("Created inventory for all items");


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

  const customer4 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-004",
      name: "MidWest HVAC Services",
      email: "purchasing@midwesthvac.com",
      phone: "555-456-7890",
      billingAddress1: "750 Heating Lane",
      billingCity: "Minneapolis",
      billingState: "MN",
      billingZip: "55401",
      billingCountry: "USA",
      shippingAddress1: "750 Heating Lane",
      shippingCity: "Minneapolis",
      shippingState: "MN",
      shippingZip: "55401",
      shippingCountry: "USA",
      paymentTerms: "Net 30",
      creditLimit: 100000,
      isActive: true,
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-005",
      name: "CleanRoom Technologies",
      email: "orders@cleanroomtech.com",
      phone: "555-567-8901",
      billingAddress1: "300 Sterile Drive",
      billingCity: "San Jose",
      billingState: "CA",
      billingZip: "95110",
      billingCountry: "USA",
      shippingAddress1: "300 Sterile Drive, Building C",
      shippingCity: "San Jose",
      shippingState: "CA",
      shippingZip: "95110",
      shippingCountry: "USA",
      paymentTerms: "Net 30",
      creditLimit: 150000,
      isActive: true,
    },
  });

  const customer6 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-006",
      name: "Southern Air Quality",
      email: "saq-orders@southernair.net",
      phone: "555-678-9012",
      billingAddress1: "1500 Filter Road",
      billingCity: "Atlanta",
      billingState: "GA",
      billingZip: "30301",
      billingCountry: "USA",
      paymentTerms: "Net 30",
      creditLimit: 40000,
      isActive: true,
    },
  });

  const customer7 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-007",
      name: "Pacific Medical Center",
      email: "facilities@pacificmed.org",
      phone: "555-789-0123",
      billingAddress1: "900 Hospital Way",
      billingCity: "Seattle",
      billingState: "WA",
      billingZip: "98101",
      billingCountry: "USA",
      shippingAddress1: "900 Hospital Way, Receiving Dock",
      shippingCity: "Seattle",
      shippingState: "WA",
      shippingZip: "98101",
      shippingCountry: "USA",
      paymentTerms: "Net 45",
      creditLimit: 200000,
      isActive: true,
    },
  });

  const customer8 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      code: "CUST-008",
      name: "Northeast Distributors",
      email: "bulk@nedist.com",
      phone: "555-890-1234",
      billingAddress1: "2500 Distribution Center Pkwy",
      billingCity: "Newark",
      billingState: "NJ",
      billingZip: "07101",
      billingCountry: "USA",
      shippingAddress1: "2500 Distribution Center Pkwy",
      shippingCity: "Newark",
      shippingState: "NJ",
      shippingZip: "07101",
      shippingCountry: "USA",
      paymentTerms: "Net 60",
      creditLimit: 500000,
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
            itemId: finishedItems[0].id, // HVAC 24x24x2
            description: "HVAC Filter 24x24x2",
            qtyOrdered: 50,
            qtyAllocated: 50,
            qtyPicked: 50,
            qtyShipped: 50,
            uom: "EA",
            unitPrice: 32,
            lineTotal: 1600,
            status: "SHIPPED",
          },
        ],
      },
    },
  });

  // Order 2 - Allocated order, needs picking
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
            itemId: finishedItems[4].id, // Industrial 24x24x4
            description: "Industrial Filter 24x24x4",
            qtyOrdered: 30,
            qtyAllocated: 30,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 78,
            lineTotal: 2340,
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
      subtotal: 2200,
      taxAmount: 165,
      shippingAmount: 85,
      total: 2450,
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
            itemId: finishedItems[6].id, // HEPA 24x24x6
            description: "HEPA Filter 24x24x6",
            qtyOrdered: 10,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 220,
            lineTotal: 2200,
            status: "OPEN",
          },
        ],
      },
    },
  });

  // Order 4 - Confirmed, large order
  const order4 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer4.id,
      orderNumber: "SO-2026-0004",
      status: "CONFIRMED",
      orderDate: new Date("2026-01-04"),
      requestedDate: new Date("2026-01-18"),
      subtotal: 5200,
      taxAmount: 390,
      shippingAmount: 200,
      total: 5790,
      shipToAddress1: "750 Heating Lane",
      shipToCity: "Minneapolis",
      shipToState: "MN",
      shipToZip: "55401",
      shipToCountry: "USA",
      notes: "Bulk order - schedule delivery",
      createdByUserId: supervisor.id,
      approvedByUserId: admin.id,
      approvedAt: new Date("2026-01-04"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: finishedItems[0].id, // HVAC 24x24x2
            description: "HVAC Filter 24x24x2",
            qtyOrdered: 100,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 32,
            lineTotal: 3200,
            status: "OPEN",
          },
          {
            lineNumber: 2,
            itemId: finishedItems[1].id, // HVAC 20x20x2
            description: "HVAC Filter 20x20x2",
            qtyOrdered: 50,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 26,
            lineTotal: 1300,
            status: "OPEN",
          },
          {
            lineNumber: 3,
            itemId: finishedItems[13].id, // Pre-filter 24x24x1
            description: "Pre-Filter 24x24x1",
            qtyOrdered: 100,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 8.50,
            lineTotal: 850,
            status: "OPEN",
          },
        ],
      },
    },
  });

  // Order 5 - HEPA order for cleanroom
  const order5 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer5.id,
      orderNumber: "SO-2026-0005",
      status: "CONFIRMED",
      orderDate: new Date("2026-01-05"),
      requestedDate: new Date("2026-01-25"),
      subtotal: 8800,
      taxAmount: 660,
      shippingAmount: 350,
      total: 9810,
      shipToAddress1: "300 Sterile Drive, Building C",
      shipToCity: "San Jose",
      shipToState: "CA",
      shipToZip: "95110",
      shipToCountry: "USA",
      notes: "Cleanroom spec - handle with care",
      createdByUserId: admin.id,
      approvedByUserId: supervisor.id,
      approvedAt: new Date("2026-01-05"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: finishedItems[6].id, // HEPA 24x24x6
            description: "HEPA Filter 24x24x6",
            qtyOrdered: 20,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 220,
            lineTotal: 4400,
            status: "OPEN",
          },
          {
            lineNumber: 2,
            itemId: finishedItems[7].id, // HEPA 18x24x6
            description: "HEPA Filter 18x24x6",
            qtyOrdered: 20,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 185,
            lineTotal: 3700,
            status: "OPEN",
          },
        ],
      },
    },
  });

  // Order 6 - Carbon filter order
  const order6 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer6.id,
      orderNumber: "SO-2026-0006",
      status: "DRAFT",
      orderDate: new Date("2026-01-05"),
      requestedDate: new Date("2026-01-30"),
      subtotal: 4600,
      taxAmount: 345,
      shippingAmount: 150,
      total: 5095,
      shipToAddress1: "1500 Filter Road",
      shipToCity: "Atlanta",
      shipToState: "GA",
      shipToZip: "30301",
      shipToCountry: "USA",
      createdByUserId: operator.id,
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: finishedItems[11].id, // Carbon 24x24x2
            description: "Carbon Filter 24x24x2",
            qtyOrdered: 40,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 115,
            lineTotal: 4600,
            status: "OPEN",
          },
        ],
      },
    },
  });

  // Order 7 - Hospital priority order
  const order7 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer7.id,
      orderNumber: "SO-2026-0007",
      status: "ALLOCATED",
      orderDate: new Date("2026-01-05"),
      requestedDate: new Date("2026-01-12"),
      subtotal: 6600,
      taxAmount: 495,
      shippingAmount: 250,
      total: 7345,
      shipToAddress1: "900 Hospital Way, Receiving Dock",
      shipToCity: "Seattle",
      shipToState: "WA",
      shipToZip: "98101",
      shipToCountry: "USA",
      notes: "URGENT - Hospital supply",
      createdByUserId: admin.id,
      approvedByUserId: admin.id,
      approvedAt: new Date("2026-01-05"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: finishedItems[6].id, // HEPA 24x24x6
            description: "HEPA Filter 24x24x6 - Hospital Grade",
            qtyOrdered: 30,
            qtyAllocated: 30,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 220,
            lineTotal: 6600,
            status: "ALLOCATED",
          },
        ],
      },
    },
  });

  // Order 8 - Large distributor order
  const order8 = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      customerId: customer8.id,
      orderNumber: "SO-2026-0008",
      status: "CONFIRMED",
      orderDate: new Date("2026-01-05"),
      requestedDate: new Date("2026-02-01"),
      subtotal: 15000,
      taxAmount: 1125,
      shippingAmount: 500,
      total: 16625,
      shipToAddress1: "2500 Distribution Center Pkwy",
      shipToCity: "Newark",
      shipToState: "NJ",
      shipToZip: "07101",
      shipToCountry: "USA",
      notes: "Monthly bulk order",
      createdByUserId: supervisor.id,
      approvedByUserId: admin.id,
      approvedAt: new Date("2026-01-05"),
      lines: {
        create: [
          {
            lineNumber: 1,
            itemId: finishedItems[8].id, // Pleated 20x25x1
            description: "Pleated Filter 20x25x1",
            qtyOrdered: 500,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 15,
            lineTotal: 7500,
            status: "OPEN",
          },
          {
            lineNumber: 2,
            itemId: finishedItems[9].id, // Pleated 16x25x1
            description: "Pleated Filter 16x25x1",
            qtyOrdered: 400,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 13,
            lineTotal: 5200,
            status: "OPEN",
          },
          {
            lineNumber: 3,
            itemId: finishedItems[10].id, // Pleated 14x20x1
            description: "Pleated Filter 14x20x1",
            qtyOrdered: 300,
            qtyAllocated: 0,
            qtyPicked: 0,
            qtyShipped: 0,
            uom: "EA",
            unitPrice: 11,
            lineTotal: 3300,
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
            itemId: finishedItems[0].id,
            qtyShipped: 50,
            uom: "EA",
          },
        ],
      },
      packages: {
        create: [
          {
            packageNumber: 1,
            weight: 45.5,
            trackingNumber: "794644790047-1",
          },
        ],
      },
    },
  });

  console.log("Creating pick tasks...");
  // Get order 2 lines for pick task
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
            itemId: finishedItems[4].id,
            qtyToPick: 30,
            qtyPicked: 0,
            uom: "EA",
            locationId: stockA1.id,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // Get order 7 lines for urgent hospital pick task
  const order7Lines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: order7.id },
    orderBy: { lineNumber: "asc" },
  });

  const pickTask2 = await prisma.pickTask.create({
    data: {
      tenantId: tenant.id,
      siteId: mainSite.id,
      salesOrderId: order7.id,
      taskNumber: "PICK-2026-0002",
      status: "IN_PROGRESS",
      priority: 1,
      assignedToUserId: operator.id,
      lines: {
        create: [
          {
            salesOrderLineId: order7Lines[0].id,
            itemId: finishedItems[6].id,
            qtyToPick: 30,
            qtyPicked: 15,
            uom: "EA",
            locationId: stockA1.id,
            status: "IN_PROGRESS",
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
