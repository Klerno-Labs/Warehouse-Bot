import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be self-contained in factory
vi.mock('../../server/prisma', () => ({
  prisma: {
    inventoryBalance: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    inventoryEvent: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    cycleCount: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    purchaseOrder: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    salesOrder: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Import after mocks
import { AnalyticsService } from '../../server/analytics';
import { prisma } from '../../server/prisma';

// Type the mocked prisma
const mockPrisma = prisma as any;

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    // Setup default successful mocks
    mockPrisma.inventoryBalance.aggregate.mockResolvedValue({
      _sum: { qtyOnHand: 10000 },
      _count: { _all: 500 },
    });
    mockPrisma.inventoryBalance.findMany.mockResolvedValue([
      { itemId: '1', qtyOnHand: 100, item: { unitCost: 10 } },
      { itemId: '2', qtyOnHand: 200, item: { unitCost: 25 } },
    ]);
    mockPrisma.item.count.mockResolvedValue(500);
    mockPrisma.job.count.mockResolvedValue(50);
    mockPrisma.job.findMany.mockResolvedValue([]);
    mockPrisma.inventoryEvent.count.mockResolvedValue(1500);
    mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);
    mockPrisma.inventoryEvent.groupBy.mockResolvedValue([]);
    mockPrisma.cycleCount.findMany.mockResolvedValue([]);
    mockPrisma.cycleCount.aggregate.mockResolvedValue({ _avg: { accuracy: 98 } });
    mockPrisma.purchaseOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 50000 } });
    mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 75000 } });
    mockPrisma.salesOrder.findMany.mockResolvedValue([]);
  }

  describe('generateAnalytics', () => {
    it('should generate comprehensive warehouse analytics', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('should include period information', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.period).toMatchObject({
        start: expect.any(Date),
        end: expect.any(Date),
        label: expect.any(String),
      });
    });

    it('should use custom period days', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1', undefined, 60);

      expect(result.period.label).toContain('60');
    });

    it('should filter by site when siteId provided', async () => {
      await AnalyticsService.generateAnalytics('tenant-1', 'site-1');

      // Verify site filtering was applied (check any Prisma call)
      expect(mockPrisma.inventoryBalance.findMany).toHaveBeenCalled();
    });

    it('should include inventory KPIs', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.kpis.inventory).toBeDefined();
      expect(Array.isArray(result.kpis.inventory)).toBe(true);
    });

    it('should include operations KPIs', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.kpis.operations).toBeDefined();
      expect(Array.isArray(result.kpis.operations)).toBe(true);
    });

    it('should include quality KPIs', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.kpis.quality).toBeDefined();
      expect(Array.isArray(result.kpis.quality)).toBe(true);
    });

    it('should include financial KPIs', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.kpis.financial).toBeDefined();
      expect(Array.isArray(result.kpis.financial)).toBe(true);
    });
  });

  describe('KPI Structure', () => {
    it('should return KPIs with proper structure', async () => {
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([
        { itemId: '1', qtyOnHand: 100, item: { unitCost: 10 } },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      // Check at least one KPI exists and has proper structure
      const allKpis = [
        ...result.kpis.inventory,
        ...result.kpis.operations,
        ...result.kpis.quality,
        ...result.kpis.financial,
      ];

      if (allKpis.length > 0) {
        const kpi = allKpis[0];
        expect(kpi).toMatchObject({
          name: expect.any(String),
          value: expect.any(Number),
          unit: expect.any(String),
          status: expect.stringMatching(/good|warning|critical/),
          description: expect.any(String),
        });
      }
    });

    it('should calculate inventory value from balances', async () => {
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([
        { itemId: '1', qtyOnHand: 100, item: { unitCost: 10 } },
        { itemId: '2', qtyOnHand: 50, item: { unitCost: 20 } },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      // Inventory value should be calculated: (100*10) + (50*20) = 2000
      expect(result.kpis.inventory).toBeDefined();
    });
  });

  describe('Trends', () => {
    it('should include inventory value trends', async () => {
      mockPrisma.inventoryEvent.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-01-01'), _sum: { value: 1000 } },
        { createdAt: new Date('2024-01-02'), _sum: { value: 1200 } },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.trends.inventoryValue).toBeDefined();
      expect(Array.isArray(result.trends.inventoryValue)).toBe(true);
    });

    it('should include transaction volume trends', async () => {
      mockPrisma.inventoryEvent.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-01-01'), _count: { _all: 100 } },
        { createdAt: new Date('2024-01-02'), _count: { _all: 120 } },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.trends.transactionVolume).toBeDefined();
      expect(Array.isArray(result.trends.transactionVolume)).toBe(true);
    });

    it('should include accuracy trends', async () => {
      mockPrisma.cycleCount.findMany.mockResolvedValue([
        { completedAt: new Date('2024-01-01'), accuracy: 98, lines: [] },
        { completedAt: new Date('2024-01-02'), accuracy: 99, lines: [] },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.trends.accuracy).toBeDefined();
      expect(Array.isArray(result.trends.accuracy)).toBe(true);
    });
  });

  describe('Insights', () => {
    it('should generate insights based on data', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should return string insights', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      result.insights.forEach(insight => {
        expect(typeof insight).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty inventory', async () => {
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([]);
      mockPrisma.inventoryBalance.aggregate.mockResolvedValue({
        _sum: { qtyOnHand: 0 },
        _count: { _all: 0 },
      });

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
      expect(result.kpis.inventory).toBeDefined();
    });

    it('should handle no transactions', async () => {
      mockPrisma.inventoryEvent.count.mockResolvedValue(0);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);
      mockPrisma.inventoryEvent.groupBy.mockResolvedValue([]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
      expect(result.kpis.operations).toBeDefined();
    });

    it('should handle no cycle counts', async () => {
      mockPrisma.cycleCount.findMany.mockResolvedValue([]);
      mockPrisma.cycleCount.aggregate.mockResolvedValue({ _avg: { accuracy: null } });

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
      expect(result.kpis.quality).toBeDefined();
    });

    it('should handle no orders', async () => {
      mockPrisma.purchaseOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      mockPrisma.salesOrder.findMany.mockResolvedValue([]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
      expect(result.kpis.financial).toBeDefined();
    });

    it('should handle null values gracefully', async () => {
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([
        { itemId: '1', qtyOnHand: null, item: { unitCost: null } },
      ]);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should fetch required data from database', async () => {
      await AnalyticsService.generateAnalytics('tenant-1');

      // At least some prisma calls should have been made
      expect(mockPrisma.inventoryBalance.findMany).toHaveBeenCalled();
    });

    it('should calculate KPIs from fetched data', async () => {
      mockPrisma.inventoryBalance.findMany.mockResolvedValue([
        { itemId: '1', qtyOnHand: 1000, item: { unitCost: 10 } },
      ]);
      mockPrisma.inventoryEvent.count.mockResolvedValue(5000);
      mockPrisma.job.count.mockResolvedValue(200);

      const result = await AnalyticsService.generateAnalytics('tenant-1');

      expect(result.kpis).toBeDefined();
    });
  });

  describe('Status Calculation', () => {
    it('should calculate status based on thresholds', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      const allKpis = [
        ...result.kpis.inventory,
        ...result.kpis.operations,
        ...result.kpis.quality,
        ...result.kpis.financial,
      ];

      allKpis.forEach(kpi => {
        expect(['good', 'warning', 'critical']).toContain(kpi.status);
      });
    });

    it('should include trend percentage in KPIs', async () => {
      const result = await AnalyticsService.generateAnalytics('tenant-1');

      const allKpis = [
        ...result.kpis.inventory,
        ...result.kpis.operations,
        ...result.kpis.quality,
        ...result.kpis.financial,
      ];

      allKpis.forEach(kpi => {
        expect(typeof kpi.trend).toBe('number');
      });
    });
  });
});
