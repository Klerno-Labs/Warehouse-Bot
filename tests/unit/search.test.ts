import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be self-contained in factory
vi.mock('../../server/prisma', () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    inventoryEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
    savedSearch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import after mocks
import { SearchService } from '../../server/search';
import { prisma } from '../../server/prisma';

// Type the mocked prisma
const mockPrisma = prisma as any;

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchItems', () => {
    const mockItems = [
      { id: '1', sku: 'ITEM-001', name: 'Widget A', description: 'A standard widget', category: 'FINISHED', status: 'ACTIVE' },
      { id: '2', sku: 'ITEM-002', name: 'Widget B', description: 'An advanced widget', category: 'FINISHED', status: 'ACTIVE' },
      { id: '3', sku: 'RAW-001', name: 'Raw Material X', description: 'Basic material', category: 'RAW_MATERIAL', status: 'ACTIVE' },
    ];

    it('should search items by text query', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItems[0], mockItems[1]]);
      mockPrisma.item.count.mockResolvedValue(2);

      const result = await SearchService.searchItems('tenant-1', {
        query: 'widget',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should search items by SKU', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItems[2]]);
      mockPrisma.item.count.mockResolvedValue(1);

      const result = await SearchService.searchItems('tenant-1', {
        query: 'RAW-001',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].sku).toBe('RAW-001');
    });

    it('should filter by category using eq operator', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItems[2]]);
      mockPrisma.item.count.mockResolvedValue(1);

      const result = await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'category', operator: 'eq', value: 'RAW_MATERIAL' }],
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            category: 'RAW_MATERIAL',
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItems[0]]);
      mockPrisma.item.count.mockResolvedValue(100);

      const result = await SearchService.searchItems('tenant-1', {
        page: 2,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.total).toBe(100);
    });

    it('should apply sorting', async () => {
      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockPrisma.item.count.mockResolvedValue(3);

      await SearchService.searchItems('tenant-1', {
        sort: { field: 'name', direction: 'asc' },
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should return proper pagination metadata', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItems[0]]);
      mockPrisma.item.count.mockResolvedValue(50);

      const result = await SearchService.searchItems('tenant-1', {
        page: 3,
        limit: 10,
      });

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });
    });

    it('should calculate total pages correctly', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(55);

      const result = await SearchService.searchItems('tenant-1', {
        page: 1,
        limit: 10,
      });

      expect(result.totalPages).toBe(6); // Ceil(55/10)
    });
  });

  describe('Filter Operators', () => {
    beforeEach(() => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);
    });

    it('should handle eq (equals) operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should handle ne (not equals) operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'status', operator: 'ne', value: 'DISCONTINUED' }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'DISCONTINUED' },
          }),
        })
      );
    });

    it('should handle gt (greater than) operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'reorderPoint', operator: 'gt', value: 100 }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reorderPoint: { gt: 100 },
          }),
        })
      );
    });

    it('should handle lte (less than or equal) operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'unitCost', operator: 'lte', value: 50 }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitCost: { lte: 50 },
          }),
        })
      );
    });

    it('should handle contains operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'name', operator: 'contains', value: 'widget' }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'widget', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should handle in operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'category', operator: 'in', value: ['FINISHED', 'RAW_MATERIAL'] }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ['FINISHED', 'RAW_MATERIAL'] },
          }),
        })
      );
    });

    it('should handle between operator', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [{ field: 'unitCost', operator: 'between', value: [10, 50] }],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitCost: { gte: 10, lte: 50 },
          }),
        })
      );
    });

    it('should combine multiple filters', async () => {
      await SearchService.searchItems('tenant-1', {
        filters: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'category', operator: 'eq', value: 'FINISHED' },
        ],
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            category: 'FINISHED',
          }),
        })
      );
    });
  });

  describe('searchEvents', () => {
    const mockEvents = [
      { id: '1', eventType: 'RECEIPT', itemId: 'item-1', quantity: 100, createdAt: new Date() },
      { id: '2', eventType: 'ISSUE', itemId: 'item-1', quantity: 50, createdAt: new Date() },
    ];

    it('should search inventory events', async () => {
      mockPrisma.inventoryEvent.findMany.mockResolvedValue(mockEvents);
      mockPrisma.inventoryEvent.count.mockResolvedValue(2);

      const result = await SearchService.searchEvents('tenant-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter events by type', async () => {
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([mockEvents[0]]);
      mockPrisma.inventoryEvent.count.mockResolvedValue(1);

      const result = await SearchService.searchEvents('tenant-1', {
        filters: [{ field: 'eventType', operator: 'eq', value: 'RECEIPT' }],
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('searchJobs', () => {
    const mockJobs = [
      { id: '1', jobNumber: 'JOB-001', status: 'IN_PROGRESS', itemId: 'item-1' },
      { id: '2', jobNumber: 'JOB-002', status: 'COMPLETED', itemId: 'item-2' },
    ];

    it('should search jobs', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const result = await SearchService.searchJobs('tenant-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter jobs by status', async () => {
      mockPrisma.job.findMany.mockResolvedValue([mockJobs[0]]);
      mockPrisma.job.count.mockResolvedValue(1);

      const result = await SearchService.searchJobs('tenant-1', {
        filters: [{ field: 'status', operator: 'eq', value: 'IN_PROGRESS' }],
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should search jobs by job number', async () => {
      mockPrisma.job.findMany.mockResolvedValue([mockJobs[0]]);
      mockPrisma.job.count.mockResolvedValue(1);

      const result = await SearchService.searchJobs('tenant-1', {
        query: 'JOB-001',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('globalSearch', () => {
    it('should search across multiple entity types', async () => {
      mockPrisma.item.findMany.mockResolvedValue([{ id: '1', name: 'Widget' }]);
      mockPrisma.item.count.mockResolvedValue(1);
      mockPrisma.job.findMany.mockResolvedValue([{ id: '2', jobNumber: 'JOB-001' }]);
      mockPrisma.job.count.mockResolvedValue(1);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);
      mockPrisma.inventoryEvent.count.mockResolvedValue(0);
      mockPrisma.location.findMany.mockResolvedValue([]);

      const result = await SearchService.globalSearch('tenant-1', 'Widget');

      expect(result.items).toBeDefined();
      expect(result.jobs).toBeDefined();
    });

    it('should return results grouped by entity type', async () => {
      mockPrisma.item.findMany.mockResolvedValue([
        { id: '1', name: 'Widget A' },
        { id: '2', name: 'Widget B' },
      ]);
      mockPrisma.item.count.mockResolvedValue(2);
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);
      mockPrisma.inventoryEvent.findMany.mockResolvedValue([]);
      mockPrisma.location.findMany.mockResolvedValue([]);

      const result = await SearchService.globalSearch('tenant-1', 'Widget');

      expect(result.items).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters array', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      const result = await SearchService.searchItems('tenant-1', {
        filters: [],
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it('should use default pagination when not provided', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      await SearchService.searchItems('tenant-1', {});

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50, // Default limit
        })
      );
    });

    it('should handle special characters in query', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      const result = await SearchService.searchItems('tenant-1', {
        query: "test's \"item\" [special]",
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it('should handle hasMore flag correctly', async () => {
      mockPrisma.item.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.item.count.mockResolvedValue(100);

      const result = await SearchService.searchItems('tenant-1', {
        page: 5,
        limit: 10,
      });

      expect(result.hasMore).toBe(true); // 5 < 10 (totalPages)
    });

    it('should handle last page hasMore flag', async () => {
      mockPrisma.item.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.item.count.mockResolvedValue(50);

      const result = await SearchService.searchItems('tenant-1', {
        page: 5,
        limit: 10,
      });

      expect(result.hasMore).toBe(false); // 5 == 5 (totalPages)
    });
  });
});
