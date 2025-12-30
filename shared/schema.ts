import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles available in the system
export const ROLES = [
  "Admin",
  "Supervisor",
  "Inventory",
  "Operator",
  "Sales",
  "Purchasing",
  "Maintenance",
  "QC",
  "Viewer",
] as const;

export type Role = (typeof ROLES)[number];

// Module definitions
export const MODULES = [
  { id: "inventory", name: "Inventory", icon: "Package" },
  { id: "jobs", name: "Jobs", icon: "Briefcase" },
  { id: "purchasing", name: "Purchasing", icon: "ShoppingCart" },
  { id: "cycle-counts", name: "Cycle Counts", icon: "RefreshCw" },
  { id: "maintenance", name: "Maintenance", icon: "Wrench" },
  { id: "sales-atp", name: "Sales ATP", icon: "TrendingUp" },
  { id: "dashboards", name: "Dashboards", icon: "LayoutDashboard" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

// Tenants table
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  enabledModules: text("enabled_modules").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Sites table
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
});

export const insertSiteSchema = createInsertSchema(sites).omit({ id: true });
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  siteId: varchar("site_id").notNull(),
  name: text("name").notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Workcells table
export const workcells = pgTable("workcells", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  siteId: varchar("site_id").notNull(),
  departmentId: varchar("department_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
});

export const insertWorkcellSchema = createInsertSchema(workcells).omit({ id: true });
export type InsertWorkcell = z.infer<typeof insertWorkcellSchema>;
export type Workcell = typeof workcells.$inferSelect;

// Devices table
export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  siteId: varchar("site_id").notNull(),
  workcellId: varchar("workcell_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  serialNumber: text("serial_number"),
  status: text("status").notNull().default("online"),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("Viewer"),
  siteIds: text("site_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Badges table (for operator identification)
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  badgeNumber: text("badge_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// Audit Events table (append-only)
export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({ id: true, timestamp: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEvents.$inferSelect;

// Login schema for form validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Session user type (returned after login)
export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  siteIds: string[];
};

// Tenant with sites for selection
export type TenantWithSites = Tenant & {
  sites: Site[];
};
