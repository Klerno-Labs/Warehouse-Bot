import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";
import { z } from "zod";

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

  return httpServer;
}
