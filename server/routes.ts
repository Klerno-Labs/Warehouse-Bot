import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { loginSchema } from "@shared/validation";
import {
  createInventoryEventSchema,
  createItemSchema,
  createLocationSchema,
  createReasonCodeSchema,
  updateItemSchema,
  updateLocationSchema,
  updateReasonCodeSchema,
} from "@shared/inventory";
import { z } from "zod";
import { applyInventoryEvent, convertQuantity, InventoryError } from "./inventory";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Middleware to check role
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Helper to create audit events
async function audit(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  ipAddress?: string
) {
  await storage.createAuditEvent({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress: ipAddress || null,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "warehouse-core-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // ============ Auth Routes ============

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(credentials.email);
      if (!user || !bcrypt.compareSync(credentials.password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      req.session.userId = user.id;
      
      const sessionUser = await storage.getSessionUser(user.id);
      const sites = await storage.getSitesForUser(user.id);

      await audit(
        user.tenantId,
        user.id,
        "LOGIN",
        "Session",
        null,
        "User logged in successfully",
        req.ip
      );

      res.json({ user: sessionUser, sites });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const user = userId ? await storage.getUser(userId) : null;
    
    if (user) {
      await audit(
        user.tenantId,
        user.id,
        "LOGOUT",
        "Session",
        null,
        "User logged out",
        req.ip
      );
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sessionUser = await storage.getSessionUser(req.session.userId);
    if (!sessionUser) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    const sites = await storage.getSitesForUser(req.session.userId);
    res.json({ user: sessionUser, sites });
  });

  // ============ Tenant Routes ============

  // Get enabled modules for current tenant
  app.get("/api/tenant/modules", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json({ enabledModules: tenant.enabledModules });
  });

  // Update tenant modules (Admin only)
  app.patch("/api/tenant/modules", requireRole("Admin"), async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { enabledModules } = req.body;
    if (!Array.isArray(enabledModules)) {
      return res.status(400).json({ error: "enabledModules must be an array" });
    }

    const tenant = await storage.updateTenant(user.tenantId, { enabledModules });
    
    await audit(
      user.tenantId,
      user.id,
      "UPDATE",
      "Tenant",
      user.tenantId,
      `Updated enabled modules: ${enabledModules.join(", ")}`,
      req.ip
    );

    res.json({ enabledModules: tenant?.enabledModules });
  });

  // ============ Users Routes ============

  // Get all users for tenant
  app.get("/api/users", requireRole("Admin", "Supervisor"), async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const users = await storage.getUsersByTenant(user.tenantId);
    
    // Remove passwords from response
    const sanitizedUsers = users.map(({ password, ...u }) => u);
    res.json(sanitizedUsers);
  });

  // Create user
  app.post("/api/users", requireRole("Admin"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const { email, password, firstName, lastName, role, siteIds } = req.body;
    
    // Check if email already exists
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await storage.createUser({
      tenantId: currentUser.tenantId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || "Viewer",
      siteIds: siteIds || [],
      isActive: true,
    });

    await audit(
      currentUser.tenantId,
      currentUser.id,
      "CREATE",
      "User",
      newUser.id,
      `Created user ${newUser.email}`,
      req.ip
    );

    const { password: _, ...sanitized } = newUser;
    res.status(201).json(sanitized);
  });

  // Update user
  app.patch("/api/users/:id", requireRole("Admin"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.tenantId;

    // Hash password if being updated
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await storage.updateUser(req.params.id, updates);
    
    await audit(
      currentUser.tenantId,
      currentUser.id,
      "UPDATE",
      "User",
      req.params.id,
      `Updated user ${targetUser.email}`,
      req.ip
    );

    if (updated) {
      const { password: _, ...sanitized } = updated;
      res.json(sanitized);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // ============ Sites Routes ============

  // Get sites for current user
  app.get("/api/sites", requireAuth, async (req, res) => {
    const sites = await storage.getSitesForUser(req.session.userId!);
    res.json(sites);
  });

  // ============ Facilities Routes ============

  // Get departments by site
  app.get("/api/sites/:siteId/departments", requireAuth, async (req, res) => {
    const departments = await storage.getDepartmentsBySite(req.params.siteId);
    res.json(departments);
  });

  // Get workcells by site
  app.get("/api/sites/:siteId/workcells", requireAuth, async (req, res) => {
    const workcells = await storage.getWorkcellsBySite(req.params.siteId);
    res.json(workcells);
  });

  // Get devices by site
  app.get("/api/sites/:siteId/devices", requireAuth, async (req, res) => {
    const devices = await storage.getDevicesBySite(req.params.siteId);
    res.json(devices);
  });

  // Create workcell
  app.post("/api/workcells", requireRole("Admin", "Supervisor"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const { siteId, departmentId, name, description, status } = req.body;
    
    const workcell = await storage.createWorkcell({
      tenantId: currentUser.tenantId,
      siteId,
      departmentId: departmentId || null,
      name,
      description: description || null,
      status: status || "active",
    });

    await audit(
      currentUser.tenantId,
      currentUser.id,
      "CREATE",
      "Workcell",
      workcell.id,
      `Created workcell ${workcell.name}`,
      req.ip
    );

    res.status(201).json(workcell);
  });

  // Update workcell
  app.patch("/api/workcells/:id", requireRole("Admin", "Supervisor"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const workcell = await storage.getWorkcell(req.params.id);
    if (!workcell || workcell.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: "Workcell not found" });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.tenantId;

    const updated = await storage.updateWorkcell(req.params.id, updates);
    
    await audit(
      currentUser.tenantId,
      currentUser.id,
      "UPDATE",
      "Workcell",
      req.params.id,
      `Updated workcell ${workcell.name}`,
      req.ip
    );

    res.json(updated);
  });

  // Create device
  app.post("/api/devices", requireRole("Admin", "Supervisor", "Maintenance"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const { siteId, workcellId, name, type, serialNumber, status } = req.body;
    
    const device = await storage.createDevice({
      tenantId: currentUser.tenantId,
      siteId,
      workcellId: workcellId || null,
      name,
      type,
      serialNumber: serialNumber || null,
      status: status || "online",
    });

    await audit(
      currentUser.tenantId,
      currentUser.id,
      "CREATE",
      "Device",
      device.id,
      `Created device ${device.name}`,
      req.ip
    );

    res.status(201).json(device);
  });

  // ============ Audit Routes ============

  // Get audit events
  app.get("/api/audit", requireRole("Admin", "Supervisor"), async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const events = await storage.getAuditEvents(currentUser.tenantId, limit);
    res.json(events);
  });

  // ============ Inventory Routes ============

  app.get("/api/inventory/items", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "User not found" });
    const items = await storage.getItemsByTenant(user.tenantId);
    res.json(items);
  });

  app.post(
    "/api/inventory/items",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const payload = createItemSchema.parse(req.body);
        const existing = await storage.getItemBySku(user.tenantId, payload.sku);
        if (existing) {
          return res.status(409).json({ error: "SKU already exists" });
        }
        const item = await storage.createItem({
          tenantId: user.tenantId,
          ...payload,
          description: payload.description || null,
          minQtyBase: payload.minQtyBase ?? null,
          maxQtyBase: payload.maxQtyBase ?? null,
          reorderPointBase: payload.reorderPointBase ?? null,
          leadTimeDays: payload.leadTimeDays ?? null,
        });
        res.status(201).json(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/inventory/items/:id",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const item = await storage.getItemById(req.params.id);
        if (!item || item.tenantId !== user.tenantId) {
          return res.status(404).json({ error: "Item not found" });
        }
        const payload = updateItemSchema.parse(req.body);
        if (payload.sku) {
          const existing = await storage.getItemBySku(user.tenantId, payload.sku);
          if (existing && existing.id !== item.id) {
            return res.status(409).json({ error: "SKU already exists" });
          }
        }
        const updated = await storage.updateItem(item.id, payload);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get("/api/inventory/locations", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "User not found" });
    const siteId = (req.query.siteId as string) || user.siteIds[0];
    const locations = await storage.getLocationsBySite(siteId);
    res.json(locations.filter((l) => l.tenantId === user.tenantId));
  });

  app.post(
    "/api/inventory/locations",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const payload = createLocationSchema.parse(req.body);
        if (!user.siteIds.includes(payload.siteId)) {
          return res.status(403).json({ error: "Site access denied" });
        }
        const existing = await storage.getLocationByLabel(payload.siteId, payload.label);
        if (existing) {
          return res.status(409).json({ error: "Location label already exists" });
        }
        const location = await storage.createLocation({
          tenantId: user.tenantId,
          ...payload,
          zone: payload.zone || null,
          bin: payload.bin || null,
          type: payload.type || null,
        });
        res.status(201).json(location);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/inventory/locations/:id",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const location = await storage.getLocationById(req.params.id);
        if (!location || location.tenantId !== user.tenantId) {
          return res.status(404).json({ error: "Location not found" });
        }
        const payload = updateLocationSchema.parse(req.body);
        const updated = await storage.updateLocation(location.id, payload);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get("/api/inventory/reason-codes", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "User not found" });
    const reasonCodes = await storage.getReasonCodesByTenant(user.tenantId);
    res.json(reasonCodes);
  });

  app.post(
    "/api/inventory/reason-codes",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const payload = createReasonCodeSchema.parse(req.body);
        const reasonCode = await storage.createReasonCode({
          tenantId: user.tenantId,
          ...payload,
          description: payload.description || null,
        });
        res.status(201).json(reasonCode);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/inventory/reason-codes/:id",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      try {
        const user = await storage.getUser(req.session.userId!);
        if (!user) return res.status(401).json({ error: "User not found" });
        const reason = await storage.getReasonCodeById(req.params.id);
        if (!reason || reason.tenantId !== user.tenantId) {
          return res.status(404).json({ error: "Reason code not found" });
        }
        const payload = updateReasonCodeSchema.parse(req.body);
        const updated = await storage.updateReasonCode(reason.id, payload);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/inventory/events",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });
      const siteId = req.query.siteId as string | undefined;
      if (siteId && !user.siteIds.includes(siteId)) {
        return res.status(403).json({ error: "Site access denied" });
      }
      const events = await storage.getInventoryEventsByTenant(user.tenantId);
      const filtered = siteId ? events.filter((e) => e.siteId === siteId) : events;
      res.json(filtered);
    },
  );

  app.post("/api/inventory/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });
      const sessionUser = await storage.getSessionUser(user.id);
      if (!sessionUser) return res.status(401).json({ error: "User not found" });
      const payload = createInventoryEventSchema.parse(req.body);
      if (!user.siteIds.includes(payload.siteId)) {
        return res.status(403).json({ error: "Site access denied" });
      }

      const eventType = payload.eventType;
      if (eventType === "ADJUST" && !["Admin", "Supervisor"].includes(user.role)) {
        return res.status(403).json({ error: "Permission denied" });
      }
      if (eventType === "COUNT" && !["Admin", "Supervisor", "Inventory"].includes(user.role)) {
        return res.status(403).json({ error: "Permission denied" });
      }

      const item = await storage.getItemById(payload.itemId);
      if (!item || item.tenantId !== user.tenantId) {
        return res.status(404).json({ error: "Item not found" });
      }

      const validateLocation = async (locationId?: string | null) => {
        if (!locationId) return null;
        const location = await storage.getLocationById(locationId);
        if (!location || location.tenantId !== user.tenantId) {
          return { error: "Location not found" };
        }
        if (location.siteId !== payload.siteId) {
          return { error: "Location site mismatch" };
        }
        return null;
      };

      const fromLocationError = await validateLocation(payload.fromLocationId);
      if (fromLocationError) {
        return res.status(400).json({ error: fromLocationError.error });
      }

      const toLocationError = await validateLocation(payload.toLocationId);
      if (toLocationError) {
        return res.status(400).json({ error: toLocationError.error });
      }

      if (payload.reasonCodeId) {
        const reasonCode = await storage.getReasonCodeById(payload.reasonCodeId);
        if (!reasonCode || reasonCode.tenantId !== user.tenantId) {
          return res.status(404).json({ error: "Reason code not found" });
        }
        const reasonMatch = reasonCode.type === eventType;
        if (["SCRAP", "ADJUST", "HOLD"].includes(eventType) && !reasonMatch) {
          return res.status(400).json({ error: "Reason code type mismatch" });
        }
      }

      const { qtyBase } = await convertQuantity(
        storage,
        user.tenantId,
        payload.itemId,
        payload.qtyEntered,
        payload.uomEntered,
      );

      const created = await applyInventoryEvent(storage, sessionUser, {
        tenantId: user.tenantId,
        siteId: payload.siteId,
        eventType: payload.eventType,
        itemId: payload.itemId,
        qtyEntered: payload.qtyEntered,
        uomEntered: payload.uomEntered,
        qtyBase,
        fromLocationId: payload.fromLocationId || null,
        toLocationId: payload.toLocationId || null,
        workcellId: payload.workcellId || null,
        referenceId: payload.referenceId || null,
        reasonCodeId: payload.reasonCodeId || null,
        notes: payload.notes || null,
        createdByUserId: user.id,
        deviceId: payload.deviceId || null,
      });

      res.status(201).json(created);
    } catch (error) {
      if (error instanceof InventoryError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get(
    "/api/inventory/balances",
    requireRole("Admin", "Supervisor", "Inventory"),
    async (req, res) => {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });
      const siteId = (req.query.siteId as string) || user.siteIds[0];
      const balances = await storage.getInventoryBalancesBySite(siteId);
      res.json(balances.filter((b) => b.tenantId === user.tenantId));
    },
  );

  return httpServer;
}
