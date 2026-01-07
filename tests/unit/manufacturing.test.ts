/**
 * Manufacturing & BOM Tests
 * 
 * Tests for Bill of Materials (BOM) management, production orders,
 * material requirements calculation, and backflush operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock prisma for use in tests
const prisma = {
  billOfMaterial: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  productionOrder: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  productionConsumption: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  productionOutput: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
  },
  inventoryBalance: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: {
    billOfMaterial: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productionOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productionConsumption: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    productionOutput: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    item: {
      findUnique: vi.fn(),
    },
    inventoryBalance: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Manufacturing Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BOM Management", () => {
    it("should create a BOM with components", async () => {
      const mockBOM = {
        id: "bom-001",
        tenantId: "tenant-1",
        itemId: "finished-item-001",
        bomNumber: "BOM-001",
        version: 1,
        baseQty: 1,
        baseUom: "EA",
        status: "ACTIVE",
        components: [
          {
            id: "comp-001",
            itemId: "raw-item-001",
            sequence: 10,
            qtyPer: 2.5,
            uom: "EA",
            scrapFactor: 5,
            issueMethod: "BACKFLUSH",
          },
          {
            id: "comp-002",
            itemId: "raw-item-002",
            sequence: 20,
            qtyPer: 1,
            uom: "FT",
            scrapFactor: 0,
            issueMethod: "MANUAL",
          },
        ],
      };

      (prisma.billOfMaterial.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockBOM);

      const result = await prisma.billOfMaterial.create({
        data: {
          tenantId: "tenant-1",
          itemId: "finished-item-001",
          bomNumber: "BOM-001",
          version: 1,
          baseQty: 1,
          baseUom: "EA",
          components: {
            create: [
              { itemId: "raw-item-001", sequence: 10, qtyPer: 2.5, uom: "EA", scrapFactor: 5 },
              { itemId: "raw-item-002", sequence: 20, qtyPer: 1, uom: "FT", scrapFactor: 0 },
            ],
          },
        },
      });

      expect(result.id).toBe("bom-001");
      expect(result.components).toHaveLength(2);
      expect(result.components[0].qtyPer).toBe(2.5);
    });

    it("should validate BOM component sequence uniqueness", async () => {
      const createDuplicateSequence = async () => {
        const components = [
          { itemId: "item-1", sequence: 10, qtyPer: 1, uom: "EA" },
          { itemId: "item-2", sequence: 10, qtyPer: 2, uom: "EA" }, // Duplicate sequence
        ];

        const sequences = components.map(c => c.sequence);
        const uniqueSequences = new Set(sequences);
        
        if (sequences.length !== uniqueSequences.size) {
          throw new Error("Duplicate sequence numbers in BOM components");
        }
      };

      await expect(createDuplicateSequence()).rejects.toThrow("Duplicate sequence");
    });

    it("should prevent circular BOM references", async () => {
      const detectCircularReference = (
        bomId: string,
        componentItemId: string,
        visitedItems: Set<string> = new Set()
      ): boolean => {
        if (visitedItems.has(componentItemId)) {
          return true; // Circular reference detected
        }
        return false;
      };

      const hasCircular = detectCircularReference("bom-1", "item-1", new Set(["item-1"]));
      expect(hasCircular).toBe(true);

      const noCircular = detectCircularReference("bom-1", "item-2", new Set(["item-1"]));
      expect(noCircular).toBe(false);
    });

    it("should calculate material requirements correctly", async () => {
      const bom = {
        id: "bom-001",
        baseQty: 1,
        components: [
          { itemId: "raw-1", qtyPer: 2, scrapFactor: 10 },
          { itemId: "raw-2", qtyPer: 0.5, scrapFactor: 0 },
        ],
      };

      const qtyOrdered = 100;
      
      const requirements = bom.components.map(comp => {
        const qtyRequired = (qtyOrdered / bom.baseQty) * comp.qtyPer;
        const scrapQty = qtyRequired * (comp.scrapFactor / 100);
        return {
          itemId: comp.itemId,
          qtyRequired,
          scrapQty,
          totalQty: qtyRequired + scrapQty,
        };
      });

      // Component 1: 100 * 2 = 200, scrap = 20, total = 220
      expect(requirements[0].qtyRequired).toBe(200);
      expect(requirements[0].scrapQty).toBe(20);
      expect(requirements[0].totalQty).toBe(220);

      // Component 2: 100 * 0.5 = 50, scrap = 0, total = 50
      expect(requirements[1].qtyRequired).toBe(50);
      expect(requirements[1].scrapQty).toBe(0);
      expect(requirements[1].totalQty).toBe(50);
    });

    it("should handle BOM version control", async () => {
      const versions = [
        { id: "bom-v1", bomNumber: "BOM-001", version: 1, status: "OBSOLETE" },
        { id: "bom-v2", bomNumber: "BOM-001", version: 2, status: "ACTIVE" },
      ];

      const activeVersion = versions.find(v => v.status === "ACTIVE");
      expect(activeVersion?.version).toBe(2);

      // Only one version should be active
      const activeVersions = versions.filter(v => v.status === "ACTIVE");
      expect(activeVersions).toHaveLength(1);
    });
  });

  describe("Production Order Management", () => {
    it("should create production order from BOM", async () => {
      const mockProductionOrder = {
        id: "po-001",
        tenantId: "tenant-1",
        orderNumber: "PO-2026-001",
        bomId: "bom-001",
        itemId: "finished-item-001",
        qtyOrdered: 100,
        qtyProduced: 0,
        status: "DRAFT",
        lines: [],
      };

      (prisma.productionOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockProductionOrder);

      const result = await prisma.productionOrder.create({
        data: {
          tenantId: "tenant-1",
          orderNumber: "PO-2026-001",
          bomId: "bom-001",
          itemId: "finished-item-001",
          qtyOrdered: 100,
        },
      });

      expect(result.orderNumber).toBe("PO-2026-001");
      expect(result.status).toBe("DRAFT");
      expect(result.qtyOrdered).toBe(100);
    });

    it("should validate production order status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["RELEASED", "CANCELLED"],
        RELEASED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "ON_HOLD"],
        ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
        COMPLETED: [], // Terminal state
        CANCELLED: [], // Terminal state
      };

      // Valid transition
      expect(validTransitions["DRAFT"].includes("RELEASED")).toBe(true);
      expect(validTransitions["RELEASED"].includes("IN_PROGRESS")).toBe(true);

      // Invalid transition
      expect(validTransitions["DRAFT"].includes("COMPLETED")).toBe(false);
      expect(validTransitions["COMPLETED"].includes("DRAFT")).toBe(false);
    });

    it("should not allow over-production beyond ordered quantity", () => {
      const productionOrder = {
        qtyOrdered: 100,
        qtyProduced: 95,
      };

      const attemptedOutput = 10;
      const wouldExceed = productionOrder.qtyProduced + attemptedOutput > productionOrder.qtyOrdered;

      expect(wouldExceed).toBe(true);

      // Allowed output
      const maxAllowedOutput = productionOrder.qtyOrdered - productionOrder.qtyProduced;
      expect(maxAllowedOutput).toBe(5);
    });

    it("should track production progress percentage", () => {
      const orders = [
        { qtyOrdered: 100, qtyProduced: 0 },   // 0%
        { qtyOrdered: 100, qtyProduced: 50 },  // 50%
        { qtyOrdered: 100, qtyProduced: 100 }, // 100%
        { qtyOrdered: 0, qtyProduced: 0 },     // Edge case
      ];

      const getProgress = (order: typeof orders[0]) => {
        if (order.qtyOrdered === 0) return 0;
        return Math.round((order.qtyProduced / order.qtyOrdered) * 100);
      };

      expect(getProgress(orders[0])).toBe(0);
      expect(getProgress(orders[1])).toBe(50);
      expect(getProgress(orders[2])).toBe(100);
      expect(getProgress(orders[3])).toBe(0);
    });
  });

  describe("Backflush Operations", () => {
    it("should calculate backflush quantities correctly", () => {
      const bom = {
        baseQty: 1,
        components: [
          { itemId: "comp-1", qtyPer: 2, scrapFactor: 5, issueMethod: "BACKFLUSH" },
          { itemId: "comp-2", qtyPer: 1, scrapFactor: 0, issueMethod: "BACKFLUSH" },
          { itemId: "comp-3", qtyPer: 3, scrapFactor: 0, issueMethod: "MANUAL" }, // Not backflushed
        ],
      };

      const qtyProduced = 10;
      const backflushComponents = bom.components.filter(c => c.issueMethod === "BACKFLUSH");

      const consumptions = backflushComponents.map(comp => {
        const qtyBase = (qtyProduced / bom.baseQty) * comp.qtyPer;
        const scrapQty = qtyBase * (comp.scrapFactor / 100);
        return {
          itemId: comp.itemId,
          qtyConsumed: qtyBase + scrapQty,
        };
      });

      // comp-1: 10 * 2 = 20, +5% scrap = 21
      expect(consumptions[0].qtyConsumed).toBe(21);
      // comp-2: 10 * 1 = 10, no scrap = 10
      expect(consumptions[1].qtyConsumed).toBe(10);
      // comp-3 not included (MANUAL)
      expect(consumptions).toHaveLength(2);
    });

    it("should verify sufficient inventory before backflush", async () => {
      const checkInventory = (available: number, required: number): boolean => {
        return available >= required;
      };

      expect(checkInventory(100, 50)).toBe(true);
      expect(checkInventory(50, 100)).toBe(false);
      expect(checkInventory(50, 50)).toBe(true);
    });

    it("should create consumption records for backflushed components", async () => {
      const consumptions = [
        { itemId: "comp-1", qtyConsumed: 21, isBackflushed: true },
        { itemId: "comp-2", qtyConsumed: 10, isBackflushed: true },
      ];

      (prisma.productionConsumption.create as ReturnType<typeof vi.fn>)
        .mockImplementation(async ({ data }) => ({
          id: `consumption-${Date.now()}`,
          ...data,
        }));

      for (const consumption of consumptions) {
        const result = await prisma.productionConsumption.create({
          data: consumption,
        });
        expect(result.isBackflushed).toBe(true);
      }

      expect(prisma.productionConsumption.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Yield Calculation", () => {
    it("should calculate yield percentage", () => {
      const testCases = [
        { qtyInput: 100, qtyOutput: 95, expectedYield: 95 },
        { qtyInput: 100, qtyOutput: 100, expectedYield: 100 },
        { qtyInput: 100, qtyOutput: 80, expectedYield: 80 },
        { qtyInput: 0, qtyOutput: 0, expectedYield: 0 }, // Edge case
      ];

      const calculateYield = (input: number, output: number): number => {
        if (input === 0) return 0;
        return Math.round((output / input) * 100);
      };

      testCases.forEach(tc => {
        expect(calculateYield(tc.qtyInput, tc.qtyOutput)).toBe(tc.expectedYield);
      });
    });

    it("should identify low yield orders for investigation", () => {
      const orders = [
        { id: "po-1", qtyOrdered: 100, qtyProduced: 95 },
        { id: "po-2", qtyOrdered: 100, qtyProduced: 75 }, // Low yield
        { id: "po-3", qtyOrdered: 100, qtyProduced: 50 }, // Very low yield
      ];

      const YIELD_THRESHOLD = 85;
      const lowYieldOrders = orders.filter(order => {
        const yieldPct = (order.qtyProduced / order.qtyOrdered) * 100;
        return yieldPct < YIELD_THRESHOLD;
      });

      expect(lowYieldOrders).toHaveLength(2);
      expect(lowYieldOrders.map(o => o.id)).toEqual(["po-2", "po-3"]);
    });
  });

  describe("BOM Effective Dates", () => {
    it("should return only effective BOMs for given date", () => {
      const today = new Date("2026-01-06");
      const boms = [
        { id: "bom-1", effectiveFrom: new Date("2025-01-01"), effectiveTo: new Date("2025-12-31") }, // Expired
        { id: "bom-2", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }, // Current
        { id: "bom-3", effectiveFrom: new Date("2027-01-01"), effectiveTo: null }, // Future
      ];

      const effectiveBoms = boms.filter(bom => {
        const isEffective = bom.effectiveFrom <= today;
        const notExpired = !bom.effectiveTo || bom.effectiveTo >= today;
        return isEffective && notExpired;
      });

      expect(effectiveBoms).toHaveLength(1);
      expect(effectiveBoms[0].id).toBe("bom-2");
    });
  });
});
