/**
 * System Health Monitoring
 *
 * Monitors system performance, database health, and API availability
 * Provides real-time metrics and alerts for system issues
 */

import { prisma } from "./prisma";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  uptime: number;
  checks: {
    database: HealthCheck;
    api: HealthCheck;
    storage: HealthCheck;
    cache: HealthCheck;
    services: HealthCheck;
  };
  metrics: SystemMetrics;
  alerts: HealthAlert[];
}

export interface HealthCheck {
  status: "pass" | "warn" | "fail";
  responseTime: number;
  message?: string;
  details?: any;
}

export interface SystemMetrics {
  requests: {
    total: number;
    perMinute: number;
    avgResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    activeQueries: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  memory: {
    used: number;
    total: number;
    percentUsed: number;
  };
  storage: {
    used: number;
    total: number;
    percentUsed: number;
  };
}

export interface HealthAlert {
  level: "info" | "warning" | "critical";
  component: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export class HealthMonitor {
  private static startTime = Date.now();
  private static requestCount = 0;
  private static requestTimes: number[] = [];
  private static errorCount = 0;

  /**
   * Get comprehensive health status
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkAPI(),
      this.checkStorage(),
      this.checkCache(),
      this.checkServices(),
    ]);

    const [database, api, storage, cache, services] = checks;

    const metrics = await this.getSystemMetrics();
    const alerts = this.generateAlerts({ database, api, storage, cache, services }, metrics);

    const overallStatus = this.calculateOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks: {
        database,
        api,
        storage,
        cache,
        services,
      },
      metrics,
      alerts,
    };
  }

  /**
   * Check database health
   */
  private static async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      // Check connection pool
      const connections = 10; // Would get from pool metrics

      // Check for slow queries
      const slowQueries = 0; // Would query pg_stat_statements

      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          status: "warn",
          responseTime,
          message: "Database response time is slow",
          details: { slowQueries },
        };
      }

      return {
        status: "pass",
        responseTime,
        details: { connections, slowQueries },
      };
    } catch (error: any) {
      return {
        status: "fail",
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * Check API health
   */
  private static async checkAPI(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Calculate metrics
      const totalRequests = this.requestCount;
      const avgResponseTime =
        this.requestTimes.length > 0
          ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
          : 0;
      const errorRate = totalRequests > 0 ? (this.errorCount / totalRequests) * 100 : 0;

      const responseTime = Date.now() - startTime;

      if (errorRate > 5) {
        return {
          status: "warn",
          responseTime,
          message: `High error rate: ${errorRate.toFixed(2)}%`,
          details: { totalRequests, avgResponseTime, errorRate },
        };
      }

      if (avgResponseTime > 500) {
        return {
          status: "warn",
          responseTime,
          message: `Slow API response: ${avgResponseTime.toFixed(0)}ms`,
          details: { totalRequests, avgResponseTime, errorRate },
        };
      }

      return {
        status: "pass",
        responseTime,
        details: { totalRequests, avgResponseTime, errorRate },
      };
    } catch (error: any) {
      return {
        status: "fail",
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * Check storage health
   */
  private static async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check disk space (would use actual filesystem API)
      const used = 50 * 1024 * 1024 * 1024; // 50 GB
      const total = 100 * 1024 * 1024 * 1024; // 100 GB
      const percentUsed = (used / total) * 100;

      const responseTime = Date.now() - startTime;

      if (percentUsed > 90) {
        return {
          status: "fail",
          responseTime,
          message: `Critical: Disk space ${percentUsed.toFixed(1)}% full`,
          details: { used, total, percentUsed },
        };
      }

      if (percentUsed > 80) {
        return {
          status: "warn",
          responseTime,
          message: `Warning: Disk space ${percentUsed.toFixed(1)}% full`,
          details: { used, total, percentUsed },
        };
      }

      return {
        status: "pass",
        responseTime,
        details: { used, total, percentUsed },
      };
    } catch (error: any) {
      return {
        status: "fail",
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * Check cache health (Redis, in-memory, etc.)
   */
  private static async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test cache operations
      // In production, would check Redis connection and response time

      const responseTime = Date.now() - startTime;

      return {
        status: "pass",
        responseTime,
        details: { type: "in-memory" },
      };
    } catch (error: any) {
      return {
        status: "warn",
        responseTime: Date.now() - startTime,
        message: `Cache unavailable: ${error.message}`,
      };
    }
  }

  /**
   * Check external services
   */
  private static async checkServices(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check external service availability
      const services = {
        email: true, // Would ping Resend API
        storage: true, // Would ping S3/storage
        auth: true, // Would ping Clerk
      };

      const allHealthy = Object.values(services).every((s) => s);
      const responseTime = Date.now() - startTime;

      if (!allHealthy) {
        return {
          status: "warn",
          responseTime,
          message: "Some external services are unavailable",
          details: services,
        };
      }

      return {
        status: "pass",
        responseTime,
        details: services,
      };
    } catch (error: any) {
      return {
        status: "fail",
        responseTime: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  /**
   * Get system metrics
   */
  private static async getSystemMetrics(): Promise<SystemMetrics> {
    // Calculate requests per minute
    const uptimeMinutes = (Date.now() - this.startTime) / 60000;
    const requestsPerMinute = uptimeMinutes > 0 ? this.requestCount / uptimeMinutes : 0;

    // Calculate average response time
    const avgResponseTime =
      this.requestTimes.length > 0
        ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
        : 0;

    // Calculate error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Memory metrics (would use process.memoryUsage())
    const memory = {
      used: 256 * 1024 * 1024, // 256 MB
      total: 512 * 1024 * 1024, // 512 MB
      percentUsed: 50,
    };

    // Storage metrics
    const storage = {
      used: 50 * 1024 * 1024 * 1024, // 50 GB
      total: 100 * 1024 * 1024 * 1024, // 100 GB
      percentUsed: 50,
    };

    // Database metrics
    const database = {
      connections: 10,
      activeQueries: 2,
      avgQueryTime: 15, // ms
      slowQueries: 0,
    };

    return {
      requests: {
        total: this.requestCount,
        perMinute: Math.round(requestsPerMinute),
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
      },
      database,
      memory,
      storage,
    };
  }

  /**
   * Generate health alerts based on checks and metrics
   */
  private static generateAlerts(
    checks: Record<string, HealthCheck>,
    metrics: SystemMetrics
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    // Database alerts
    if (checks.database.status === "fail") {
      alerts.push({
        level: "critical",
        component: "Database",
        message: checks.database.message || "Database connection failed",
        timestamp: new Date(),
        details: checks.database.details,
      });
    }

    // API performance alerts
    if (metrics.requests.errorRate > 5) {
      alerts.push({
        level: "warning",
        component: "API",
        message: `High error rate: ${metrics.requests.errorRate}%`,
        timestamp: new Date(),
        details: { errorRate: metrics.requests.errorRate },
      });
    }

    if (metrics.requests.avgResponseTime > 1000) {
      alerts.push({
        level: "warning",
        component: "API",
        message: `Slow response time: ${metrics.requests.avgResponseTime}ms`,
        timestamp: new Date(),
        details: { avgResponseTime: metrics.requests.avgResponseTime },
      });
    }

    // Storage alerts
    if (metrics.storage.percentUsed > 90) {
      alerts.push({
        level: "critical",
        component: "Storage",
        message: `Disk space critical: ${metrics.storage.percentUsed.toFixed(1)}% used`,
        timestamp: new Date(),
        details: metrics.storage,
      });
    } else if (metrics.storage.percentUsed > 80) {
      alerts.push({
        level: "warning",
        component: "Storage",
        message: `Disk space low: ${metrics.storage.percentUsed.toFixed(1)}% used`,
        timestamp: new Date(),
        details: metrics.storage,
      });
    }

    // Memory alerts
    if (metrics.memory.percentUsed > 90) {
      alerts.push({
        level: "critical",
        component: "Memory",
        message: `Memory usage critical: ${metrics.memory.percentUsed}%`,
        timestamp: new Date(),
        details: metrics.memory,
      });
    }

    // Database performance alerts
    if (metrics.database.slowQueries > 10) {
      alerts.push({
        level: "warning",
        component: "Database",
        message: `${metrics.database.slowQueries} slow queries detected`,
        timestamp: new Date(),
        details: { slowQueries: metrics.database.slowQueries },
      });
    }

    return alerts;
  }

  /**
   * Calculate overall system status
   */
  private static calculateOverallStatus(checks: HealthCheck[]): "healthy" | "degraded" | "unhealthy" {
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;

    if (failCount > 0) {
      return "unhealthy";
    }

    if (warnCount > 0) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Track API request
   */
  static trackRequest(responseTime: number, success: boolean): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);

    // Keep only last 1000 request times
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }

    if (!success) {
      this.errorCount++;
    }
  }

  /**
   * Reset metrics (for testing)
   */
  static resetMetrics(): void {
    this.requestCount = 0;
    this.requestTimes = [];
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Get simplified status (for status page)
   */
  static async getSimpleStatus(): Promise<{
    status: string;
    uptime: number;
    version: string;
  }> {
    const health = await this.getHealthStatus();

    return {
      status: health.status,
      uptime: health.uptime,
      version: "5.0.0",
    };
  }

  /**
   * Check if system is ready (for Kubernetes readiness probe)
   */
  static async isReady(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.status !== "unhealthy";
  }

  /**
   * Check if system is alive (for Kubernetes liveness probe)
   */
  static async isAlive(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  /**
   * Measure function execution time
   */
  static async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      console.log(`[Performance] ${name}: ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Performance] ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Create performance timer
   */
  static timer(name: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      console.log(`[Performance] ${name}: ${duration}ms`);
    };
  }

  /**
   * Track slow queries
   */
  static trackQuery(sql: string, duration: number, threshold: number = 1000): void {
    if (duration > threshold) {
      console.warn(`[Performance] Slow query (${duration}ms):`, sql.substring(0, 100));
    }
  }
}
