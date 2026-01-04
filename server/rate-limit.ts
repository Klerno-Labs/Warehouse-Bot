/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse, brute force attacks, and DDoS.
 * Uses sliding window algorithm for accurate rate limiting.
 */

import { NextResponse } from "next/server";
import { RateLimitError } from "./errors";
import { logger } from "./logger";
import { extractIPAddress } from "./validation";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
  onLimitReached?: (key: string) => void; // Callback when limit is reached
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamps of requests for sliding window
}

/**
 * In-memory rate limit store
 * In production, use Redis for distributed rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get rate limit entry
   */
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Increment request count using sliding window
   */
  increment(key: string, windowMs: number, maxRequests: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);

    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        requests: [now],
      };
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: entry.resetTime,
      };
    }

    // Remove requests outside the current window (sliding window)
    entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

    // Add current request
    entry.requests.push(now);
    entry.count = entry.requests.length;

    // Update reset time if needed
    if (entry.resetTime < now) {
      entry.resetTime = now + windowMs;
    }

    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limit store cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalKeys: number;
    totalRequests: number;
  } {
    let totalRequests = 0;

    for (const entry of this.store.values()) {
      totalRequests += entry.count;
    }

    return {
      totalKeys: this.store.size,
      totalRequests,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  return extractIPAddress(req);
}

/**
 * Rate limit middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skip,
    onLimitReached,
  } = config;

  return async (req: Request): Promise<NextResponse | null> => {
    // Skip rate limiting if specified
    if (skip && skip(req)) {
      return null;
    }

    try {
      const key = keyGenerator(req);
      const result = rateLimitStore.increment(key, windowMs, maxRequests);

      // Add rate limit headers
      const headers = {
        "X-RateLimit-Limit": maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
      };

      if (!result.allowed) {
        // Log rate limit violation
        logger.logSecurityEvent(
          "Rate limit exceeded",
          "medium",
          {
            key,
            limit: maxRequests,
            window: windowMs,
            url: req.url,
          }
        );

        if (onLimitReached) {
          onLimitReached(key);
        }

        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

        return NextResponse.json(
          {
            error: {
              message: "Too many requests, please try again later",
              code: "RATE_LIMIT_EXCEEDED",
              statusCode: 429,
              retryAfter,
            },
          },
          {
            status: 429,
            headers: {
              ...headers,
              "Retry-After": retryAfter.toString(),
            },
          }
        );
      }

      // Request allowed - continue (headers will be added by middleware)
      return null;
    } catch (error) {
      logger.error("Rate limit middleware error", error as Error);
      // On error, allow the request to continue
      return null;
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * Prevents brute force attacks
   */
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
  },

  /**
   * Standard rate limit for API endpoints
   */
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  /**
   * Generous rate limit for read-only endpoints
   */
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 requests per minute
  },

  /**
   * Strict rate limit for write endpoints
   */
  WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },

  /**
   * Very strict rate limit for sensitive operations
   */
  SENSITIVE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 requests per hour
  },
};

/**
 * Rate limit by user ID instead of IP
 */
export function rateLimitByUser(config: RateLimitConfig, getUserId: (req: Request) => string | null) {
  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      const userId = getUserId(req);
      if (userId) {
        return `user:${userId}`;
      }
      // Fallback to IP if user is not authenticated
      return `ip:${extractIPAddress(req)}`;
    },
  });
}

/**
 * Rate limit by tenant ID
 */
export function rateLimitByTenant(config: RateLimitConfig, getTenantId: (req: Request) => string | null) {
  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      const tenantId = getTenantId(req);
      if (tenantId) {
        return `tenant:${tenantId}`;
      }
      // Fallback to IP if tenant is not identified
      return `ip:${extractIPAddress(req)}`;
    },
  });
}

/**
 * Composite rate limiting - multiple limits at once
 * Example: Per-IP limit + Per-User limit
 */
export function compositeRateLimit(configs: Array<{
  config: RateLimitConfig;
  name: string;
}>) {
  return async (req: Request): Promise<NextResponse | null> => {
    for (const { config, name } of configs) {
      const limiter = rateLimit(config);
      const result = await limiter(req);

      if (result) {
        // Rate limit exceeded
        logger.warn(`Composite rate limit exceeded: ${name}`, {
          url: req.url,
        });
        return result;
      }
    }

    return null;
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.reset(key);
  logger.info(`Rate limit reset for key: ${key}`);
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return rateLimitStore.getStats();
}

/**
 * Clear all rate limits (use with caution)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  logger.warn("All rate limits cleared");
}

/**
 * Helper to create rate limit response with proper headers
 */
export function createRateLimitResponse(
  message: string = "Too many requests",
  retryAfter: number
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code: "RATE_LIMIT_EXCEEDED",
        statusCode: 429,
        retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": "0",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * DDoS protection - block IPs with excessive requests
 */
class DDoSProtection {
  private blockedIPs: Map<string, number> = new Map(); // IP -> unblock time
  private readonly blockDuration = 60 * 60 * 1000; // 1 hour

  /**
   * Check if IP is blocked
   */
  isBlocked(ip: string): boolean {
    const unblockTime = this.blockedIPs.get(ip);

    if (unblockTime) {
      if (Date.now() < unblockTime) {
        return true;
      } else {
        // Unblock time passed, remove from blocklist
        this.blockedIPs.delete(ip);
      }
    }

    return false;
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, duration: number = this.blockDuration): void {
    const unblockTime = Date.now() + duration;
    this.blockedIPs.set(ip, unblockTime);

    logger.logSecurityEvent(
      "IP blocked due to DDoS protection",
      "high",
      {
        ip,
        duration,
        unblockTime: new Date(unblockTime).toISOString(),
      }
    );
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    logger.info(`IP unblocked: ${ip}`);
  }

  /**
   * Get all blocked IPs
   */
  getBlockedIPs(): Array<{ ip: string; unblockTime: Date }> {
    const now = Date.now();
    const blocked: Array<{ ip: string; unblockTime: Date }> = [];

    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (unblockTime > now) {
        blocked.push({ ip, unblockTime: new Date(unblockTime) });
      }
    }

    return blocked;
  }

  /**
   * Clear all blocked IPs
   */
  clearAll(): void {
    this.blockedIPs.clear();
    logger.warn("All blocked IPs cleared");
  }
}

export const ddosProtection = new DDoSProtection();

/**
 * DDoS protection middleware
 */
export function ddosProtectionMiddleware() {
  return async (req: Request): Promise<NextResponse | null> => {
    const ip = extractIPAddress(req);

    if (ddosProtection.isBlocked(ip)) {
      logger.logSecurityEvent(
        "Blocked IP attempted request",
        "high",
        {
          ip,
          url: req.url,
        }
      );

      return NextResponse.json(
        {
          error: {
            message: "Your IP has been temporarily blocked due to suspicious activity",
            code: "IP_BLOCKED",
            statusCode: 403,
          },
        },
        { status: 403 }
      );
    }

    return null;
  };
}
