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
import {
  type Item,
  type Location,
  type ReasonCode,
  type InventoryEvent,
  type InventoryBalance,
} from "@shared/inventory";
import {
  type CycleCount,
  type CycleCountLine,
} from "@shared/cycle-counts";
import {
  type Job,
  type JobLine,
} from "@shared/jobs";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

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

  // Inventory Items
  getItemsByTenant(tenantId: string): Promise<Item[]>;
  getItemById(id: string): Promise<Item | undefined>;
  getItemBySku(tenantId: string, sku: string): Promise<Item | undefined>;
  createItem(item: Omit<Item, "id">): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined>;

  // Inventory Locations
  getLocationsBySite(siteId: string): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | undefined>;
  getLocationByLabel(siteId: string, label: string): Promise<Location | undefined>;
  createLocation(location: Omit<Location, "id">): Promise<Location>;
  updateLocation(id: string, updates: Partial<Location>): Promise<Location | undefined>;

  // Inventory Reason Codes
  getReasonCodesByTenant(tenantId: string): Promise<ReasonCode[]>;
  getReasonCodeById(id: string): Promise<ReasonCode | undefined>;
  createReasonCode(reasonCode: Omit<ReasonCode, "id">): Promise<ReasonCode>;
  updateReasonCode(id: string, updates: Partial<ReasonCode>): Promise<ReasonCode | undefined>;

  // Inventory Events + Balances
  createInventoryEvent(event: Omit<InventoryEvent, "id" | "createdAt">): Promise<InventoryEvent>;
  getInventoryEventsByTenant(tenantId: string): Promise<InventoryEvent[]>;
  getInventoryBalance(
    tenantId: string,
    siteId: string,
    itemId: string,
    locationId: string,
  ): Promise<InventoryBalance | undefined>;
  upsertInventoryBalance(
    balance: Omit<InventoryBalance, "id">,
  ): Promise<InventoryBalance>;
  getInventoryBalancesBySite(siteId: string): Promise<InventoryBalance[]>;

  // Cycle Counts
  getCycleCountsByTenant(tenantId: string): Promise<CycleCount[]>;
  getCycleCountsBySite(siteId: string): Promise<CycleCount[]>;
  getCycleCountById(id: string): Promise<CycleCount | undefined>;
  createCycleCount(cycleCount: Omit<CycleCount, "id" | "createdAt">): Promise<CycleCount>;
  updateCycleCount(id: string, updates: Partial<CycleCount>): Promise<CycleCount | undefined>;
  
  // Cycle Count Lines
  getCycleCountLinesByCycleCount(cycleCountId: string): Promise<CycleCountLine[]>;
  getCycleCountLineById(id: string): Promise<CycleCountLine | undefined>;
  createCycleCountLine(line: Omit<CycleCountLine, "id">): Promise<CycleCountLine>;
  updateCycleCountLine(id: string, updates: Partial<CycleCountLine>): Promise<CycleCountLine | undefined>;
  deleteCycleCountLinesByCycleCount(cycleCountId: string): Promise<void>;

  // Jobs
  getJobsByTenant(tenantId: string): Promise<Job[]>;
  getJobsBySite(siteId: string): Promise<Job[]>;
  getJobById(id: string): Promise<Job | undefined>;
  getJobByNumber(tenantId: string, jobNumber: string): Promise<Job | undefined>;
  createJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  getNextJobNumber(tenantId: string): Promise<string>;
  
  // Job Lines
  getJobLinesByJob(jobId: string): Promise<JobLine[]>;
  getJobLineById(id: string): Promise<JobLine | undefined>;
  createJobLine(line: Omit<JobLine, "id" | "createdAt" | "updatedAt">): Promise<JobLine>;
  updateJobLine(id: string, updates: Partial<JobLine>): Promise<JobLine | undefined>;
  deleteJobLinesByJob(jobId: string): Promise<void>;

  runTransaction<T>(fn: (tx: IStorage) => Promise<T>): Promise<T>;

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
  private items: Map<string, Item> = new Map();
  private cycleCounts: Map<string, CycleCount> = new Map();
  private cycleCountLines: Map<string, CycleCountLine> = new Map();
  private jobs: Map<string, Job> = new Map();
  private jobLines: Map<string, JobLine> = new Map();
  private jobCounter: number = 1000;
  private locations: Map<string, Location> = new Map();
  private reasonCodes: Map<string, ReasonCode> = new Map();
  private inventoryEvents: Map<string, InventoryEvent> = new Map();
  private inventoryBalances: Map<string, InventoryBalance> = new Map();

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

    // Seed inventory items
    const itemsData: Omit<Item, "id">[] = [
      {
        tenantId,
        sku: "PAPER-MEDIA",
        name: "Paper Media",
        description: "Pleater paper rolls",
        category: "PRODUCTION",
        baseUom: "FT",
        allowedUoms: [
          { uom: "FT", toBase: 1 },
          { uom: "YD", toBase: 3 },
          { uom: "ROLL", toBase: 100 },
        ],
        minQtyBase: null,
        maxQtyBase: null,
        reorderPointBase: null,
        leadTimeDays: null,
      },
      {
        tenantId,
        sku: "CAPS",
        name: "Caps",
        description: "End caps",
        category: "PACKAGING",
        baseUom: "EA",
        allowedUoms: [{ uom: "EA", toBase: 1 }],
        minQtyBase: null,
        maxQtyBase: null,
        reorderPointBase: null,
        leadTimeDays: null,
      },
      {
        tenantId,
        sku: "CORE-MAT",
        name: "Core Material",
        description: "Core material",
        category: "PRODUCTION",
        baseUom: "FT",
        allowedUoms: [{ uom: "FT", toBase: 1 }],
        minQtyBase: null,
        maxQtyBase: null,
        reorderPointBase: null,
        leadTimeDays: null,
      },
    ];

    itemsData.forEach((item) => {
      const id = randomUUID();
      this.items.set(id, { ...item, id });
    });

    // Seed inventory locations
    const locationsData: Omit<Location, "id">[] = [
      {
        tenantId,
        siteId,
        zone: "RECEIVING",
        bin: "01",
        label: "RECEIVING-01",
        type: "RECEIVING",
      },
      {
        tenantId,
        siteId,
        zone: "STOCK",
        bin: "A1",
        label: "STOCK-A1",
        type: "STOCK",
      },
      {
        tenantId,
        siteId,
        zone: "PLEATER",
        bin: "STAGE",
        label: "PLEATER-STAGE",
        type: "WIP",
      },
    ];

    locationsData.forEach((location) => {
      const id = randomUUID();
      this.locations.set(id, { ...location, id });
    });

    // Seed reason codes
    const reasonCodesData: Omit<ReasonCode, "id">[] = [
      { tenantId, type: "SCRAP", code: "SCRAP-DAMAGE", description: "Damaged material" },
      { tenantId, type: "ADJUST", code: "ADJUST-AUDIT", description: "Audit correction" },
      { tenantId, type: "HOLD", code: "HOLD-QC", description: "QC hold" },
    ];

    reasonCodesData.forEach((reason) => {
      const id = randomUUID();
      this.reasonCodes.set(id, { ...reason, id });
    });

    // Create admin user with hashed password
    const hashedPassword = bcrypt.hashSync("password123", 10);
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      tenantId,
      email: "admin@example.com",
      password: hashedPassword,
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
        password: hashedPassword,
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
    const user: User = {
      id,
      tenantId: insertUser.tenantId,
      email: insertUser.email,
      password: insertUser.password,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      role: insertUser.role || "Viewer",
      siteIds: insertUser.siteIds || [],
      isActive: insertUser.isActive ?? true,
    };
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
    const tenant: Tenant = {
      id,
      name: insertTenant.name,
      slug: insertTenant.slug,
      enabledModules: insertTenant.enabledModules || [],
    };
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
    const site: Site = {
      id,
      tenantId: insertSite.tenantId,
      name: insertSite.name,
      address: insertSite.address ?? null,
    };
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
    const workcell: Workcell = {
      id,
      tenantId: insertWorkcell.tenantId,
      siteId: insertWorkcell.siteId,
      departmentId: insertWorkcell.departmentId || null,
      name: insertWorkcell.name,
      description: insertWorkcell.description || null,
      status: insertWorkcell.status || "active",
    };
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
    const device: Device = {
      id,
      tenantId: insertDevice.tenantId,
      siteId: insertDevice.siteId,
      workcellId: insertDevice.workcellId || null,
      name: insertDevice.name,
      type: insertDevice.type,
      serialNumber: insertDevice.serialNumber || null,
      status: insertDevice.status || "online",
    };
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
    const badge: Badge = {
      id,
      tenantId: insertBadge.tenantId,
      userId: insertBadge.userId,
      badgeNumber: insertBadge.badgeNumber,
      isActive: insertBadge.isActive ?? true,
    };
    this.badges.set(id, badge);
    return badge;
  }

  // Audit Events
  async createAuditEvent(insertEvent: InsertAuditEvent): Promise<AuditEvent> {
    const id = randomUUID();
    const event: AuditEvent = {
      id,
      tenantId: insertEvent.tenantId,
      userId: insertEvent.userId ?? null,
      action: insertEvent.action,
      entityType: insertEvent.entityType,
      entityId: insertEvent.entityId ?? null,
      details: insertEvent.details ?? null,
      ipAddress: insertEvent.ipAddress ?? null,
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

  // Inventory Items
  async getItemsByTenant(tenantId: string): Promise<Item[]> {
    return Array.from(this.items.values()).filter((i) => i.tenantId === tenantId);
  }

  async getItemById(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItemBySku(tenantId: string, sku: string): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(
      (i) => i.tenantId === tenantId && i.sku.toLowerCase() === sku.toLowerCase(),
    );
  }

  async createItem(item: Omit<Item, "id">): Promise<Item> {
    const id = randomUUID();
    const created: Item = { ...item, id };
    this.items.set(id, created);
    return created;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.items.set(id, updated);
    return updated;
  }

  // Inventory Locations
  async getLocationsBySite(siteId: string): Promise<Location[]> {
    return Array.from(this.locations.values()).filter((l) => l.siteId === siteId);
  }

  async getLocationById(id: string): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getLocationByLabel(siteId: string, label: string): Promise<Location | undefined> {
    return Array.from(this.locations.values()).find(
      (l) => l.siteId === siteId && l.label.toLowerCase() === label.toLowerCase(),
    );
  }

  async createLocation(location: Omit<Location, "id">): Promise<Location> {
    const id = randomUUID();
    const created: Location = { ...location, id };
    this.locations.set(id, created);
    return created;
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    const updated = { ...location, ...updates };
    this.locations.set(id, updated);
    return updated;
  }

  // Inventory Reason Codes
  async getReasonCodesByTenant(tenantId: string): Promise<ReasonCode[]> {
    return Array.from(this.reasonCodes.values()).filter((r) => r.tenantId === tenantId);
  }

  async getReasonCodeById(id: string): Promise<ReasonCode | undefined> {
    return this.reasonCodes.get(id);
  }

  async createReasonCode(reasonCode: Omit<ReasonCode, "id">): Promise<ReasonCode> {
    const id = randomUUID();
    const created: ReasonCode = { ...reasonCode, id };
    this.reasonCodes.set(id, created);
    return created;
  }

  async updateReasonCode(id: string, updates: Partial<ReasonCode>): Promise<ReasonCode | undefined> {
    const reasonCode = this.reasonCodes.get(id);
    if (!reasonCode) return undefined;
    const updated = { ...reasonCode, ...updates };
    this.reasonCodes.set(id, updated);
    return updated;
  }

  // Inventory Events + Balances
  async createInventoryEvent(
    event: Omit<InventoryEvent, "id" | "createdAt">,
  ): Promise<InventoryEvent> {
    const id = randomUUID();
    const created: InventoryEvent = { ...event, id, createdAt: new Date() };
    this.inventoryEvents.set(id, created);
    return created;
  }

  async getInventoryEventsByTenant(tenantId: string): Promise<InventoryEvent[]> {
    return Array.from(this.inventoryEvents.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getInventoryBalance(
    tenantId: string,
    siteId: string,
    itemId: string,
    locationId: string,
  ): Promise<InventoryBalance | undefined> {
    const key = `${tenantId}|${siteId}|${itemId}|${locationId}`;
    return this.inventoryBalances.get(key);
  }

  async upsertInventoryBalance(
    balance: Omit<InventoryBalance, "id">,
  ): Promise<InventoryBalance> {
    const key = `${balance.tenantId}|${balance.siteId}|${balance.itemId}|${balance.locationId}`;
    const existing = this.inventoryBalances.get(key);
    const created: InventoryBalance = {
      id: existing?.id || randomUUID(),
      ...balance,
    };
    this.inventoryBalances.set(key, created);
    return created;
  }

  async getInventoryBalancesBySite(siteId: string): Promise<InventoryBalance[]> {
    return Array.from(this.inventoryBalances.values()).filter((b) => b.siteId === siteId);
  }

  // Cycle Counts
  async getCycleCountsByTenant(tenantId: string): Promise<CycleCount[]> {
    return Array.from(this.cycleCounts.values())
      .filter((c) => c.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCycleCountsBySite(siteId: string): Promise<CycleCount[]> {
    return Array.from(this.cycleCounts.values())
      .filter((c) => c.siteId === siteId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCycleCountById(id: string): Promise<CycleCount | undefined> {
    return this.cycleCounts.get(id);
  }

  async createCycleCount(cycleCount: Omit<CycleCount, "id" | "createdAt">): Promise<CycleCount> {
    const id = randomUUID();
    const created: CycleCount = { ...cycleCount, id, createdAt: new Date() };
    this.cycleCounts.set(id, created);
    return created;
  }

  async updateCycleCount(id: string, updates: Partial<CycleCount>): Promise<CycleCount | undefined> {
    const existing = this.cycleCounts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.cycleCounts.set(id, updated);
    return updated;
  }

  // Cycle Count Lines
  async getCycleCountLinesByCycleCount(cycleCountId: string): Promise<CycleCountLine[]> {
    return Array.from(this.cycleCountLines.values())
      .filter((l) => l.cycleCountId === cycleCountId);
  }

  async getCycleCountLineById(id: string): Promise<CycleCountLine | undefined> {
    return this.cycleCountLines.get(id);
  }

  async createCycleCountLine(line: Omit<CycleCountLine, "id">): Promise<CycleCountLine> {
    const id = randomUUID();
    const created: CycleCountLine = { ...line, id };
    this.cycleCountLines.set(id, created);
    return created;
  }

  async updateCycleCountLine(id: string, updates: Partial<CycleCountLine>): Promise<CycleCountLine | undefined> {
    const existing = this.cycleCountLines.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.cycleCountLines.set(id, updated);
    return updated;
  }

  async deleteCycleCountLinesByCycleCount(cycleCountId: string): Promise<void> {
    for (const [id, line] of this.cycleCountLines.entries()) {
      if (line.cycleCountId === cycleCountId) {
        this.cycleCountLines.delete(id);
      }
    }
  }

  // Jobs
  async getJobsByTenant(tenantId: string): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getJobsBySite(siteId: string): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.siteId === siteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobByNumber(tenantId: string, jobNumber: string): Promise<Job | undefined> {
    return Array.from(this.jobs.values())
      .find((j) => j.tenantId === tenantId && j.jobNumber === jobNumber);
  }

  async createJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const created: Job = { ...job, id, createdAt: now, updatedAt: now };
    this.jobs.set(id, created);
    return created;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }

  async getNextJobNumber(tenantId: string): Promise<string> {
    this.jobCounter += 1;
    return `JOB-${String(this.jobCounter).padStart(6, "0")}`;
  }

  // Job Lines
  async getJobLinesByJob(jobId: string): Promise<JobLine[]> {
    return Array.from(this.jobLines.values())
      .filter((l) => l.jobId === jobId)
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }

  async getJobLineById(id: string): Promise<JobLine | undefined> {
    return this.jobLines.get(id);
  }

  async createJobLine(line: Omit<JobLine, "id" | "createdAt" | "updatedAt">): Promise<JobLine> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const created: JobLine = { ...line, id, createdAt: now, updatedAt: now };
    this.jobLines.set(id, created);
    return created;
  }

  async updateJobLine(id: string, updates: Partial<JobLine>): Promise<JobLine | undefined> {
    const existing = this.jobLines.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.jobLines.set(id, updated);
    return updated;
  }

  async deleteJobLinesByJob(jobId: string): Promise<void> {
    for (const [id, line] of this.jobLines.entries()) {
      if (line.jobId === jobId) {
        this.jobLines.delete(id);
      }
    }
  }

  async runTransaction<T>(fn: (tx: IStorage) => Promise<T>): Promise<T> {
    return fn(this);
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


export const storage: IStorage = new MemStorage();
