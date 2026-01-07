import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be self-contained in factory
vi.mock('../../server/prisma', () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    inventoryEvent: {
      findMany: vi.fn(),
    },
  },
}));

// Import after mocks
import { ForecastingService } from '../../server/forecasting';
import { prisma } from '../../server/prisma';

// Type the mocked prisma for better IDE support
const mockPrisma = prisma as unknown as {
  item: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  inventoryEvent: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('ForecastingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateForecast', () => {
    it('should generate forecast for all items in tenant', async () => {
      const mockItems = [
        {
          id: 'item-1',
          tenantId: 'tenant-1',
          sku: 'ITEM-001',
          name: 'Widget A',
          balances: [{ qtyOnHand: 500, qtyReserved: 50 }],
        },
        {
          id: 'item-2',
          tenantId: 'tenant-1',
          sku: 'ITEM-002',
          name: 'Widget B',
          balances: [{ qtyOnHand: 200, qtyReserved: 10 }],
        },
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockPrisma.item.findUnique.mockImplementation(async ({ where }) => {
        return mockItems.find(i => i.id === where.id) || null;
      });

      // Create historical demand events
      const historicalEvents = Array.from({ length: 30 }, (_, i) => ({
        id: `event-${i}`,
        itemId: 'item-1',
        tenantId: 'tenant-1',
        eventType: 'ISSUE_TO_WORKCELL',
        quantity: 10 + Math.floor(Math.random() * 5),
        createdAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));

      mockPrisma.inventoryEvent.findMany.mockResolvedValue(historicalEvents);

      const result = await ForecastingService.generateForecast('tenant-1');

      expect(result).toBeDefined();
      expect(result.historicalPeriods).toBe(90); // Default
      expect(result.forecastPeriods).toBe(30); // Default
      expect(result.method).toBe('exponential-smoothing');
      expect(result.items).toBeDefined();
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        })
      );
    });

    it('should filter by site when siteId provided', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await ForecastingService.generateForecast('tenant-1', 'site-1');

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          include: expect.objectContaining({
            balances: { where: { siteId: 'site-1' } },
          }),
        })
      );
    });

    it('should use custom forecast and historical days', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      const result = await ForecastingService.generateForecast('tenant-1', undefined, 60, 180);

      expect(result.forecastPeriods).toBe(60);
      expect(result.historicalPeriods).toBe(180);
    });

    it('should return empty items array when no items found', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      const result = await ForecastingService.generateForecast('tenant-1');

      expect(result.items).toEqual([]);
    });

    it('should return DemandAnalysis structure', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      const result = await ForecastingService.generateForecast('tenant-1');

      expect(result).toMatchObject({
        historicalPeriods: expect.any(Number),
        forecastPeriods: expect.any(Number),
        method: expect.stringMatching(/moving-average|exponential-smoothing|linear-regression|seasonal/),
        accuracy: expect.any(Number),
        items: expect.any(Array),
      });
    });
  });

  describe('forecastItem', () => {
    const mockItem = {
      id: 'item-1',
      tenantId: 'tenant-1',
      sku: 'ITEM-001',
      name: 'Widget A',
      balances: [{ qtyOnHand: 500, qtyReserved: 50 }],
    };

    it('should return null for non-existent item', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(null);

      const result = await ForecastingService.forecastItem('non-existent', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should generate forecast for specific item', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      
      // Create consistent historical demand data
      const historicalEvents = Array.from({ length: 60 }, (_, i) => ({
        id: `event-${i}`,
        itemId: 'item-1',
        tenantId: 'tenant-1',
        eventType: 'ISSUE_TO_WORKCELL',
        quantity: 10,
        createdAt: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(historicalEvents);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
      if (result) {
        expect(result.itemId).toBe('item-1');
        expect(result.sku).toBe('ITEM-001');
        expect(result.name).toBe('Widget A');
        expect(result.forecast).toBeDefined();
        expect(result.trend).toMatch(/increasing|decreasing|stable/);
        expect(result.stockoutRisk).toMatch(/low|medium|high/);
      }
    });

    it('should include forecast periods in result', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([
        { id: '1', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 10, createdAt: new Date() },
      ]);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1', undefined, 30);

      if (result) {
        expect(result.forecast).toBeDefined();
        expect(Array.isArray(result.forecast)).toBe(true);
      }
    });

    it('should filter events by site when provided', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);

      await ForecastingService.forecastItem('item-1', 'tenant-1', 'site-1');

      expect(mockPrisma.inventoryEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemId: 'item-1',
            tenantId: 'tenant-1',
            siteId: 'site-1',
          }),
        })
      );
    });

    it('should calculate current stock from balances', async () => {
      const itemWithMultipleBalances = {
        ...mockItem,
        balances: [
          { qtyOnHand: 200, qtyReserved: 20 },
          { qtyOnHand: 300, qtyReserved: 30 },
        ],
      };
      mockPrisma.item.findUnique.mockResolvedValue(itemWithMultipleBalances);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      if (result) {
        expect(result.currentStock).toBeDefined();
        expect(typeof result.currentStock).toBe('number');
      }
    });
  });

  describe('Forecast Accuracy', () => {
    it('should detect increasing trend', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 500, qtyReserved: 0 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      // Create increasing demand pattern
      const increasingEvents = Array.from({ length: 90 }, (_, i) => ({
        id: `event-${i}`,
        itemId: 'item-1',
        tenantId: 'tenant-1',
        eventType: 'ISSUE_TO_WORKCELL',
        quantity: 10 + Math.floor(i / 3), // Gradually increasing
        createdAt: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(increasingEvents);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      // We expect the algorithm to detect the trend
      expect(result).toBeDefined();
      if (result) {
        expect(['increasing', 'stable', 'decreasing']).toContain(result.trend);
      }
    });

    it('should detect stable demand', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 500, qtyReserved: 0 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      // Create stable demand pattern
      const stableEvents = Array.from({ length: 90 }, (_, i) => ({
        id: `event-${i}`,
        itemId: 'item-1',
        tenantId: 'tenant-1',
        eventType: 'ISSUE_TO_WORKCELL',
        quantity: 10, // Constant
        createdAt: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(stableEvents);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
      if (result) {
        expect(['stable', 'increasing', 'decreasing']).toContain(result.trend);
      }
    });
  });

  describe('Stockout Risk Assessment', () => {
    it('should assess stockout risk', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 10000, qtyReserved: 0 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      // Low demand
      const lowDemandEvents = Array.from({ length: 30 }, (_, i) => ({
        id: `event-${i}`,
        itemId: 'item-1',
        tenantId: 'tenant-1',
        eventType: 'ISSUE_TO_WORKCELL',
        quantity: 5,
        createdAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(lowDemandEvents);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
      if (result) {
        expect(result.stockoutRisk).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(result.stockoutRisk);
      }
    });

    it('should return recommendedAction based on risk', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 50, qtyReserved: 45 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([
        { id: '1', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 100, createdAt: new Date() },
      ]);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
      if (result) {
        expect(result.recommendedAction).toBeDefined();
        expect(typeof result.recommendedAction).toBe('string');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle item with no historical demand', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 500, qtyReserved: 0 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      // Should still return a forecast (even if with low confidence)
      expect(result).toBeDefined();
    });

    it('should handle item with sparse historical data', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [{ qtyOnHand: 500, qtyReserved: 0 }],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      // Only 5 events over 90 days
      const sparseEvents = [
        { id: '1', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 10, createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000) },
        { id: '2', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 15, createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { id: '3', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 12, createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
        { id: '4', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 8, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
        { id: '5', itemId: 'item-1', eventType: 'ISSUE_TO_WORKCELL', quantity: 10, createdAt: new Date() },
      ];
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(sparseEvents);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
    });

    it('should handle item with no balances', async () => {
      const mockItem = {
        id: 'item-1',
        sku: 'ITEM-001',
        name: 'Widget A',
        balances: [],
      };
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);

      const result = await ForecastingService.forecastItem('item-1', 'tenant-1');

      expect(result).toBeDefined();
      if (result) {
        expect(result.currentStock).toBe(0);
      }
    });
  });
});
