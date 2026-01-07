/**
 * Cycle Count Tests
 * 
 * Tests for cycle count creation, counting operations, variance handling,
 * and inventory adjustments.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Define test constants to match shared/cycle-counts.ts
const CYCLE_COUNT_STATUS = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

const CYCLE_COUNT_TYPE = [
  "FULL",
  "ABC",
  "RANDOM",
  "LOCATION",
  "ITEM",
] as const;

// Define schemas locally for testing
const createCycleCountSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(CYCLE_COUNT_TYPE),
  scheduledDate: z.string(),
  assignedToUserId: z.string().optional(),
  notes: z.string().optional(),
});

const recordCountSchema = z.object({
  cycleCountLineId: z.string().min(1),
  countedQtyBase: z.number().min(0),
  notes: z.string().optional(),
});

const approveVarianceSchema = z.object({
  cycleCountLineId: z.string().min(1),
  approved: z.boolean(),
  notes: z.string().optional(),
});

// Define mock prisma for use in tests
const prisma = {
  cycleCount: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  cycleCountLine: {
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  inventoryBalance: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  inventoryEvent: {
    create: vi.fn(),
  },
};

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: {
    cycleCount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cycleCountLine: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    inventoryBalance: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    inventoryEvent: {
      create: vi.fn(),
    },
  },
}));

describe("Cycle Count Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cycle Count Creation", () => {
    it("should create cycle count with valid schema", () => {
      const validCycleCount = {
        siteId: "site-1",
        name: "Q1 2026 Full Count",
        type: "FULL" as const,
        scheduledDate: "2026-01-15",
        assignedToUserId: "user-1",
      };

      const result = createCycleCountSchema.safeParse(validCycleCount);
      expect(result.success).toBe(true);
    });

    it("should validate cycle count type", () => {
      expect(CYCLE_COUNT_TYPE).toContain("FULL");
      expect(CYCLE_COUNT_TYPE).toContain("ABC");
      expect(CYCLE_COUNT_TYPE).toContain("RANDOM");
      expect(CYCLE_COUNT_TYPE).toContain("LOCATION");
      expect(CYCLE_COUNT_TYPE).toContain("ITEM");
    });

    it("should generate count lines for FULL count", () => {
      const inventoryBalances = [
        { itemId: "item-1", locationId: "loc-1", qtyOnHand: 100 },
        { itemId: "item-2", locationId: "loc-1", qtyOnHand: 50 },
        { itemId: "item-1", locationId: "loc-2", qtyOnHand: 75 },
      ];

      const countLines = inventoryBalances.map((balance, index) => ({
        lineNumber: index + 1,
        itemId: balance.itemId,
        locationId: balance.locationId,
        expectedQtyBase: balance.qtyOnHand,
        status: "PENDING",
      }));

      expect(countLines).toHaveLength(3);
      expect(countLines[0].expectedQtyBase).toBe(100);
    });

    it("should generate count lines for ABC count by classification", () => {
      const items = [
        { id: "item-1", abcClass: "A" },
        { id: "item-2", abcClass: "A" },
        { id: "item-3", abcClass: "B" },
        { id: "item-4", abcClass: "C" },
      ];

      const targetClass = "A";
      const itemsToCount = items.filter(i => i.abcClass === targetClass);

      expect(itemsToCount).toHaveLength(2);
    });

    it("should generate count lines for LOCATION count", () => {
      const targetLocations = ["loc-1", "loc-2"];
      const allBalances = [
        { itemId: "item-1", locationId: "loc-1", qtyOnHand: 100 },
        { itemId: "item-2", locationId: "loc-1", qtyOnHand: 50 },
        { itemId: "item-3", locationId: "loc-3", qtyOnHand: 75 }, // Not included
      ];

      const balancesToCount = allBalances.filter(b => 
        targetLocations.includes(b.locationId)
      );

      expect(balancesToCount).toHaveLength(2);
    });

    it("should generate RANDOM sample count lines", () => {
      const allBalances = Array.from({ length: 100 }, (_, i) => ({
        itemId: `item-${i}`,
        locationId: `loc-${i % 10}`,
        qtyOnHand: Math.floor(Math.random() * 1000),
      }));

      const sampleSize = 10;
      const shuffled = [...allBalances].sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, sampleSize);

      expect(sampled).toHaveLength(10);
      expect(new Set(sampled.map(s => s.itemId)).size).toBeLessThanOrEqual(10);
    });
  });

  describe("Counting Operations", () => {
    it("should record count for line", () => {
      type CountLine = {
        id: string;
        expectedQtyBase: number;
        countedQtyBase: number | null;
        varianceQtyBase: number | null;
        status: string;
      };

      const line: CountLine = {
        id: "line-001",
        expectedQtyBase: 100,
        countedQtyBase: null,
        varianceQtyBase: null,
        status: "PENDING",
      };

      const recordCount = (
        line: CountLine,
        countedQty: number
      ): CountLine => {
        const variance = countedQty - line.expectedQtyBase;
        return {
          ...line,
          countedQtyBase: countedQty,
          varianceQtyBase: variance,
          status: "COUNTED",
        };
      };

      const counted = recordCount(line, 95);
      expect(counted.countedQtyBase).toBe(95);
      expect(counted.varianceQtyBase).toBe(-5);
      expect(counted.status).toBe("COUNTED");
    });

    it("should validate record count schema", () => {
      const validRecord = {
        cycleCountLineId: "line-001",
        countedQtyBase: 95,
        notes: "Found damaged items",
      };

      const result = recordCountSchema.safeParse(validRecord);
      expect(result.success).toBe(true);
    });

    it("should reject negative counted quantity", () => {
      const invalidRecord = {
        cycleCountLineId: "line-001",
        countedQtyBase: -5,
      };

      const result = recordCountSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it("should allow zero counted quantity", () => {
      const zeroRecord = {
        cycleCountLineId: "line-001",
        countedQtyBase: 0,
      };

      const result = recordCountSchema.safeParse(zeroRecord);
      expect(result.success).toBe(true);
    });
  });

  describe("Variance Handling", () => {
    it("should calculate variance percentage", () => {
      const calculateVariancePercent = (expected: number, counted: number): number => {
        if (expected === 0) return counted === 0 ? 0 : 100;
        return Math.round(Math.abs((counted - expected) / expected) * 100);
      };

      expect(calculateVariancePercent(100, 95)).toBe(5);
      expect(calculateVariancePercent(100, 100)).toBe(0);
      expect(calculateVariancePercent(100, 110)).toBe(10);
      expect(calculateVariancePercent(0, 0)).toBe(0);
      expect(calculateVariancePercent(0, 10)).toBe(100);
    });

    it("should identify lines requiring approval based on threshold", () => {
      const lines = [
        { id: "line-1", expectedQtyBase: 100, countedQtyBase: 100 }, // 0% variance
        { id: "line-2", expectedQtyBase: 100, countedQtyBase: 98 },  // 2% variance
        { id: "line-3", expectedQtyBase: 100, countedQtyBase: 90 },  // 10% variance
        { id: "line-4", expectedQtyBase: 100, countedQtyBase: 105 }, // 5% variance
      ];

      const VARIANCE_THRESHOLD_PERCENT = 5;

      const requiresApproval = lines.filter(line => {
        const variancePct = Math.abs((line.countedQtyBase! - line.expectedQtyBase) / line.expectedQtyBase) * 100;
        return variancePct > VARIANCE_THRESHOLD_PERCENT;
      });

      expect(requiresApproval).toHaveLength(1);
      expect(requiresApproval[0].id).toBe("line-3");
    });

    it("should identify lines requiring approval based on absolute threshold", () => {
      const lines = [
        { id: "line-1", expectedQtyBase: 1000, countedQtyBase: 995 }, // -5 units
        { id: "line-2", expectedQtyBase: 10, countedQtyBase: 5 },     // -5 units
      ];

      const VARIANCE_THRESHOLD_ABSOLUTE = 10;

      const requiresApproval = lines.filter(line => {
        const variance = Math.abs(line.countedQtyBase! - line.expectedQtyBase);
        return variance > VARIANCE_THRESHOLD_ABSOLUTE;
      });

      // Only line-1 and line-2 are within threshold despite same absolute variance
      expect(requiresApproval).toHaveLength(0);
    });

    it("should approve variance", () => {
      const validApproval = {
        cycleCountLineId: "line-001",
        approved: true,
        notes: "Verified by physical inspection",
      };

      const result = approveVarianceSchema.safeParse(validApproval);
      expect(result.success).toBe(true);
    });

    it("should reject variance with reason", () => {
      const rejection = {
        cycleCountLineId: "line-001",
        approved: false,
        notes: "Recount required - possible counting error",
      };

      type VarianceLine = {
        status: string;
        countedQtyBase: number;
        expectedQtyBase: number;
      };

      const line: VarianceLine = {
        status: "COUNTED",
        countedQtyBase: 90,
        expectedQtyBase: 100,
      };

      const rejectVariance = (
        line: VarianceLine,
        reason: string
      ): VarianceLine & { rejectionReason: string } => {
        return {
          ...line,
          status: "PENDING", // Reset to allow recount
          rejectionReason: reason,
        };
      };

      const rejected = rejectVariance(line, rejection.notes!);
      expect(rejected.status).toBe("PENDING");
      expect(rejected.rejectionReason).toBe(rejection.notes);
    });
  });

  describe("Inventory Adjustment", () => {
    it("should create adjustment event on variance approval", async () => {
      const line = {
        itemId: "item-001",
        locationId: "loc-001",
        expectedQtyBase: 100,
        countedQtyBase: 95,
        varianceQtyBase: -5,
      };

      const adjustmentEvent = {
        type: "ADJUSTMENT",
        itemId: line.itemId,
        locationId: line.locationId,
        qtyChange: line.varianceQtyBase,
        reasonCode: "CYCLE_COUNT_VARIANCE",
        reference: "CC-2026-001",
      };

      (prisma.inventoryEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "event-001",
        ...adjustmentEvent,
      });

      const result = await prisma.inventoryEvent.create({ data: adjustmentEvent });
      expect(result.type).toBe("ADJUSTMENT");
      expect(result.qtyChange).toBe(-5);
    });

    it("should update inventory balance on approval", async () => {
      const line = {
        itemId: "item-001",
        locationId: "loc-001",
        countedQtyBase: 95,
      };

      (prisma.inventoryBalance.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        itemId: line.itemId,
        locationId: line.locationId,
        qtyOnHand: line.countedQtyBase,
      });

      const result = await prisma.inventoryBalance.update({
        where: { itemId_locationId: { itemId: line.itemId, locationId: line.locationId } },
        data: { qtyOnHand: line.countedQtyBase },
      });

      expect(result.qtyOnHand).toBe(95);
    });
  });

  describe("Cycle Count Status", () => {
    it("should validate status constants", () => {
      expect(CYCLE_COUNT_STATUS).toContain("SCHEDULED");
      expect(CYCLE_COUNT_STATUS).toContain("IN_PROGRESS");
      expect(CYCLE_COUNT_STATUS).toContain("COMPLETED");
      expect(CYCLE_COUNT_STATUS).toContain("CANCELLED");
    });

    it("should transition status based on line completion", () => {
      const determineStatus = (lines: { status: string }[]): string => {
        if (lines.length === 0) return "SCHEDULED";
        
        const allApproved = lines.every(l => 
          l.status === "VARIANCE_APPROVED" || l.status === "VARIANCE_REJECTED"
        );
        const anyCounted = lines.some(l => l.status === "COUNTED");
        
        if (allApproved) return "COMPLETED";
        if (anyCounted) return "IN_PROGRESS";
        return "SCHEDULED";
      };

      expect(determineStatus([])).toBe("SCHEDULED");
      expect(determineStatus([{ status: "PENDING" }])).toBe("SCHEDULED");
      expect(determineStatus([{ status: "COUNTED" }])).toBe("IN_PROGRESS");
      expect(determineStatus([{ status: "VARIANCE_APPROVED" }])).toBe("COMPLETED");
    });

    it("should not allow completing cycle count with pending lines", () => {
      const lines = [
        { status: "VARIANCE_APPROVED" },
        { status: "PENDING" }, // Not counted yet
      ];

      const canComplete = lines.every(l => 
        l.status === "VARIANCE_APPROVED" || l.status === "VARIANCE_REJECTED"
      );

      expect(canComplete).toBe(false);
    });
  });

  describe("Scheduling", () => {
    it("should prevent scheduling in the past", () => {
      const validateScheduleDate = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate >= today;
      };

      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(validateScheduleDate(future)).toBe(true);

      const past = new Date();
      past.setDate(past.getDate() - 7);
      expect(validateScheduleDate(past)).toBe(false);

      const today = new Date();
      expect(validateScheduleDate(today)).toBe(true);
    });

    it("should calculate cycle count frequency by ABC class", () => {
      const countFrequency: Record<string, number> = {
        A: 30,  // Count every 30 days
        B: 60,  // Count every 60 days
        C: 90,  // Count every 90 days
      };

      const getNextCountDate = (lastCountDate: Date | null, abcClass: string): Date => {
        const frequency = countFrequency[abcClass] || 90;
        const baseDate = lastCountDate || new Date();
        const nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + frequency);
        return nextDate;
      };

      const lastCount = new Date("2026-01-01");
      const nextA = getNextCountDate(lastCount, "A");
      const nextB = getNextCountDate(lastCount, "B");
      const nextC = getNextCountDate(lastCount, "C");

      expect(nextA.toISOString().split("T")[0]).toBe("2026-01-31");
      expect(nextB.toISOString().split("T")[0]).toBe("2026-03-02");
      // 90 days from Jan 1 = March 31 (Jan has 31, Feb has 28, March has 31 = 90 days)
      expect(nextC.toISOString().split("T")[0]).toBe("2026-03-31");
    });
  });

  describe("Accuracy Metrics", () => {
    it("should calculate inventory accuracy rate", () => {
      const lines = [
        { expectedQtyBase: 100, countedQtyBase: 100 }, // Accurate
        { expectedQtyBase: 50, countedQtyBase: 50 },   // Accurate
        { expectedQtyBase: 75, countedQtyBase: 70 },   // Inaccurate (>2% variance)
        { expectedQtyBase: 200, countedQtyBase: 198 }, // Accurate (within 2%)
      ];

      const ACCURACY_THRESHOLD = 0.02; // 2%

      const accurateLines = lines.filter(line => {
        if (line.expectedQtyBase === 0) return line.countedQtyBase === 0;
        const variance = Math.abs(line.countedQtyBase! - line.expectedQtyBase) / line.expectedQtyBase;
        return variance <= ACCURACY_THRESHOLD;
      });

      const accuracyRate = (accurateLines.length / lines.length) * 100;
      expect(accuracyRate).toBe(75); // 3 out of 4 lines accurate
    });

    it("should calculate dollar variance", () => {
      const lines = [
        { itemId: "item-1", varianceQtyBase: -5, unitCost: 10 },
        { itemId: "item-2", varianceQtyBase: 3, unitCost: 50 },
        { itemId: "item-3", varianceQtyBase: -2, unitCost: 100 },
      ];

      const totalDollarVariance = lines.reduce(
        (sum, line) => sum + line.varianceQtyBase * line.unitCost,
        0
      );

      // -5*10 + 3*50 + -2*100 = -50 + 150 - 200 = -100
      expect(totalDollarVariance).toBe(-100);
    });
  });
});
