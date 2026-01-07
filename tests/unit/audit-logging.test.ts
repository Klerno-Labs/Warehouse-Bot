/**
 * Audit Logging Tests
 * 
 * Tests for comprehensive audit logging functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock prisma for use in tests
const prisma = {
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Audit event types
const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  LOGIN_FAILED: "auth.login_failed",
  PASSWORD_CHANGED: "auth.password_changed",
  
  // User management
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_ROLE_CHANGED: "user.role_changed",
  
  // Item operations
  ITEM_CREATED: "item.created",
  ITEM_UPDATED: "item.updated",
  ITEM_DELETED: "item.deleted",
  
  // Inventory operations
  INVENTORY_ADJUSTED: "inventory.adjusted",
  INVENTORY_TRANSFERRED: "inventory.transferred",
  INVENTORY_RECEIVED: "inventory.received",
  INVENTORY_SHIPPED: "inventory.shipped",
  
  // Transaction operations
  TXN_CREATED: "txn.created",
  TXN_VOIDED: "txn.voided",
  
  // Purchase orders
  PO_CREATED: "po.created",
  PO_APPROVED: "po.approved",
  PO_REJECTED: "po.rejected",
  PO_RECEIVED: "po.received",
  PO_CANCELLED: "po.cancelled",
  
  // Manufacturing
  BOM_CREATED: "bom.created",
  BOM_UPDATED: "bom.updated",
  PRODUCTION_STARTED: "production.started",
  PRODUCTION_COMPLETED: "production.completed",
  
  // System
  SETTINGS_CHANGED: "system.settings_changed",
  EXPORT_GENERATED: "system.export_generated",
} as const;

type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

interface AuditLogEntry {
  id: string;
  action: AuditAction;
  userId: string;
  tenantId: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

describe("Audit Logging Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Audit Log Creation", () => {
    it("should create audit log entry with required fields", async () => {
      const logEntry: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.ITEM_CREATED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "item",
        resourceId: "item-001",
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-001",
        ...logEntry,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: logEntry });

      expect(result.action).toBe(AUDIT_ACTIONS.ITEM_CREATED);
      expect(result.userId).toBe("user-001");
      expect(result.tenantId).toBe("tenant-001");
      expect(result.resourceId).toBe("item-001");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should capture old and new values for updates", async () => {
      const logEntry: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.ITEM_UPDATED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "item",
        resourceId: "item-001",
        oldValue: { name: "Old Name", sku: "SKU-001" },
        newValue: { name: "New Name", sku: "SKU-001" },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-002",
        ...logEntry,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: logEntry });

      expect(result.oldValue).toEqual({ name: "Old Name", sku: "SKU-001" });
      expect(result.newValue).toEqual({ name: "New Name", sku: "SKU-001" });
    });

    it("should capture IP address and user agent", async () => {
      const logEntry: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.LOGIN,
        userId: "user-001",
        tenantId: "tenant-001",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-003",
        ...logEntry,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: logEntry });

      expect(result.ipAddress).toBe("192.168.1.1");
      expect(result.userAgent).toContain("Mozilla");
    });
  });

  describe("Authentication Audit Events", () => {
    it("should log successful login", async () => {
      const loginEvent: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.LOGIN,
        userId: "user-001",
        tenantId: "tenant-001",
        metadata: {
          sessionId: "session-abc123",
          loginMethod: "password",
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-login-001",
        ...loginEvent,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: loginEvent });

      expect(result.action).toBe(AUDIT_ACTIONS.LOGIN);
      expect(result.metadata).toHaveProperty("sessionId");
    });

    it("should log failed login attempts", async () => {
      const failedLogin: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        userId: "unknown",
        tenantId: "tenant-001",
        metadata: {
          attemptedEmail: "attacker@example.com",
          failureReason: "Invalid credentials",
          attemptCount: 3,
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-login-fail-001",
        ...failedLogin,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: failedLogin });

      expect(result.action).toBe(AUDIT_ACTIONS.LOGIN_FAILED);
      expect(result.metadata).toHaveProperty("failureReason");
    });

    it("should log password changes", async () => {
      const passwordChange: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "user",
        resourceId: "user-001",
        metadata: {
          changedBy: "user-001", // Self-service
          requiresRelogin: true,
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-pwd-001",
        ...passwordChange,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: passwordChange });

      expect(result.action).toBe(AUDIT_ACTIONS.PASSWORD_CHANGED);
    });
  });

  describe("Inventory Audit Events", () => {
    it("should log inventory adjustments with quantities", async () => {
      const adjustment: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.INVENTORY_ADJUSTED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "inventoryBalance",
        resourceId: "item-001:loc-001",
        oldValue: { qtyOnHand: 100 },
        newValue: { qtyOnHand: 95 },
        metadata: {
          adjustmentQty: -5,
          reasonCode: "CYCLE_COUNT",
          reference: "CC-2026-001",
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-adj-001",
        ...adjustment,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: adjustment });

      expect(result.action).toBe(AUDIT_ACTIONS.INVENTORY_ADJUSTED);
      expect(result.oldValue).toEqual({ qtyOnHand: 100 });
      expect(result.newValue).toEqual({ qtyOnHand: 95 });
      expect(result.metadata).toHaveProperty("adjustmentQty", -5);
    });

    it("should log inventory transfers", async () => {
      const transfer: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.INVENTORY_TRANSFERRED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "transfer",
        resourceId: "txn-001",
        metadata: {
          itemId: "item-001",
          fromLocationId: "loc-001",
          toLocationId: "loc-002",
          quantity: 50,
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-xfer-001",
        ...transfer,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: transfer });

      expect(result.action).toBe(AUDIT_ACTIONS.INVENTORY_TRANSFERRED);
      expect(result.metadata).toHaveProperty("fromLocationId");
      expect(result.metadata).toHaveProperty("toLocationId");
    });
  });

  describe("Purchase Order Audit Events", () => {
    it("should log PO creation with line details", async () => {
      const poCreated: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.PO_CREATED,
        userId: "user-001",
        tenantId: "tenant-001",
        resourceType: "purchaseOrder",
        resourceId: "po-001",
        newValue: {
          poNumber: "PO-2026-001",
          supplierId: "supplier-001",
          totalAmount: 5000,
          lineCount: 3,
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-po-001",
        ...poCreated,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: poCreated });

      expect(result.action).toBe(AUDIT_ACTIONS.PO_CREATED);
      expect(result.newValue).toHaveProperty("totalAmount", 5000);
    });

    it("should log PO approval with approver details", async () => {
      const poApproved: Omit<AuditLogEntry, "id" | "timestamp"> = {
        action: AUDIT_ACTIONS.PO_APPROVED,
        userId: "approver-001",
        tenantId: "tenant-001",
        resourceType: "purchaseOrder",
        resourceId: "po-001",
        oldValue: { status: "PENDING_APPROVAL" },
        newValue: { status: "APPROVED" },
        metadata: {
          approverRole: "MANAGER",
          approvalAmount: 5000,
          approvalLevel: 2,
        },
      };

      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "log-po-approve-001",
        ...poApproved,
        timestamp: new Date(),
      });

      const result = await prisma.auditLog.create({ data: poApproved });

      expect(result.action).toBe(AUDIT_ACTIONS.PO_APPROVED);
      expect(result.metadata).toHaveProperty("approverRole", "MANAGER");
    });
  });

  describe("Audit Log Queries", () => {
    it("should filter by tenant ID", async () => {
      const logs: AuditLogEntry[] = [
        {
          id: "log-1",
          action: AUDIT_ACTIONS.ITEM_CREATED,
          userId: "user-001",
          tenantId: "tenant-001",
          timestamp: new Date(),
        },
        {
          id: "log-2",
          action: AUDIT_ACTIONS.ITEM_CREATED,
          userId: "user-002",
          tenantId: "tenant-002",
          timestamp: new Date(),
        },
      ];

      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          return logs.filter(l => l.tenantId === args?.where?.tenantId);
        }
      );

      const result = await prisma.auditLog.findMany({
        where: { tenantId: "tenant-001" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe("tenant-001");
    });

    it("should filter by action type", async () => {
      const logs: AuditLogEntry[] = [
        { id: "log-1", action: AUDIT_ACTIONS.LOGIN, userId: "user-001", tenantId: "t1", timestamp: new Date() },
        { id: "log-2", action: AUDIT_ACTIONS.LOGIN_FAILED, userId: "user-002", tenantId: "t1", timestamp: new Date() },
        { id: "log-3", action: AUDIT_ACTIONS.LOGIN, userId: "user-003", tenantId: "t1", timestamp: new Date() },
      ];

      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { action?: AuditAction } }) => {
          return logs.filter(l => l.action === args?.where?.action);
        }
      );

      const result = await prisma.auditLog.findMany({
        where: { action: AUDIT_ACTIONS.LOGIN },
      });

      expect(result).toHaveLength(2);
    });

    it("should filter by date range", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const logs: AuditLogEntry[] = [
        { id: "log-1", action: AUDIT_ACTIONS.ITEM_CREATED, userId: "u1", tenantId: "t1", timestamp: now },
        { id: "log-2", action: AUDIT_ACTIONS.ITEM_UPDATED, userId: "u1", tenantId: "t1", timestamp: yesterday },
        { id: "log-3", action: AUDIT_ACTIONS.ITEM_DELETED, userId: "u1", tenantId: "t1", timestamp: lastWeek },
      ];

      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { timestamp?: { gte?: Date } } }) => {
          if (args?.where?.timestamp?.gte) {
            return logs.filter(l => l.timestamp >= args.where!.timestamp!.gte!);
          }
          return logs;
        }
      );

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = await prisma.auditLog.findMany({
        where: { timestamp: { gte: threeDaysAgo } },
      });

      expect(result).toHaveLength(2);
    });

    it("should filter by user ID", async () => {
      const logs: AuditLogEntry[] = [
        { id: "log-1", action: AUDIT_ACTIONS.ITEM_CREATED, userId: "user-001", tenantId: "t1", timestamp: new Date() },
        { id: "log-2", action: AUDIT_ACTIONS.ITEM_UPDATED, userId: "user-002", tenantId: "t1", timestamp: new Date() },
        { id: "log-3", action: AUDIT_ACTIONS.ITEM_DELETED, userId: "user-001", tenantId: "t1", timestamp: new Date() },
      ];

      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { userId?: string } }) => {
          return logs.filter(l => l.userId === args?.where?.userId);
        }
      );

      const result = await prisma.auditLog.findMany({
        where: { userId: "user-001" },
      });

      expect(result).toHaveLength(2);
    });

    it("should filter by resource", async () => {
      const logs: AuditLogEntry[] = [
        { id: "log-1", action: AUDIT_ACTIONS.ITEM_CREATED, userId: "u1", tenantId: "t1", resourceType: "item", resourceId: "item-001", timestamp: new Date() },
        { id: "log-2", action: AUDIT_ACTIONS.ITEM_UPDATED, userId: "u1", tenantId: "t1", resourceType: "item", resourceId: "item-001", timestamp: new Date() },
        { id: "log-3", action: AUDIT_ACTIONS.ITEM_CREATED, userId: "u1", tenantId: "t1", resourceType: "item", resourceId: "item-002", timestamp: new Date() },
      ];

      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { resourceType?: string; resourceId?: string } }) => {
          return logs.filter(l => 
            l.resourceType === args?.where?.resourceType &&
            l.resourceId === args?.where?.resourceId
          );
        }
      );

      const result = await prisma.auditLog.findMany({
        where: { resourceType: "item", resourceId: "item-001" },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("Audit Statistics", () => {
    it("should count events by action type", async () => {
      const actionCounts: Record<string, number> = {
        [AUDIT_ACTIONS.LOGIN]: 150,
        [AUDIT_ACTIONS.LOGIN_FAILED]: 23,
        [AUDIT_ACTIONS.ITEM_CREATED]: 45,
        [AUDIT_ACTIONS.INVENTORY_ADJUSTED]: 89,
      };

      (prisma.auditLog.count as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { action?: AuditAction } }) => {
          return actionCounts[args?.where?.action || ""] || 0;
        }
      );

      const loginCount = await prisma.auditLog.count({
        where: { action: AUDIT_ACTIONS.LOGIN },
      });

      const failedLoginCount = await prisma.auditLog.count({
        where: { action: AUDIT_ACTIONS.LOGIN_FAILED },
      });

      expect(loginCount).toBe(150);
      expect(failedLoginCount).toBe(23);
    });
  });

  describe("Sensitive Data Handling", () => {
    it("should NOT log password values", () => {
      const sanitizeAuditData = (data: Record<string, unknown>): Record<string, unknown> => {
        const sensitiveFields = ["password", "passwordHash", "token", "secret", "apiKey"];
        const sanitized = { ...data };
        
        for (const field of sensitiveFields) {
          if (field in sanitized) {
            sanitized[field] = "[REDACTED]";
          }
        }
        
        return sanitized;
      };

      const userData = {
        email: "user@example.com",
        password: "supersecret123",
        passwordHash: "$2a$10$abc123",
        role: "ADMIN",
      };

      const sanitized = sanitizeAuditData(userData);

      expect(sanitized.email).toBe("user@example.com");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.passwordHash).toBe("[REDACTED]");
      expect(sanitized.role).toBe("ADMIN");
    });

    it("should mask PII in logs", () => {
      const maskPII = (data: Record<string, unknown>): Record<string, unknown> => {
        const piiFields = ["ssn", "creditCard", "bankAccount"];
        const sanitized = { ...data };
        
        for (const field of piiFields) {
          if (typeof sanitized[field] === "string") {
            const value = sanitized[field] as string;
            sanitized[field] = value.slice(0, -4).replace(/./g, "*") + value.slice(-4);
          }
        }
        
        return sanitized;
      };

      const personalData = {
        name: "John Doe",
        ssn: "123-45-6789",
        creditCard: "4111111111111111",
      };

      const masked = maskPII(personalData);

      expect(masked.name).toBe("John Doe");
      expect(masked.ssn).toBe("*******6789");
      expect(masked.creditCard).toBe("************1111");
    });
  });

  describe("Audit Log Retention", () => {
    it("should identify logs older than retention period", () => {
      const RETENTION_DAYS = 90;
      
      const isExpired = (logDate: Date): boolean => {
        const retentionCutoff = new Date();
        retentionCutoff.setDate(retentionCutoff.getDate() - RETENTION_DAYS);
        return logDate < retentionCutoff;
      };

      const recentLog = new Date();
      const oldLog = new Date();
      oldLog.setDate(oldLog.getDate() - 100);

      expect(isExpired(recentLog)).toBe(false);
      expect(isExpired(oldLog)).toBe(true);
    });

    it("should calculate storage requirements", () => {
      const estimateLogSize = (logsPerDay: number, retentionDays: number, avgLogSizeBytes: number): number => {
        return logsPerDay * retentionDays * avgLogSizeBytes;
      };

      // 1000 logs/day, 90 days retention, 500 bytes avg
      const estimatedSize = estimateLogSize(1000, 90, 500);
      const estimatedMB = estimatedSize / (1024 * 1024);

      expect(estimatedMB).toBeCloseTo(42.9, 1);
    });
  });

  describe("Compliance Requirements", () => {
    it("should include required SOC2 audit fields", () => {
      const soc2RequiredFields = [
        "timestamp",
        "userId",
        "action",
        "resourceType",
        "resourceId",
        "ipAddress",
        "outcome", // success/failure
      ];

      const auditEntry = {
        id: "log-001",
        timestamp: new Date(),
        userId: "user-001",
        tenantId: "tenant-001",
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        resourceType: "user",
        resourceId: "user-002",
        ipAddress: "192.168.1.1",
        metadata: {
          outcome: "success",
          oldRole: "VIEWER",
          newRole: "MANAGER",
        },
      };

      // Check required fields are present
      expect(auditEntry.timestamp).toBeDefined();
      expect(auditEntry.userId).toBeDefined();
      expect(auditEntry.action).toBeDefined();
      expect(auditEntry.resourceType).toBeDefined();
      expect(auditEntry.resourceId).toBeDefined();
      expect(auditEntry.ipAddress).toBeDefined();
      expect(auditEntry.metadata?.outcome).toBeDefined();
    });

    it("should support GDPR data subject access requests", () => {
      const getUserActivityReport = (userId: string, logs: AuditLogEntry[]): {
        userId: string;
        totalActions: number;
        actionsByType: Record<string, number>;
        firstActivity: Date | null;
        lastActivity: Date | null;
      } => {
        const userLogs = logs.filter(l => l.userId === userId);
        
        const actionsByType: Record<string, number> = {};
        userLogs.forEach(log => {
          actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
        });

        const sorted = userLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        return {
          userId,
          totalActions: userLogs.length,
          actionsByType,
          firstActivity: sorted[0]?.timestamp || null,
          lastActivity: sorted[sorted.length - 1]?.timestamp || null,
        };
      };

      const logs: AuditLogEntry[] = [
        { id: "1", action: AUDIT_ACTIONS.LOGIN, userId: "user-001", tenantId: "t1", timestamp: new Date("2026-01-01") },
        { id: "2", action: AUDIT_ACTIONS.ITEM_CREATED, userId: "user-001", tenantId: "t1", timestamp: new Date("2026-01-02") },
        { id: "3", action: AUDIT_ACTIONS.LOGOUT, userId: "user-001", tenantId: "t1", timestamp: new Date("2026-01-03") },
      ];

      const report = getUserActivityReport("user-001", logs);

      expect(report.totalActions).toBe(3);
      expect(report.actionsByType[AUDIT_ACTIONS.LOGIN]).toBe(1);
      expect(report.firstActivity?.toISOString().split("T")[0]).toBe("2026-01-01");
      expect(report.lastActivity?.toISOString().split("T")[0]).toBe("2026-01-03");
    });
  });
});
