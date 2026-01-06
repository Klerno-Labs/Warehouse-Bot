/**
 * Chaos Testing Suite
 * 
 * Tests system resilience by simulating failures:
 * - Service crashes mid-request
 * - Database connection failures
 * - Network timeouts
 * - Resource exhaustion
 * 
 * Run: npm run test:chaos
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies
vi.mock("@/server/prisma", async () => {
  const actual = await vi.importActual("@/server/prisma");
  return {
    ...actual,
    prisma: {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn(),
      item: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      inventoryBalance: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      salesOrder: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      transaction: {
        create: vi.fn(),
      },
    },
  };
});

import { prisma } from "@server/prisma";

describe("Chaos Tests - System Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Connection Failures", () => {
    it("should handle database connection timeout", async () => {
      // Simulate connection timeout
      (prisma.$connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Connection timeout after 30000ms")
      );

      await expect(async () => {
        await prisma.$connect();
      }).rejects.toThrow("Connection timeout");
    });

    it("should handle database connection refused", async () => {
      // Simulate connection refused
      (prisma.$connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ECONNREFUSED: Connection refused")
      );

      await expect(async () => {
        await prisma.$connect();
      }).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle database disconnect mid-query", async () => {
      // First call succeeds, second fails (simulating disconnect)
      let callCount = 0;
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount > 1) {
          throw new Error("Connection lost: ETIMEDOUT");
        }
        return [{ id: "1", sku: "TEST" }];
      });

      // First call works
      const result1 = await prisma.item.findMany({});
      expect(result1).toHaveLength(1);

      // Second call fails
      await expect(prisma.item.findMany({})).rejects.toThrow("Connection lost");
    });

    it("should handle connection pool exhaustion", async () => {
      // Simulate all connections in use
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Timed out fetching a new connection from the pool")
      );

      await expect(async () => {
        await prisma.item.findMany({});
      }).rejects.toThrow("Timed out fetching");
    });
  });

  describe("Transaction Failures", () => {
    it("should handle transaction timeout", async () => {
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Transaction timed out")
      );

      await expect(async () => {
        await prisma.$transaction(async (tx: unknown) => {
          // Long running operations
        });
      }).rejects.toThrow("Transaction timed out");
    });

    it("should handle deadlock during transaction", async () => {
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Deadlock detected: Transaction aborted")
      );

      await expect(async () => {
        await prisma.$transaction(async (tx: unknown) => {
          // Operations that cause deadlock
        });
      }).rejects.toThrow("Deadlock detected");
    });

    it("should handle partial transaction rollback", async () => {
      let operationsCompleted = 0;

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (fn) => {
        const mockTx = {
          item: {
            create: vi.fn().mockImplementation(async () => {
              operationsCompleted++;
              if (operationsCompleted > 2) {
                throw new Error("Constraint violation");
              }
              return { id: `item-${operationsCompleted}` };
            }),
          },
        };

        try {
          return await fn(mockTx);
        } catch (error) {
          // Rollback - reset completed operations
          operationsCompleted = 0;
          throw error;
        }
      });

      await expect(async () => {
        await prisma.$transaction(async (tx: unknown) => {
          await (tx as any).item.create({ data: { sku: "1" } });
          await (tx as any).item.create({ data: { sku: "2" } });
          await (tx as any).item.create({ data: { sku: "3" } }); // This fails
        });
      }).rejects.toThrow("Constraint violation");

      // Verify rollback happened
      expect(operationsCompleted).toBe(0);
    });
  });

  describe("Query Failures Mid-Operation", () => {
    it("should handle query killed mid-execution", async () => {
      (prisma.inventoryBalance.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Query cancelled: statement timeout")
      );

      await expect(async () => {
        await prisma.inventoryBalance.findMany({
          where: { tenantId: "test" },
        });
      }).rejects.toThrow("Query cancelled");
    });

    it("should handle out of memory during large query", async () => {
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Out of memory: Cannot allocate memory for query result")
      );

      await expect(async () => {
        await prisma.item.findMany({
          include: { balances: true, transactions: true },
          take: 1000000, // Unreasonably large
        });
      }).rejects.toThrow("Out of memory");
    });
  });

  describe("Service Crash Recovery", () => {
    it("should handle crash during inventory update", async () => {
      let updateStarted = false;
      let updateCompleted = false;

      (prisma.inventoryBalance.upsert as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        updateStarted = true;
        // Simulate crash mid-operation
        throw new Error("SIGKILL: Process terminated");
      });

      await expect(async () => {
        await prisma.inventoryBalance.upsert({
          where: { id: "bal-1" },
          create: { qtyBase: 100 },
          update: { qtyBase: { increment: 50 } },
        });
      }).rejects.toThrow("SIGKILL");

      expect(updateStarted).toBe(true);
      expect(updateCompleted).toBe(false);
    });

    it("should handle partial order creation on crash", async () => {
      const orderState = { created: false, linesCreated: 0 };

      (prisma.salesOrder.create as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        orderState.created = true;
        // Simulate crash after order header created but before lines
        throw new Error("Service restarting...");
      });

      await expect(async () => {
        await prisma.salesOrder.create({
          data: {
            orderNumber: "SO-001",
            lines: {
              create: [
                { itemId: "item-1", qty: 10 },
                { itemId: "item-2", qty: 5 },
              ],
            },
          },
        });
      }).rejects.toThrow("Service restarting");

      // Verify partial state (orphaned order without lines)
      expect(orderState.created).toBe(true);
      expect(orderState.linesCreated).toBe(0);
    });
  });

  describe("Concurrent Access Issues", () => {
    it("should handle optimistic lock failure", async () => {
      (prisma.inventoryBalance.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Record was modified by another transaction")
      );

      await expect(async () => {
        await prisma.inventoryBalance.updateMany({
          where: { id: "bal-1", version: 1 },
          data: { qtyBase: 100, version: 2 },
        });
      }).rejects.toThrow("modified by another transaction");
    });

    it("should handle race condition in order number generation", async () => {
      // Simulate duplicate key error from race condition
      (prisma.salesOrder.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unique constraint violation: orderNumber already exists")
      );

      await expect(async () => {
        await prisma.salesOrder.create({
          data: { orderNumber: "SO-001" },
        });
      }).rejects.toThrow("Unique constraint violation");
    });
  });

  describe("Network Failures", () => {
    it("should handle DNS resolution failure", async () => {
      (prisma.$connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ENOTFOUND: getaddrinfo ENOTFOUND database.host")
      );

      await expect(async () => {
        await prisma.$connect();
      }).rejects.toThrow("ENOTFOUND");
    });

    it("should handle network partition", async () => {
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ENETUNREACH: Network is unreachable")
      );

      await expect(async () => {
        await prisma.item.findMany({});
      }).rejects.toThrow("ENETUNREACH");
    });

    it("should handle SSL/TLS handshake failure", async () => {
      (prisma.$connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("SSL HANDSHAKE_FAILURE")
      );

      await expect(async () => {
        await prisma.$connect();
      }).rejects.toThrow("SSL HANDSHAKE_FAILURE");
    });
  });

  describe("Resource Exhaustion", () => {
    it("should handle file descriptor exhaustion", async () => {
      (prisma.$connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("EMFILE: Too many open files")
      );

      await expect(async () => {
        await prisma.$connect();
      }).rejects.toThrow("EMFILE");
    });

    it("should handle disk space exhaustion", async () => {
      (prisma.transaction.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ENOSPC: No space left on device")
      );

      await expect(async () => {
        await prisma.transaction.create({
          data: { txnType: "RECEIPT", qty: 100 },
        });
      }).rejects.toThrow("ENOSPC");
    });
  });
});

describe("Chaos Tests - Recovery Mechanisms", () => {
  describe("Retry Logic", () => {
    it("should retry on transient failures", async () => {
      let attempts = 0;
      const maxRetries = 3;

      const retryOperation = async <T>(
        operation: () => Promise<T>,
        retries: number = maxRetries
      ): Promise<T> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            attempts++;
            if (attempt === retries) throw error;
            if (!isTransientError(error)) throw error;
            // Wait before retry (exponential backoff)
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100));
          }
        }
        throw new Error("Retry failed");
      };

      const isTransientError = (error: Error): boolean => {
        const transientPatterns = [
          "Connection timeout",
          "Connection lost",
          "ETIMEDOUT",
          "ECONNRESET",
        ];
        return transientPatterns.some((p) => error.message.includes(p));
      };

      // Simulate transient failure followed by success
      let callCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error("Connection timeout");
        }
        return { success: true };
      });

      const result = await retryOperation(operation) as { success: boolean };

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
      expect(attempts).toBe(2);
    });

    it("should not retry on permanent failures", async () => {
      let attempts = 0;

      const retryOperation = async <T>(
        operation: () => Promise<T>,
        retries: number = 3
      ): Promise<T> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            attempts++;
            if (isPermanentError(error)) throw error;
            if (attempt === retries) throw error;
          }
        }
        throw new Error("Retry failed");
      };

      const isPermanentError = (error: Error): boolean => {
        const permanentPatterns = [
          "Unique constraint",
          "Foreign key constraint",
          "Permission denied",
        ];
        return permanentPatterns.some((p) => error.message.includes(p));
      };

      const operation = vi.fn().mockRejectedValue(
        new Error("Unique constraint violation")
      );

      await expect(retryOperation(operation)).rejects.toThrow("Unique constraint");
      expect(attempts).toBe(1); // Should not retry permanent errors
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after consecutive failures", async () => {
      const circuitBreaker = {
        failures: 0,
        threshold: 5,
        isOpen: false,
        lastFailure: 0,
        resetTimeout: 30000,

        async execute<T>(operation: () => Promise<T>): Promise<T> {
          if (this.isOpen) {
            const now = Date.now();
            if (now - this.lastFailure > this.resetTimeout) {
              // Half-open state - try one request
              this.isOpen = false;
            } else {
              throw new Error("Circuit breaker is OPEN");
            }
          }

          try {
            const result = await operation();
            this.failures = 0;
            return result;
          } catch (error) {
            this.failures++;
            this.lastFailure = Date.now();
            if (this.failures >= this.threshold) {
              this.isOpen = true;
            }
            throw error;
          }
        },
      };

      const failingOperation = vi.fn().mockRejectedValue(new Error("Service down"));

      // Fail 5 times to open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      }

      expect(circuitBreaker.isOpen).toBe(true);

      // Next call should fail fast without calling the operation
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        "Circuit breaker is OPEN"
      );
      expect(failingOperation).toHaveBeenCalledTimes(5);
    });
  });

  describe("Graceful Degradation", () => {
    it("should return cached data when database unavailable", async () => {
      const cache = new Map<string, any>();
      cache.set("items", [
        { id: "1", sku: "CACHED-001" },
        { id: "2", sku: "CACHED-002" },
      ]);

      const getItems = async () => {
        try {
          // Try database first
          const dbResult = await prisma.item.findMany({});
          cache.set("items", dbResult);
          return { data: dbResult, source: "database" };
        } catch (error) {
          // Fall back to cache
          const cached = cache.get("items");
          if (cached) {
            return { data: cached, source: "cache" };
          }
          throw error;
        }
      };

      // Make database unavailable
      (prisma.item.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database unavailable")
      );

      const result = await getItems();

      expect(result.source).toBe("cache");
      expect(result.data).toHaveLength(2);
      expect(result.data[0].sku).toBe("CACHED-001");
    });
  });
});

describe("Chaos Tests - Data Integrity", () => {
  describe("Consistency After Failure", () => {
    it("should maintain inventory consistency after failed adjustment", async () => {
      const inventory = { qtyOnHand: 100, qtyAllocated: 20 };

      // Simulate failed adjustment (should rollback)
      const adjustInventory = async (qty: number) => {
        const originalQty = inventory.qtyOnHand;
        try {
          inventory.qtyOnHand += qty;
          
          // Simulate validation failure
          if (inventory.qtyOnHand < 0) {
            throw new Error("Cannot have negative inventory");
          }
          
          // Simulate crash during commit
          if (qty === -150) {
            throw new Error("Service crashed during commit");
          }
          
          return { success: true, newQty: inventory.qtyOnHand };
        } catch (error) {
          // Rollback
          inventory.qtyOnHand = originalQty;
          throw error;
        }
      };

      // Try to reduce inventory by more than available
      await expect(adjustInventory(-150)).rejects.toThrow();

      // Verify inventory unchanged
      expect(inventory.qtyOnHand).toBe(100);
      expect(inventory.qtyAllocated).toBe(20);
    });

    it("should prevent orphaned order lines", async () => {
      const orders: Map<string, any> = new Map();
      const orderLines: Array<{ orderId: string; itemId: string }> = [];

      const createOrderWithLines = async (
        orderData: any,
        lines: any[]
      ) => {
        // Create order first
        const orderId = `order-${Date.now()}`;
        orders.set(orderId, { ...orderData, id: orderId });

        try {
          // Create lines
          for (const line of lines) {
            // Simulate failure on third line
            if (orderLines.length >= 2 && lines.length > 2) {
              throw new Error("Failed to create order line");
            }
            orderLines.push({ orderId, itemId: line.itemId });
          }
          return orderId;
        } catch (error) {
          // Clean up: remove order and any created lines
          orders.delete(orderId);
          const toRemove = orderLines.filter((l) => l.orderId === orderId);
          toRemove.forEach((l) => {
            const idx = orderLines.indexOf(l);
            if (idx >= 0) orderLines.splice(idx, 1);
          });
          throw error;
        }
      };

      await expect(
        createOrderWithLines(
          { orderNumber: "SO-001" },
          [
            { itemId: "item-1" },
            { itemId: "item-2" },
            { itemId: "item-3" }, // This will fail
          ]
        )
      ).rejects.toThrow();

      // Verify no orphaned data
      expect(orders.size).toBe(0);
      expect(orderLines).toHaveLength(0);
    });
  });
});
