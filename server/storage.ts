import {
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Site,
  type InsertSite,
  type Department,
  type InsertDepartment,
  type Workcell,
  type InsertWorkcell,
  type Device,
  type InsertDevice,
  type Badge,
  type InsertBadge,
  type AuditEvent,
  type InsertAuditEvent,
  type SessionUser,
  type TenantWithSites,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined>;
  getTenantsForUser(userId: string): Promise<TenantWithSites[]>;

  // Sites
  getSite(id: string): Promise<Site | undefined>;
  getSitesByTenant(tenantId: string): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, updates: Partial<Site>): Promise<Site | undefined>;

  // Departments
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentsBySite(siteId: string): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Workcells
  getWorkcell(id: string): Promise<Workcell | undefined>;
  getWorkcellsBySite(siteId: string): Promise<Workcell[]>;
  getWorkcellsByDepartment(departmentId: string): Promise<Workcell[]>;
  createWorkcell(workcell: InsertWorkcell): Promise<Workcell>;
  updateWorkcell(id: string, updates: Partial<Workcell>): Promise<Workcell | undefined>;

  // Devices
  getDevice(id: string): Promise<Device | undefined>;
  getDevicesByWorkcell(workcellId: string): Promise<Device[]>;
  getDevicesBySite(siteId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;

  // Badges
  getBadge(id: string): Promise<Badge | undefined>;
  getBadgeByNumber(badgeNumber: string, tenantId: string): Promise<Badge | undefined>;
  getBadgesByUser(userId: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;

  // Audit Events
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;
  getAuditEvents(tenantId: string, limit?: number): Promise<AuditEvent[]>;
  getAuditEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;

  // Session helpers
  getSessionUser(userId: string): Promise<SessionUser | null>;
  getSitesForUser(userId: string): Promise<Site[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private sites: Map<string, Site> = new Map();
  private departments: Map<string, Department> = new Map();
  private workcells: Map<string, Workcell> = new Map();
  private devices: Map<string, Device> = new Map();
  private badges: Map<string, Badge> = new Map();
  private auditEvents: Map<string, AuditEvent> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create tenant
    const tenantId = randomUUID();
    const tenant: Tenant = {
      id: tenantId,
      name: "Acme Warehouse",
      slug: "acme",
      enabledModules: [
        "inventory",
        "jobs",
        "purchasing",
        "cycle-counts",
        "maintenance",
        "sales-atp",
        "dashboards",
      ],
    };
    this.tenants.set(tenantId, tenant);

    // Create site
    const siteId = randomUUID();
    const site: Site = {
      id: siteId,
      tenantId,
      name: "Main Warehouse",
      address: "123 Industrial Way, City, ST 12345",
    };
    this.sites.set(siteId, site);

    // Create second site for demo
    const site2Id = randomUUID();
    const site2: Site = {
      id: site2Id,
      tenantId,
      name: "Distribution Center",
      address: "456 Logistics Blvd, City, ST 12345",
    };
    this.sites.set(site2Id, site2);

    // Create departments
    const departments = [
      { name: "Receiving", siteId },
      { name: "Stockroom/Kitting", siteId },
      { name: "Production", siteId },
      { name: "Packing/Shipping", siteId },
    ];

    const deptMap: Record<string, string> = {};
    departments.forEach((d) => {
      const id = randomUUID();
      const dept: Department = {
        id,
        tenantId,
        siteId: d.siteId,
        name: d.name,
      };
      this.departments.set(id, dept);
      deptMap[d.name] = id;
    });

    // Create workcells
    const workcellsData = [
      { name: "Receiving Dock 1", dept: "Receiving", description: "Primary receiving dock" },
      { name: "Receiving Dock 2", dept: "Receiving", description: "Secondary receiving dock" },
      { name: "Kitting Station A", dept: "Stockroom/Kitting", description: "Main kitting area" },
      { name: "Kitting Station B", dept: "Stockroom/Kitting", description: "Secondary kitting" },
      { name: "Pleater 1", dept: "Production", description: "Primary pleating machine" },
      { name: "Assembly Line 1", dept: "Production", description: "Main assembly line" },
      { name: "Packing Station 1", dept: "Packing/Shipping", description: "Primary packing" },
      { name: "Shipping Dock", dept: "Packing/Shipping", description: "Outbound shipping" },
    ];

    const workcellMap: Record<string, string> = {};
    workcellsData.forEach((w) => {
      const id = randomUUID();
      const workcell: Workcell = {
        id,
        tenantId,
        siteId,
        departmentId: deptMap[w.dept] || null,
        name: w.name,
        description: w.description,
        status: "active",
      };
      this.workcells.set(id, workcell);
      workcellMap[w.name] = id;
    });

    // Create devices
    const devicesData = [
      { name: "Scanner RD1-A", type: "barcode_scanner", workcell: "Receiving Dock 1" },
      { name: "Scale RD1-B", type: "scale", workcell: "Receiving Dock 1" },
      { name: "Scanner KIT-A1", type: "barcode_scanner", workcell: "Kitting Station A" },
      { name: "Printer KIT-A2", type: "label_printer", workcell: "Kitting Station A" },
      { name: "PLC Pleater 1", type: "plc", workcell: "Pleater 1" },
      { name: "HMI Pleater 1", type: "hmi", workcell: "Pleater 1" },
    ];

    devicesData.forEach((d) => {
      const id = randomUUID();
      const device: Device = {
        id,
        tenantId,
        siteId,
        workcellId: workcellMap[d.workcell] || null,
        name: d.name,
        type: d.type,
        serialNumber: `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: "online",
      };
      this.devices.set(id, device);
    });

    // Create admin user
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      tenantId,
      email: "admin@example.com",
      password: "password123", // In production, this would be hashed
      firstName: "John",
      lastName: "Admin",
      role: "Admin",
      siteIds: [siteId, site2Id],
      isActive: true,
    };
    this.users.set(adminId, adminUser);

    // Create additional sample users
    const sampleUsers = [
      { email: "sarah.j@example.com", firstName: "Sarah", lastName: "Johnson", role: "Supervisor" },
      { email: "mike.w@example.com", firstName: "Mike", lastName: "Wilson", role: "Inventory" },
      { email: "emily.d@example.com", firstName: "Emily", lastName: "Davis", role: "Operator" },
      { email: "tom.b@example.com", firstName: "Tom", lastName: "Brown", role: "Viewer" },
    ];

    sampleUsers.forEach((u) => {
      const id = randomUUID();
      const user: User = {
        id,
        tenantId,
        email: u.email,
        password: "password123",
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        siteIds: [siteId],
        isActive: true,
      };
      this.users.set(id, user);
    });

    // Create initial audit events
    const auditData = [
      { action: "CREATE", entityType: "Tenant", entityId: tenantId, details: "Initial tenant setup" },
      { action: "CREATE", entityType: "Site", entityId: siteId, details: "Main warehouse created" },
      { action: "CREATE", entityType: "User", entityId: adminId, details: "Admin user created" },
    ];

    auditData.forEach((a) => {
      const id = randomUUID();
      const event: AuditEvent = {
        id,
        tenantId,
        userId: adminId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        details: a.details,
        ipAddress: "127.0.0.1",
        timestamp: new Date(),
      };
      this.auditEvents.set(id, event);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.tenantId === tenantId);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find((t) => t.slug === slug);
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const tenant: Tenant = { ...insertTenant, id };
    this.tenants.set(id, tenant);
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    const updated = { ...tenant, ...updates };
    this.tenants.set(id, updated);
    return updated;
  }

  async getTenantsForUser(userId: string): Promise<TenantWithSites[]> {
    const user = this.users.get(userId);
    if (!user) return [];
    
    const tenant = this.tenants.get(user.tenantId);
    if (!tenant) return [];

    const sites = await this.getSitesForUser(userId);
    return [{ ...tenant, sites }];
  }

  // Sites
  async getSite(id: string): Promise<Site | undefined> {
    return this.sites.get(id);
  }

  async getSitesByTenant(tenantId: string): Promise<Site[]> {
    return Array.from(this.sites.values()).filter((s) => s.tenantId === tenantId);
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const id = randomUUID();
    const site: Site = { ...insertSite, id };
    this.sites.set(id, site);
    return site;
  }

  async updateSite(id: string, updates: Partial<Site>): Promise<Site | undefined> {
    const site = this.sites.get(id);
    if (!site) return undefined;
    const updated = { ...site, ...updates };
    this.sites.set(id, updated);
    return updated;
  }

  async getSitesForUser(userId: string): Promise<Site[]> {
    const user = this.users.get(userId);
    if (!user) return [];
    return Array.from(this.sites.values()).filter(
      (s) => s.tenantId === user.tenantId && user.siteIds.includes(s.id)
    );
  }

  // Departments
  async getDepartment(id: string): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartmentsBySite(siteId: string): Promise<Department[]> {
    return Array.from(this.departments.values()).filter((d) => d.siteId === siteId);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = randomUUID();
    const department: Department = { ...insertDepartment, id };
    this.departments.set(id, department);
    return department;
  }

  // Workcells
  async getWorkcell(id: string): Promise<Workcell | undefined> {
    return this.workcells.get(id);
  }

  async getWorkcellsBySite(siteId: string): Promise<Workcell[]> {
    return Array.from(this.workcells.values()).filter((w) => w.siteId === siteId);
  }

  async getWorkcellsByDepartment(departmentId: string): Promise<Workcell[]> {
    return Array.from(this.workcells.values()).filter((w) => w.departmentId === departmentId);
  }

  async createWorkcell(insertWorkcell: InsertWorkcell): Promise<Workcell> {
    const id = randomUUID();
    const workcell: Workcell = { ...insertWorkcell, id };
    this.workcells.set(id, workcell);
    return workcell;
  }

  async updateWorkcell(id: string, updates: Partial<Workcell>): Promise<Workcell | undefined> {
    const workcell = this.workcells.get(id);
    if (!workcell) return undefined;
    const updated = { ...workcell, ...updates };
    this.workcells.set(id, updated);
    return updated;
  }

  // Devices
  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDevicesByWorkcell(workcellId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((d) => d.workcellId === workcellId);
  }

  async getDevicesBySite(siteId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((d) => d.siteId === siteId);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = randomUUID();
    const device: Device = { ...insertDevice, id };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    const updated = { ...device, ...updates };
    this.devices.set(id, updated);
    return updated;
  }

  // Badges
  async getBadge(id: string): Promise<Badge | undefined> {
    return this.badges.get(id);
  }

  async getBadgeByNumber(badgeNumber: string, tenantId: string): Promise<Badge | undefined> {
    return Array.from(this.badges.values()).find(
      (b) => b.badgeNumber === badgeNumber && b.tenantId === tenantId
    );
  }

  async getBadgesByUser(userId: string): Promise<Badge[]> {
    return Array.from(this.badges.values()).filter((b) => b.userId === userId);
  }

  async createBadge(insertBadge: InsertBadge): Promise<Badge> {
    const id = randomUUID();
    const badge: Badge = { ...insertBadge, id };
    this.badges.set(id, badge);
    return badge;
  }

  // Audit Events
  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    const id = randomUUID();
    const event: AuditEvent = {
      ...insertEvent,
      id,
      timestamp: new Date(),
    };
    this.auditEvents.set(id, event);
    return event;
  }

  async getAuditEvents(tenantId: string, limit = 50): Promise<AuditEvent[]> {
    return Array.from(this.auditEvents.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getAuditEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return Array.from(this.auditEvents.values())
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Session helpers
  async getSessionUser(userId: string): Promise<SessionUser | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const tenant = this.tenants.get(user.tenantId);
    if (!tenant) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as SessionUser["role"],
      tenantId: user.tenantId,
      tenantName: tenant.name,
      siteIds: user.siteIds,
    };
  }
}

export const storage = new MemStorage();
