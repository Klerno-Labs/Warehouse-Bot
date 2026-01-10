/**
 * Sample Data Generator for Testing UX Redesign
 *
 * This script generates realistic sample data for testing the new dashboards,
 * onboarding flow, and role management features.
 *
 * Usage: node --loader ts-node/esm scripts/generate-sample-data.ts
 */

import { storage } from "@server/storage";

// Sample company data
const SAMPLE_COMPANIES = [
  {
    name: "Acme Manufacturing",
    industry: "manufacturing",
    size: "50-200",
    address: "123 Industrial Way, Manufacturing City, MC 12345",
  },
  {
    name: "TechParts Inc",
    industry: "electronics",
    size: "20-50",
    address: "456 Silicon Drive, Tech Valley, TV 67890",
  },
];

// Sample departments by type
const DEPARTMENT_TYPES = {
  inventory: { name: "Inventory Control", description: "Stock management and warehouse operations" },
  picking: { name: "Picking & Packing", description: "Order fulfillment and shipping prep" },
  assembly: { name: "Assembly Line", description: "Product assembly and sub-assembly work" },
  qc: { name: "Quality Control", description: "Inspection and quality assurance" },
  sales: { name: "Sales Department", description: "Quote generation and customer relations" },
  shipping: { name: "Shipping & Receiving", description: "Outbound logistics and receiving" },
  maintenance: { name: "Maintenance", description: "Equipment maintenance and facility upkeep" },
};

// Sample user roles and permissions
const ROLES = [
  {
    name: "Executive",
    description: "C-level executives with full system access",
    color: "bg-purple-500",
    permissions: [
      "analytics.view",
      "analytics.export",
      "analytics.custom",
      "analytics.financial",
      "admin.users",
      "admin.roles",
      "admin.departments",
      "admin.settings",
      "production.view",
      "inventory.view",
      "sales.view",
    ],
    isSystem: true,
  },
  {
    name: "Manager",
    description: "Department managers with oversight capabilities",
    color: "bg-blue-500",
    permissions: [
      "production.view",
      "production.create",
      "production.edit",
      "inventory.view",
      "analytics.view",
      "analytics.export",
    ],
    isSystem: true,
  },
  {
    name: "Operator",
    description: "Production floor operators",
    color: "bg-green-500",
    permissions: ["production.view", "production.execute", "inventory.view"],
    isSystem: true,
  },
  {
    name: "Inventory",
    description: "Inventory and warehouse staff",
    color: "bg-amber-500",
    permissions: [
      "inventory.view",
      "inventory.edit",
      "inventory.transfer",
      "inventory.receive",
      "inventory.audit",
    ],
    isSystem: true,
  },
  {
    name: "Sales",
    description: "Sales and customer service team",
    color: "bg-pink-500",
    permissions: [
      "sales.view",
      "sales.create_quote",
      "sales.edit_quote",
      "sales.create_order",
      "sales.manage_customers",
      "production.view",
    ],
    isSystem: true,
  },
];

// Sample users for each role
const SAMPLE_USERS = [
  // Executive
  { name: "Sarah Chen", email: "sarah.chen@example.com", role: "Executive" },
  { name: "Michael Torres", email: "michael.torres@example.com", role: "Executive" },

  // Managers
  { name: "James Wilson", email: "james.wilson@example.com", role: "Manager" },
  { name: "Emily Rodriguez", email: "emily.rodriguez@example.com", role: "Manager" },
  { name: "David Kim", email: "david.kim@example.com", role: "Manager" },

  // Operators
  { name: "John Smith", email: "john.smith@example.com", role: "Operator" },
  { name: "Maria Garcia", email: "maria.garcia@example.com", role: "Operator" },
  { name: "Robert Johnson", email: "robert.johnson@example.com", role: "Operator" },
  { name: "Lisa Anderson", email: "lisa.anderson@example.com", role: "Operator" },
  { name: "Carlos Martinez", email: "carlos.martinez@example.com", role: "Operator" },
  { name: "Jennifer Lee", email: "jennifer.lee@example.com", role: "Operator" },

  // Inventory
  { name: "Kevin Brown", email: "kevin.brown@example.com", role: "Inventory" },
  { name: "Amanda Taylor", email: "amanda.taylor@example.com", role: "Inventory" },
  { name: "Chris Davis", email: "chris.davis@example.com", role: "Inventory" },

  // Sales
  { name: "Michelle White", email: "michelle.white@example.com", role: "Sales" },
  { name: "Brandon Miller", email: "brandon.miller@example.com", role: "Sales" },
];

// Sample items for production
const SAMPLE_ITEMS = [
  { sku: "WIDGET-001", name: "Standard Widget", unitCost: 5.50, reorderPoint: 100 },
  { sku: "WIDGET-002", name: "Deluxe Widget", unitCost: 8.75, reorderPoint: 50 },
  { sku: "GADGET-100", name: "Mini Gadget", unitCost: 12.00, reorderPoint: 75 },
  { sku: "GADGET-200", name: "Pro Gadget", unitCost: 25.50, reorderPoint: 30 },
  { sku: "PART-A1", name: "Assembly Part A1", unitCost: 3.25, reorderPoint: 200 },
  { sku: "PART-B2", name: "Assembly Part B2", unitCost: 4.00, reorderPoint: 150 },
  { sku: "COMPONENT-X", name: "Component X", unitCost: 15.00, reorderPoint: 60 },
  { sku: "MODULE-Z", name: "Module Z", unitCost: 45.00, reorderPoint: 25 },
];

// Sample customers
const SAMPLE_CUSTOMERS = [
  { name: "Global Tech Corp", company: "Global Tech Corp", email: "orders@globaltech.com" },
  { name: "Industrial Solutions Ltd", company: "Industrial Solutions Ltd", email: "purchasing@indsol.com" },
  { name: "SmartHome Inc", company: "SmartHome Inc", email: "supply@smarthome.com" },
  { name: "AutoParts Plus", company: "AutoParts Plus", email: "orders@autoparts.com" },
  { name: "ElectroMart", company: "ElectroMart", email: "b2b@electromart.com" },
];

async function generateSampleData(tenantId: string) {
  console.log("🚀 Starting sample data generation for tenant:", tenantId);

  try {
    // 1. Create roles
    console.log("\n📋 Creating roles...");
    const createdRoles = [];
    for (const roleData of ROLES) {
      const role = await storage.createRole({
        tenantId,
        ...roleData,
        createdBy: "system",
      });
      createdRoles.push(role);
      console.log(`  ✓ Created role: ${role.name}`);
    }

    // 2. Create departments
    console.log("\n🏢 Creating departments...");
    const createdDepartments = [];
    for (const [type, data] of Object.entries(DEPARTMENT_TYPES)) {
      const dept = await storage.createDepartment({
        tenantId,
        name: data.name,
        type,
        description: data.description,
        isActive: true,
      });
      createdDepartments.push(dept);
      console.log(`  ✓ Created department: ${dept.name}`);
    }

    // 3. Create stations
    console.log("\n🖥️  Creating workstations...");
    const stationTypes = ["tablet", "workstation", "tv_board", "printer"] as const;
    const createdStations = [];
    for (let i = 0; i < createdDepartments.length; i++) {
      const dept = createdDepartments[i];
      // Create 2-3 stations per department
      const stationCount = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < stationCount; j++) {
        const station = await storage.createStation({
          tenantId,
          departmentId: dept.id,
          name: `${dept.name} Station ${j + 1}`,
          type: stationTypes[Math.floor(Math.random() * stationTypes.length)],
          location: `Floor ${Math.floor(i / 3) + 1}, Bay ${j + 1}`,
          isActive: true,
        });
        createdStations.push(station);
      }
    }
    console.log(`  ✓ Created ${createdStations.length} workstations`);

    // 4. Create users
    console.log("\n👥 Creating users...");
    const createdUsers = [];
    for (const userData of SAMPLE_USERS) {
      // Assign random department(s) based on role
      let departmentIds: string[] = [];
      if (userData.role === "Executive") {
        // Executives can see all departments
        departmentIds = createdDepartments.map(d => d.id);
      } else if (userData.role === "Manager") {
        // Managers get 1-2 departments
        const deptCount = Math.floor(Math.random() * 2) + 1;
        departmentIds = createdDepartments
          .slice(0, deptCount)
          .map(d => d.id);
      } else {
        // Others get 1 department
        const randomDept = createdDepartments[Math.floor(Math.random() * createdDepartments.length)];
        departmentIds = [randomDept.id];
      }

      const user = await storage.createUser({
        tenantId,
        ...userData,
        password: "password123", // Demo password
        departmentIds,
        isActive: true,
        lastActive: Math.random() > 0.3 ? new Date() : new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      createdUsers.push(user);
      console.log(`  ✓ Created user: ${user.name} (${user.role})`);
    }

    // 5. Create items
    console.log("\n📦 Creating inventory items...");
    const createdItems = [];
    for (const itemData of SAMPLE_ITEMS) {
      const item = await storage.createItem({
        tenantId,
        ...itemData,
        description: `High-quality ${itemData.name.toLowerCase()} for manufacturing`,
      });
      createdItems.push(item);
      console.log(`  ✓ Created item: ${item.sku} - ${item.name}`);
    }

    // 6. Create initial inventory
    console.log("\n📊 Creating inventory records...");
    for (const item of createdItems) {
      const quantity = Math.floor(Math.random() * 500) + 100;
      await storage.createInventoryBalance({
        tenantId,
        itemId: item.id,
        quantity,
        locationId: createdDepartments[0].id, // Default to first department
      });
    }
    console.log(`  ✓ Created inventory for ${createdItems.length} items`);

    // 7. Create customers
    console.log("\n🤝 Creating customers...");
    const createdCustomers = [];
    for (const customerData of SAMPLE_CUSTOMERS) {
      const customer = await storage.createCustomer({
        tenantId,
        ...customerData,
        type: "customer",
      });
      createdCustomers.push(customer);
      console.log(`  ✓ Created customer: ${customer.company}`);
    }

    // 8. Create production orders
    console.log("\n🏭 Creating production orders...");
    const statuses = ["PENDING", "IN_PROGRESS", "PAUSED", "COMPLETED"] as const;
    const operators = createdUsers.filter(u => u.role === "Operator");

    for (let i = 0; i < 30; i++) {
      const item = createdItems[Math.floor(Math.random() * createdItems.length)];
      const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const dept = createdDepartments[Math.floor(Math.random() * createdDepartments.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const qtyOrdered = Math.floor(Math.random() * 100) + 10;
      const qtyCompleted = status === "COMPLETED" ? qtyOrdered : Math.floor(Math.random() * qtyOrdered);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) - 7); // -7 to +7 days

      const order = await storage.createProductionOrder({
        tenantId,
        orderNumber: `PO-${String(i + 1).padStart(5, "0")}`,
        itemId: item.id,
        itemName: item.name,
        qtyOrdered,
        qtyCompleted,
        customerId: customer.id,
        departmentId: dept.id,
        status,
        priority: Math.floor(Math.random() * 5) + 1,
        dueDate,
        assignedTo: status === "IN_PROGRESS" || status === "PAUSED"
          ? operators[Math.floor(Math.random() * operators.length)].id
          : undefined,
        startedAt: status !== "PENDING" ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        estimatedDuration: Math.floor(Math.random() * 240) + 60, // 60-300 minutes
        createdBy: createdUsers[0].id,
      });

      if (i % 10 === 0) console.log(`  ✓ Created ${i + 1} production orders...`);
    }
    console.log(`  ✓ Created 30 production orders`);

    // 9. Create quality records
    console.log("\n✅ Creating quality records...");
    for (let i = 0; i < 20; i++) {
      await storage.createQualityRecord({
        tenantId,
        orderId: `PO-${String(Math.floor(Math.random() * 30) + 1).padStart(5, "0")}`,
        passed: Math.random() > 0.1, // 90% pass rate
        inspectorId: createdUsers.find(u => u.role === "Manager")?.id || createdUsers[0].id,
        notes: Math.random() > 0.5 ? "All checks passed" : "Minor defect noted and corrected",
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    }
    console.log(`  ✓ Created 20 quality records`);

    console.log("\n✨ Sample data generation complete!");
    console.log("\nSummary:");
    console.log(`  • ${ROLES.length} roles`);
    console.log(`  • ${createdDepartments.length} departments`);
    console.log(`  • ${createdStations.length} workstations`);
    console.log(`  • ${createdUsers.length} users`);
    console.log(`  • ${createdItems.length} items`);
    console.log(`  • ${createdCustomers.length} customers`);
    console.log(`  • 30 production orders`);
    console.log(`  • 20 quality records`);

    return {
      success: true,
      counts: {
        roles: ROLES.length,
        departments: createdDepartments.length,
        stations: createdStations.length,
        users: createdUsers.length,
        items: createdItems.length,
        customers: createdCustomers.length,
        orders: 30,
        qualityRecords: 20,
      },
    };
  } catch (error) {
    console.error("❌ Error generating sample data:", error);
    throw error;
  }
}

// Export for use in API endpoint or direct execution
export { generateSampleData };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error("❌ Please provide a tenant ID as argument");
    console.log("Usage: node --loader ts-node/esm scripts/generate-sample-data.ts <tenantId>");
    process.exit(1);
  }

  generateSampleData(tenantId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
