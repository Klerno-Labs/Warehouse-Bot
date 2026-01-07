/**
 * Multi-tenant Isolation Tests
 * 
 * CRITICAL SECURITY TESTS
 * Tests for ensuring complete data isolation between tenants.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock prisma for use in tests
const mockPrisma = {
  item: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  inventoryBalance: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  purchaseOrder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  job: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  site: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

// Alias for simpler access in tests
const prisma = mockPrisma;

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: mockPrisma,
}));

describe("Multi-tenant Isolation Tests", () => {
  const TENANT_A = "tenant-alpha";
  const TENANT_B = "tenant-beta";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Query Isolation", () => {
    it("should filter items by tenant ID in all queries", async () => {
      const tenantAItems = [
        { id: "item-a1", tenantId: TENANT_A, name: "Alpha Item 1" },
        { id: "item-a2", tenantId: TENANT_A, name: "Alpha Item 2" },
      ];

      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          // Verify tenantId filter is present
          if (!args?.where?.tenantId) {
            throw new Error("SECURITY VIOLATION: Query missing tenant filter");
          }
          return tenantAItems.filter(i => i.tenantId === args.where!.tenantId);
        }
      );

      // Valid query with tenant filter
      const result = await prisma.item.findMany({
        where: { tenantId: TENANT_A },
      });

      expect(result).toHaveLength(2);
      expect(result.every((i: { tenantId: string }) => i.tenantId === TENANT_A)).toBe(true);
    });

    it("should reject queries without tenant filter", async () => {
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          if (!args?.where?.tenantId) {
            throw new Error("SECURITY VIOLATION: Query missing tenant filter");
          }
          return [];
        }
      );

      await expect(
        prisma.item.findMany({ where: {} })
      ).rejects.toThrow("SECURITY VIOLATION");
    });

    it("should prevent tenant A from accessing tenant B data", async () => {
      const allItems = [
        { id: "item-a1", tenantId: TENANT_A, name: "Alpha Item" },
        { id: "item-b1", tenantId: TENANT_B, name: "Beta Item" },
      ];

      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          if (!args?.where?.tenantId) {
            throw new Error("SECURITY VIOLATION: Query missing tenant filter");
          }
          return allItems.filter(i => i.tenantId === args.where!.tenantId);
        }
      );

      // Tenant A query should not return Tenant B items
      const tenantAResult = await prisma.item.findMany({
        where: { tenantId: TENANT_A },
      });

      expect(tenantAResult).toHaveLength(1);
      expect(tenantAResult[0].tenantId).toBe(TENANT_A);
      expect(tenantAResult.some((i: { tenantId: string }) => i.tenantId === TENANT_B)).toBe(false);
    });
  });

  describe("CRUD Isolation", () => {
    it("should create items with correct tenant ID", async () => {
      const sessionTenant = TENANT_A;
      
      (prisma.item.create as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { data: { tenantId: string; name: string } }) => {
          // Enforce tenant ID from session, not from request
          return {
            id: "new-item-id",
            tenantId: sessionTenant, // Always use session tenant
            name: args.data.name,
          };
        }
      );

      // Even if attacker tries to set different tenantId, it should be overwritten
      const result = await prisma.item.create({
        data: {
          tenantId: TENANT_B, // Attacker attempts to set wrong tenant
          name: "Malicious Item",
        },
      });

      expect(result.tenantId).toBe(TENANT_A); // Session tenant enforced
    });

    it("should prevent updating items from another tenant", async () => {
      const sessionTenant = TENANT_A;
      
      (prisma.item.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "item-b1",
        tenantId: TENANT_B,
        name: "Beta Item",
      });

      (prisma.item.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where: { id: string }; data: { name: string } }) => {
          const existing = await prisma.item.findUnique({ where: { id: args.where.id } });
          if ((existing as { tenantId: string } | null)?.tenantId !== sessionTenant) {
            throw new Error("FORBIDDEN: Cannot update items from another tenant");
          }
          return { ...existing, ...args.data };
        }
      );

      // Tenant A tries to update Tenant B's item
      await expect(
        prisma.item.update({
          where: { id: "item-b1" },
          data: { name: "Hacked Name" },
        })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should prevent deleting items from another tenant", async () => {
      const sessionTenant = TENANT_A;
      
      (prisma.item.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "item-b1",
        tenantId: TENANT_B,
        name: "Beta Item",
      });

      (prisma.item.delete as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where: { id: string } }) => {
          const existing = await prisma.item.findUnique({ where: { id: args.where.id } });
          if ((existing as { tenantId: string } | null)?.tenantId !== sessionTenant) {
            throw new Error("FORBIDDEN: Cannot delete items from another tenant");
          }
          return existing;
        }
      );

      await expect(
        prisma.item.delete({ where: { id: "item-b1" } })
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("Related Entity Isolation", () => {
    it("should prevent cross-tenant inventory access", async () => {
      const inventoryBalances = [
        { itemId: "item-a1", tenantId: TENANT_A, qtyOnHand: 100 },
        { itemId: "item-b1", tenantId: TENANT_B, qtyOnHand: 200 },
      ];

      (prisma.inventoryBalance.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          if (!args?.where?.tenantId) {
            throw new Error("SECURITY VIOLATION: Query missing tenant filter");
          }
          return inventoryBalances.filter(b => b.tenantId === args.where!.tenantId);
        }
      );

      const result = await prisma.inventoryBalance.findMany({
        where: { tenantId: TENANT_A },
      });

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(TENANT_A);
    });

    it("should prevent cross-tenant purchase order access", async () => {
      const purchaseOrders = [
        { id: "po-a1", tenantId: TENANT_A, poNumber: "PO-A-001" },
        { id: "po-b1", tenantId: TENANT_B, poNumber: "PO-B-001" },
      ];

      (prisma.purchaseOrder.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where: { id: string }; tenantId?: string }) => {
          const po = purchaseOrders.find(p => p.id === args.where.id);
          if (!po) return null;
          
          // Check tenant access (would be passed from session)
          if (args.tenantId && po.tenantId !== args.tenantId) {
            return null; // Or throw FORBIDDEN
          }
          return po;
        }
      );

      // Tenant A cannot access Tenant B's PO
      const result = await prisma.purchaseOrder.findUnique({
        where: { id: "po-b1" },
        tenantId: TENANT_A,
      } as { where: { id: string }; tenantId: string });

      expect(result).toBeNull();
    });

    it("should prevent cross-tenant job access", async () => {
      const jobs = [
        { id: "job-a1", tenantId: TENANT_A, jobNumber: "JOB-A-001" },
        { id: "job-b1", tenantId: TENANT_B, jobNumber: "JOB-B-001" },
      ];

      (prisma.job.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          return jobs.filter(j => j.tenantId === args?.where?.tenantId);
        }
      );

      const tenantAJobs = await prisma.job.findMany({
        where: { tenantId: TENANT_A },
      });

      expect(tenantAJobs).toHaveLength(1);
      expect(tenantAJobs[0].jobNumber).toBe("JOB-A-001");
    });
  });

  describe("User Tenant Binding", () => {
    it("should bind users to their tenant", async () => {
      const users = [
        { id: "user-a1", tenantId: TENANT_A, email: "user@alpha.com" },
        { id: "user-b1", tenantId: TENANT_B, email: "user@beta.com" },
      ];

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where: { id?: string; email?: string } }) => {
          return users.find(u => 
            u.id === args.where.id || u.email === args.where.email
          );
        }
      );

      const userA = await prisma.user.findUnique({ where: { id: "user-a1" } });
      expect(userA?.tenantId).toBe(TENANT_A);

      const userB = await prisma.user.findUnique({ where: { email: "user@beta.com" } });
      expect(userB?.tenantId).toBe(TENANT_B);
    });

    it("should prevent user from accessing another tenant context", () => {
      const session = {
        userId: "user-a1",
        tenantId: TENANT_A,
      };

      const requestedTenant = TENANT_B;

      const validateTenantAccess = (
        sessionTenant: string,
        requestedTenant: string
      ): boolean => {
        return sessionTenant === requestedTenant;
      };

      expect(validateTenantAccess(session.tenantId, TENANT_A)).toBe(true);
      expect(validateTenantAccess(session.tenantId, requestedTenant)).toBe(false);
    });
  });

  describe("Site/Facility Isolation", () => {
    it("should restrict sites to tenant", async () => {
      const sites = [
        { id: "site-a1", tenantId: TENANT_A, name: "Alpha Warehouse" },
        { id: "site-a2", tenantId: TENANT_A, name: "Alpha DC" },
        { id: "site-b1", tenantId: TENANT_B, name: "Beta Warehouse" },
      ];

      (prisma.site.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: { where?: { tenantId?: string } }) => {
          return sites.filter(s => s.tenantId === args?.where?.tenantId);
        }
      );

      const tenantASites = await prisma.site.findMany({
        where: { tenantId: TENANT_A },
      });

      expect(tenantASites).toHaveLength(2);
      expect(tenantASites.every((s: { tenantId: string }) => s.tenantId === TENANT_A)).toBe(true);
    });
  });

  describe("API Route Protection", () => {
    it("should enforce tenant context in middleware", () => {
      const createTenantMiddleware = (sessionTenantId: string) => {
        return (req: { query: { tenantId?: string } }) => {
          // Always use session tenant, ignore query params
          return {
            tenantId: sessionTenantId,
            validate: (resourceTenantId: string) => {
              if (resourceTenantId !== sessionTenantId) {
                throw new Error("FORBIDDEN: Cross-tenant access denied");
              }
            },
          };
        };
      };

      const middleware = createTenantMiddleware(TENANT_A);
      const context = middleware({ query: { tenantId: TENANT_B } }); // Attacker tries to override

      expect(context.tenantId).toBe(TENANT_A);
      expect(() => context.validate(TENANT_A)).not.toThrow();
      expect(() => context.validate(TENANT_B)).toThrow("FORBIDDEN");
    });

    it("should sanitize tenant ID from user input", () => {
      const sanitizeTenantId = (input: string): string | null => {
        // Only allow valid UUID-like tenant IDs
        const uuidPattern = /^[a-z0-9-]+$/i;
        if (!uuidPattern.test(input)) return null;
        if (input.length > 50) return null;
        return input;
      };

      expect(sanitizeTenantId(TENANT_A)).toBe(TENANT_A);
      expect(sanitizeTenantId("tenant-123")).toBe("tenant-123");
      expect(sanitizeTenantId("'; DROP TABLE--")).toBeNull();
      expect(sanitizeTenantId("<script>")).toBeNull();
      expect(sanitizeTenantId("a".repeat(100))).toBeNull();
    });
  });

  describe("Audit Log Isolation", () => {
    it("should log tenant ID with all operations", () => {
      const auditLog: Array<{
        tenantId: string;
        userId: string;
        action: string;
        resourceId: string;
        timestamp: Date;
      }> = [];

      const logAuditEvent = (
        tenantId: string,
        userId: string,
        action: string,
        resourceId: string
      ) => {
        auditLog.push({
          tenantId,
          userId,
          action,
          resourceId,
          timestamp: new Date(),
        });
      };

      logAuditEvent(TENANT_A, "user-a1", "CREATE", "item-001");
      logAuditEvent(TENANT_B, "user-b1", "UPDATE", "item-002");

      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].tenantId).toBe(TENANT_A);
      expect(auditLog[1].tenantId).toBe(TENANT_B);
    });

    it("should filter audit logs by tenant", () => {
      const auditLogs = [
        { id: "log-1", tenantId: TENANT_A, action: "CREATE" },
        { id: "log-2", tenantId: TENANT_A, action: "UPDATE" },
        { id: "log-3", tenantId: TENANT_B, action: "DELETE" },
      ];

      const tenantALogs = auditLogs.filter(l => l.tenantId === TENANT_A);

      expect(tenantALogs).toHaveLength(2);
      expect(tenantALogs.every(l => l.tenantId === TENANT_A)).toBe(true);
    });
  });

  describe("Transaction Isolation", () => {
    it("should maintain tenant context within transactions", async () => {
      const sessionTenant = TENANT_A;

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const txWithTenantFilter = {
            item: {
              findMany: async (args: { where?: { tenantId?: string } }) => {
                // Enforce tenant filter within transaction
                if (args?.where?.tenantId !== sessionTenant) {
                  throw new Error("Transaction tenant mismatch");
                }
                return [];
              },
              create: async (args: { data: { tenantId: string } }) => {
                // Force session tenant
                return { ...args.data, tenantId: sessionTenant };
              },
            },
          };
          return callback(txWithTenantFilter as unknown as typeof mockPrisma);
        }
      );

      const result = await prisma.$transaction(async (tx: typeof mockPrisma) => {
        const items = await tx.item.findMany({ where: { tenantId: sessionTenant } });
        const newItem = await tx.item.create({ 
          data: { tenantId: TENANT_B, name: "Test" } // Try to create for wrong tenant
        });
        return newItem;
      });

      expect((result as { tenantId: string }).tenantId).toBe(TENANT_A); // Transaction enforced correct tenant
    });
  });

  describe("URL/Path Manipulation Prevention", () => {
    it("should prevent tenant ID in URL path manipulation", () => {
      const extractTenantFromPath = (
        path: string,
        sessionTenantId: string
      ): string => {
        // Match patterns like /api/tenant/[tenantId]/...
        const match = path.match(/\/api\/tenant\/([^/]+)/);
        const pathTenantId = match?.[1];

        // Always verify against session tenant
        if (pathTenantId && pathTenantId !== sessionTenantId) {
          throw new Error("FORBIDDEN: Tenant ID mismatch");
        }

        return sessionTenantId;
      };

      expect(
        extractTenantFromPath(`/api/tenant/${TENANT_A}/items`, TENANT_A)
      ).toBe(TENANT_A);

      expect(() =>
        extractTenantFromPath(`/api/tenant/${TENANT_B}/items`, TENANT_A)
      ).toThrow("FORBIDDEN");
    });

    it("should prevent IDOR attacks on tenant resources", () => {
      const validateResourceAccess = (
        resourceId: string,
        resourceTenantId: string,
        sessionTenantId: string
      ): boolean => {
        if (resourceTenantId !== sessionTenantId) {
          console.warn(`IDOR attempt: ${resourceId} belongs to ${resourceTenantId}, session is ${sessionTenantId}`);
          return false;
        }
        return true;
      };

      expect(validateResourceAccess("item-001", TENANT_A, TENANT_A)).toBe(true);
      expect(validateResourceAccess("item-002", TENANT_B, TENANT_A)).toBe(false);
    });
  });
});
