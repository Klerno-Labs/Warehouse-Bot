/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions for the 5-tier user system
 */

export enum Role {
  // Tier 1: Operators (Department-specific, job-based access)
  Operator = 'Operator',

  // Tier 2: Management (Extended functions within departments)
  Supervisor = 'Supervisor',
  Inventory = 'Inventory',
  Purchasing = 'Purchasing',
  Maintenance = 'Maintenance',
  QC = 'QC',

  // Tier 3: Sales (Sales Pit access only)
  Sales = 'Sales',

  // Tier 4: Engineering (Inventory view + job submission)
  Engineering = 'Engineering',

  // Tier 5: Executive (Full system control)
  Admin = 'Admin',
  Executive = 'Executive',

  // Legacy/Limited
  Viewer = 'Viewer',
}

export enum Permission {
  // Dashboard access
  VIEW_DASHBOARD = 'view_dashboard',

  // Inventory permissions
  VIEW_INVENTORY = 'view_inventory',
  EDIT_INVENTORY = 'edit_inventory',
  ADJUST_INVENTORY = 'adjust_inventory',
  CYCLE_COUNT = 'cycle_count',

  // Production permissions
  VIEW_PRODUCTION = 'view_production',
  CREATE_PRODUCTION_ORDER = 'create_production_order',
  EDIT_PRODUCTION_ORDER = 'edit_production_order',
  COMPLETE_PRODUCTION_JOB = 'complete_production_job',
  VIEW_JOB_CARD = 'view_job_card',

  // Purchasing permissions
  VIEW_PURCHASING = 'view_purchasing',
  CREATE_PURCHASE_ORDER = 'create_purchase_order',
  APPROVE_PURCHASE_ORDER = 'approve_purchase_order',
  RECEIVE_GOODS = 'receive_goods',

  // Sales permissions (Sales Pit)
  VIEW_SALES = 'view_sales',
  CREATE_SALES_ORDER = 'create_sales_order',
  EDIT_SALES_ORDER = 'edit_sales_order',
  MANAGE_CUSTOMERS = 'manage_customers',
  CREATE_SHIPMENT = 'create_shipment',
  VIEW_SALES_ANALYTICS = 'view_sales_analytics',

  // Quality permissions
  VIEW_QUALITY = 'view_quality',
  PERFORM_INSPECTION = 'perform_inspection',
  CREATE_NCR = 'create_ncr',
  MANAGE_QUALITY_PLANS = 'manage_quality_plans',

  // BOM permissions
  VIEW_BOM = 'view_bom',
  CREATE_BOM = 'create_bom',
  EDIT_BOM = 'edit_bom',
  APPROVE_BOM = 'approve_bom',

  // User management
  VIEW_USERS = 'view_users',
  MANAGE_USERS = 'manage_users',

  // Settings & Configuration
  VIEW_SETTINGS = 'view_settings',
  MANAGE_SETTINGS = 'manage_settings',
  MANAGE_FACILITIES = 'manage_facilities',

  // Reports & Analytics
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',

  // Mobile app
  USE_MOBILE_APP = 'use_mobile_app',
}

/**
 * Role hierarchy and permission mappings
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // TIER 1: OPERATORS
  // Department-specific, job-based access only
  [Role.Operator]: [
    Permission.USE_MOBILE_APP,
    Permission.VIEW_JOB_CARD,
    Permission.COMPLETE_PRODUCTION_JOB,
    Permission.VIEW_INVENTORY, // Read-only for parts needed
  ],

  // TIER 2: MANAGEMENT ROLES
  // Supervisor - oversees production floor
  [Role.Supervisor]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PRODUCTION,
    Permission.CREATE_PRODUCTION_ORDER,
    Permission.EDIT_PRODUCTION_ORDER,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_JOB_CARD,
    Permission.COMPLETE_PRODUCTION_JOB,
    Permission.VIEW_BOM,
    Permission.VIEW_QUALITY,
    Permission.PERFORM_INSPECTION,
    Permission.VIEW_REPORTS,
    Permission.USE_MOBILE_APP,
  ],

  // Inventory Manager - manages stock and cycle counts
  [Role.Inventory]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.CYCLE_COUNT,
    Permission.VIEW_PRODUCTION,
    Permission.RECEIVE_GOODS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],

  // Purchasing - manages vendors and POs
  [Role.Purchasing]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PURCHASING,
    Permission.CREATE_PURCHASE_ORDER,
    Permission.APPROVE_PURCHASE_ORDER,
    Permission.RECEIVE_GOODS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],

  // Maintenance - facility and equipment management
  [Role.Maintenance]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY, // For spare parts
    Permission.VIEW_PRODUCTION,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_FACILITIES,
  ],

  // QC - quality control and inspections
  [Role.QC]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_QUALITY,
    Permission.PERFORM_INSPECTION,
    Permission.CREATE_NCR,
    Permission.MANAGE_QUALITY_PLANS,
    Permission.VIEW_PRODUCTION,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_REPORTS,
  ],

  // TIER 3: SALES (Sales Pit only)
  [Role.Sales]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES_ORDER,
    Permission.EDIT_SALES_ORDER,
    Permission.MANAGE_CUSTOMERS,
    Permission.CREATE_SHIPMENT,
    Permission.VIEW_SALES_ANALYTICS,
    Permission.VIEW_INVENTORY, // Read-only to check stock
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],

  // TIER 4: ENGINEERING
  // View inventory + submit production jobs
  [Role.Engineering]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY, // Full inventory view
    Permission.VIEW_PRODUCTION,
    Permission.CREATE_PRODUCTION_ORDER, // Submit jobs
    Permission.VIEW_BOM,
    Permission.CREATE_BOM,
    Permission.EDIT_BOM,
    Permission.VIEW_QUALITY,
    Permission.VIEW_REPORTS,
  ],

  // TIER 5: EXECUTIVE (Full control)
  [Role.Executive]: [
    // Full access to everything
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.CYCLE_COUNT,
    Permission.VIEW_PRODUCTION,
    Permission.CREATE_PRODUCTION_ORDER,
    Permission.EDIT_PRODUCTION_ORDER,
    Permission.COMPLETE_PRODUCTION_JOB,
    Permission.VIEW_JOB_CARD,
    Permission.VIEW_PURCHASING,
    Permission.CREATE_PURCHASE_ORDER,
    Permission.APPROVE_PURCHASE_ORDER,
    Permission.RECEIVE_GOODS,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES_ORDER,
    Permission.EDIT_SALES_ORDER,
    Permission.MANAGE_CUSTOMERS,
    Permission.CREATE_SHIPMENT,
    Permission.VIEW_SALES_ANALYTICS,
    Permission.VIEW_QUALITY,
    Permission.PERFORM_INSPECTION,
    Permission.CREATE_NCR,
    Permission.MANAGE_QUALITY_PLANS,
    Permission.VIEW_BOM,
    Permission.CREATE_BOM,
    Permission.EDIT_BOM,
    Permission.APPROVE_BOM,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_FACILITIES,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.USE_MOBILE_APP,
  ],

  [Role.Admin]: [
    // Same as Executive (full system access)
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.CYCLE_COUNT,
    Permission.VIEW_PRODUCTION,
    Permission.CREATE_PRODUCTION_ORDER,
    Permission.EDIT_PRODUCTION_ORDER,
    Permission.COMPLETE_PRODUCTION_JOB,
    Permission.VIEW_JOB_CARD,
    Permission.VIEW_PURCHASING,
    Permission.CREATE_PURCHASE_ORDER,
    Permission.APPROVE_PURCHASE_ORDER,
    Permission.RECEIVE_GOODS,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES_ORDER,
    Permission.EDIT_SALES_ORDER,
    Permission.MANAGE_CUSTOMERS,
    Permission.CREATE_SHIPMENT,
    Permission.VIEW_SALES_ANALYTICS,
    Permission.VIEW_QUALITY,
    Permission.PERFORM_INSPECTION,
    Permission.CREATE_NCR,
    Permission.MANAGE_QUALITY_PLANS,
    Permission.VIEW_BOM,
    Permission.CREATE_BOM,
    Permission.EDIT_BOM,
    Permission.APPROVE_BOM,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_FACILITIES,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.USE_MOBILE_APP,
  ],

  // VIEWER: Read-only access
  [Role.Viewer]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_PRODUCTION,
    Permission.VIEW_PURCHASING,
    Permission.VIEW_SALES,
    Permission.VIEW_QUALITY,
    Permission.VIEW_BOM,
    Permission.VIEW_REPORTS,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(userRole, p));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(userRole, p));
}

/**
 * Get role tier level (1-5)
 */
export function getRoleTier(role: Role): number {
  const tierMap: Record<Role, number> = {
    [Role.Operator]: 1,
    [Role.Supervisor]: 2,
    [Role.Inventory]: 2,
    [Role.Purchasing]: 2,
    [Role.Maintenance]: 2,
    [Role.QC]: 2,
    [Role.Sales]: 3,
    [Role.Engineering]: 4,
    [Role.Executive]: 5,
    [Role.Admin]: 5,
    [Role.Viewer]: 0,
  };
  return tierMap[role] || 0;
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    [Role.Operator]: 'Operator',
    [Role.Supervisor]: 'Supervisor',
    [Role.Inventory]: 'Inventory Manager',
    [Role.Purchasing]: 'Purchasing',
    [Role.Maintenance]: 'Maintenance',
    [Role.QC]: 'Quality Control',
    [Role.Sales]: 'Sales',
    [Role.Engineering]: 'Engineering',
    [Role.Executive]: 'Executive',
    [Role.Admin]: 'Administrator',
    [Role.Viewer]: 'Viewer',
  };
  return displayNames[role] || role;
}

/**
 * Check if role can access a specific department/area
 */
export function canAccessDepartment(role: Role, department: string): boolean {
  // Sales can ONLY access Sales Pit
  if (role === Role.Sales) {
    return department.toLowerCase().includes('sales');
  }

  // Operators are department-restricted (checked separately via assignedDepartments)
  if (role === Role.Operator) {
    return false; // Requires assignedDepartments check
  }

  // Management roles have broader access
  if (role === Role.Inventory) {
    return ['inventory', 'receiving', 'shipping', 'warehouse'].some((d) =>
      department.toLowerCase().includes(d)
    );
  }

  if (role === Role.Purchasing) {
    return ['purchasing', 'receiving'].some((d) => department.toLowerCase().includes(d));
  }

  if (role === Role.QC) {
    return ['quality', 'qc', 'inspection', 'production'].some((d) =>
      department.toLowerCase().includes(d)
    );
  }

  // Executive and Admin have full access
  if (role === Role.Executive || role === Role.Admin) {
    return true;
  }

  return true; // Default: allow access for other management roles
}
