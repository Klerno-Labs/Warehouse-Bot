import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";

// Define all available permissions
const ALL_PERMISSIONS = [
  // Inventory Permissions
  {
    id: "inventory.view",
    name: "View Inventory",
    description: "View inventory levels and stock information",
    category: "inventory" as const,
  },
  {
    id: "inventory.edit",
    name: "Edit Inventory",
    description: "Adjust inventory quantities and update stock",
    category: "inventory" as const,
  },
  {
    id: "inventory.transfer",
    name: "Transfer Inventory",
    description: "Move inventory between locations",
    category: "inventory" as const,
  },
  {
    id: "inventory.receive",
    name: "Receive Inventory",
    description: "Process incoming shipments and update stock",
    category: "inventory" as const,
  },
  {
    id: "inventory.audit",
    name: "Inventory Audit",
    description: "Perform cycle counts and inventory audits",
    category: "inventory" as const,
  },

  // Production Permissions
  {
    id: "production.view",
    name: "View Production",
    description: "View production orders and schedules",
    category: "production" as const,
  },
  {
    id: "production.create",
    name: "Create Production Orders",
    description: "Create new production orders",
    category: "production" as const,
  },
  {
    id: "production.edit",
    name: "Edit Production Orders",
    description: "Modify existing production orders",
    category: "production" as const,
  },
  {
    id: "production.execute",
    name: "Execute Production",
    description: "Start, pause, and complete production jobs",
    category: "production" as const,
  },
  {
    id: "production.delete",
    name: "Delete Production Orders",
    description: "Cancel and delete production orders",
    category: "production" as const,
  },

  // Sales Permissions
  {
    id: "sales.view",
    name: "View Sales",
    description: "View quotes, orders, and customer information",
    category: "sales" as const,
  },
  {
    id: "sales.create_quote",
    name: "Create Quotes",
    description: "Create and send quotes to customers",
    category: "sales" as const,
  },
  {
    id: "sales.edit_quote",
    name: "Edit Quotes",
    description: "Modify existing quotes",
    category: "sales" as const,
  },
  {
    id: "sales.create_order",
    name: "Create Sales Orders",
    description: "Convert quotes to orders",
    category: "sales" as const,
  },
  {
    id: "sales.manage_customers",
    name: "Manage Customers",
    description: "Add, edit, and delete customer records",
    category: "sales" as const,
  },

  // Admin Permissions
  {
    id: "admin.users",
    name: "Manage Users",
    description: "Create, edit, and delete user accounts",
    category: "admin" as const,
  },
  {
    id: "admin.roles",
    name: "Manage Roles",
    description: "Create and configure user roles and permissions",
    category: "admin" as const,
  },
  {
    id: "admin.departments",
    name: "Manage Departments",
    description: "Configure departments and workstations",
    category: "admin" as const,
  },
  {
    id: "admin.settings",
    name: "System Settings",
    description: "Configure system-wide settings",
    category: "admin" as const,
  },
  {
    id: "admin.billing",
    name: "Billing Management",
    description: "Manage subscription and billing information",
    category: "admin" as const,
  },

  // Analytics Permissions
  {
    id: "analytics.view",
    name: "View Analytics",
    description: "Access reports and analytics dashboards",
    category: "analytics" as const,
  },
  {
    id: "analytics.export",
    name: "Export Reports",
    description: "Export reports and data",
    category: "analytics" as const,
  },
  {
    id: "analytics.custom",
    name: "Custom Reports",
    description: "Create and save custom reports",
    category: "analytics" as const,
  },
  {
    id: "analytics.financial",
    name: "Financial Analytics",
    description: "View financial metrics and reports",
    category: "analytics" as const,
  },
];

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  // Check if user has permission to view permissions (admin role)
  if (!["Admin", "SuperAdmin", "Executive"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return NextResponse.json(ALL_PERMISSIONS);
}
