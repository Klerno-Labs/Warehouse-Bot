/**
 * Cache Utility Module
 * 
 * Provides in-memory caching with TTL support for frequently accessed data.
 * Can be upgraded to Redis for production deployments.
 * 
 * USAGE:
 * ```typescript
 * import { cache } from "@/server/cache";
 * 
 * // Simple caching
 * const data = await cache.getOrSet("dashboard-stats", fetchStats, 60); // 60 second TTL
 * 
 * // Manual operations
 * cache.set("key", data, 300); // 5 minute TTL
 * const cached = cache.get("key");
 * cache.delete("key");
 * cache.clear(); // Clear all cache
 * ```
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a cached value with TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    this.cache.set(key, entry);
  }

  /**
   * Get a cached value or compute and cache it
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all cached values matching a pattern (prefix)
   */
  deletePattern(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Cache key builders for consistency
export const cacheKeys = {
  dashboardStats: (tenantId: string) => `dashboard:stats:${tenantId}`,
  inventoryBalances: (siteId: string) => `inventory:balances:${siteId}`,
  itemsByTenant: (tenantId: string) => `items:tenant:${tenantId}`,
  item: (itemId: string) => `items:${itemId}`,
  productionOrders: (tenantId: string) => `production:orders:${tenantId}`,
  userSession: (userId: string) => `session:${userId}`,
  tenantModules: (tenantId: string) => `tenant:modules:${tenantId}`,
};

// Cache TTL values in seconds
export const cacheTTL = {
  short: 30,        // 30 seconds - for real-time data
  medium: 300,      // 5 minutes - for dashboard stats
  long: 1800,       // 30 minutes - for rarely changing data
  session: 3600,    // 1 hour - for user sessions
};

// Export singleton instance
export const cache = new MemoryCache();

// For testing - create new instance
export const createCache = () => new MemoryCache();
