/**
 * Advanced Search Engine
 *
 * Provides powerful search capabilities with filters, sorting, and saved searches
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export interface SearchFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "in" | "between";
  value: any;
}

export interface SearchOptions {
  query?: string; // Full-text search
  filters?: SearchFilter[];
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  entityType: string;
  options: SearchOptions;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SearchService {
  /**
   * Search items with advanced filters
   */
  static async searchItems(
    tenantId: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    const { query, filters = [], sort, page = 1, limit = 50 } = options;

    // Build where clause
    const where: any = { tenantId };

    // Full-text search
    if (query) {
      where.OR = [
        { sku: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Apply filters
    for (const filter of filters) {
      const { field, operator, value } = filter;

      switch (operator) {
        case "eq":
          where[field] = value;
          break;
        case "ne":
          where[field] = { not: value };
          break;
        case "gt":
          where[field] = { gt: value };
          break;
        case "gte":
          where[field] = { gte: value };
          break;
        case "lt":
          where[field] = { lt: value };
          break;
        case "lte":
          where[field] = { lte: value };
          break;
        case "contains":
          where[field] = { contains: value, mode: "insensitive" };
          break;
        case "startsWith":
          where[field] = { startsWith: value, mode: "insensitive" };
          break;
        case "endsWith":
          where[field] = { endsWith: value, mode: "insensitive" };
          break;
        case "in":
          where[field] = { in: value };
          break;
        case "between":
          where[field] = { gte: value[0], lte: value[1] };
          break;
      }
    }

    // Build orderBy
    const orderBy: any = sort
      ? { [sort.field]: sort.direction }
      : { createdAt: "desc" };

    // Execute search
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          balances: {
            include: {
              location: true,
              site: true,
            },
          },
        },
      }),
      prisma.item.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Search inventory events
   */
  static async searchEvents(
    tenantId: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    const { query, filters = [], sort, page = 1, limit = 100 } = options;

    const where: any = { tenantId };

    // Apply filters
    for (const filter of filters) {
      const { field, operator, value } = filter;

      if (field === "dateRange") {
        where.createdAt = { gte: value[0], lte: value[1] };
      } else if (field === "eventType") {
        where.eventType = { in: value };
      } else if (field === "itemId") {
        where.itemId = value;
      } else if (field === "siteId") {
        where.siteId = value;
      } else if (field === "userId") {
        where.createdByUserId = value;
      }
    }

    const orderBy: any = sort
      ? { [sort.field]: sort.direction }
      : { createdAt: "desc" };

    const [events, total] = await Promise.all([
      prisma.inventoryEvent.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          item: true,
          fromLocation: true,
          toLocation: true,
          site: true,
          createdBy: true,
        },
      }),
      prisma.inventoryEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: events,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Search jobs
   */
  static async searchJobs(
    tenantId: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    const { query, filters = [], sort, page = 1, limit = 50 } = options;

    const where: any = { tenantId };

    if (query) {
      where.OR = [
        { jobNumber: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    for (const filter of filters) {
      const { field, operator, value } = filter;

      if (field === "status") {
        where.status = { in: value };
      } else if (field === "siteId") {
        where.siteId = value;
      } else if (field === "assignedToUserId") {
        where.assignedToUserId = value;
      } else if (field === "dateRange") {
        where.createdAt = { gte: value[0], lte: value[1] };
      }
    }

    const orderBy: any = sort
      ? { [sort.field]: sort.direction }
      : { createdAt: "desc" };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          site: true,
          workcell: true,
          assignedTo: true,
          lines: {
            include: {
              item: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Save a search for later use
   */
  static async saveSearch(
    userId: string,
    name: string,
    entityType: string,
    options: SearchOptions,
    description?: string
  ): Promise<string> {
    // Create saved search record
    // In a real implementation, would use a SavedSearch table
    const savedSearchId = `search-${Date.now()}`;

    // Store in user preferences or dedicated table
    console.log("Saving search:", {
      id: savedSearchId,
      userId,
      name,
      entityType,
      options,
      description,
    });

    return savedSearchId;
  }

  /**
   * Get saved searches for a user
   */
  static async getSavedSearches(
    userId: string,
    entityType?: string
  ): Promise<SavedSearch[]> {
    // In a real implementation, would fetch from database
    // For now, return sample data
    return [
      {
        id: "search-1",
        userId,
        name: "Low Stock Items",
        description: "Items below reorder point",
        entityType: "items",
        options: {
          filters: [
            {
              field: "reorderPointBase",
              operator: "gte",
              value: 1,
            },
          ],
          sort: {
            field: "name",
            direction: "asc",
          },
        },
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "search-2",
        userId,
        name: "Recent Transactions",
        description: "Last 7 days of inventory events",
        entityType: "events",
        options: {
          filters: [
            {
              field: "dateRange",
              operator: "between",
              value: [
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                new Date(),
              ],
            },
          ],
          sort: {
            field: "createdAt",
            direction: "desc",
          },
        },
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(searchId: string): Promise<boolean> {
    // In a real implementation, would delete from database
    console.log("Deleting saved search:", searchId);
    return true;
  }

  /**
   * Global search across multiple entities
   */
  static async globalSearch(
    tenantId: string,
    query: string,
    limit: number = 10
  ): Promise<{
    items: any[];
    jobs: any[];
    locations: any[];
    total: number;
  }> {
    const [items, jobs, locations] = await Promise.all([
      prisma.item.findMany({
        where: {
          tenantId,
          OR: [
            { sku: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
      }),
      prisma.job.findMany({
        where: {
          tenantId,
          OR: [
            { jobNumber: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
      }),
      prisma.location.findMany({
        where: {
          tenantId,
          OR: [
            { label: { contains: query, mode: "insensitive" } },
            { aisle: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
      }),
    ]);

    return {
      items,
      jobs,
      locations,
      total: items.length + jobs.length + locations.length,
    };
  }
}
