/**
 * Health Check Endpoint
 *
 * Provides comprehensive health status for monitoring, load balancers, and observability.
 * Implements Kubernetes-style readiness and liveness probes.
 */

import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@server/prisma";
import { circuitBreakerRegistry } from "@server/resilience";
import { getRateLimitStats } from "@server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Health check response
 */
interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
    memory: HealthCheckResult;
    circuitBreakers?: Record<string, any>;
    rateLimits?: Record<string, any>;
  };
  metadata?: {
    environment: string;
    nodeVersion: string;
    platform: string;
  };
}

interface HealthCheckResult {
  status: "pass" | "warn" | "fail";
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

// Track application start time
const appStartTime = Date.now();

/**
 * GET /api/health - Full health check
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkType = searchParams.get("type") || "full";

  try {
    // Liveness probe - basic check to see if app is running
    if (checkType === "live" || checkType === "liveness") {
      return NextResponse.json(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Readiness probe - check if app is ready to serve traffic
    if (checkType === "ready" || checkType === "readiness") {
      const dbHealth = await checkDatabaseHealth();

      if (!dbHealth.healthy) {
        return NextResponse.json(
          {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            reason: "Database not ready",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Full health check
    const healthCheck = await performFullHealthCheck();

    const statusCode = healthCheck.status === "healthy"
      ? 200
      : healthCheck.status === "degraded"
        ? 200 // Still return 200 for degraded but log warning
        : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}

/**
 * Perform comprehensive health check
 */
async function performFullHealthCheck(): Promise<HealthCheck> {
  const checks: HealthCheck["checks"] = {
    database: { status: "pass" },
    memory: { status: "pass" },
  };

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // Check database
  try {
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.healthy) {
      checks.database = {
        status: dbHealth.responseTime > 1000 ? "warn" : "pass",
        responseTime: dbHealth.responseTime,
        message: dbHealth.responseTime > 1000
          ? "Database responding slowly"
          : "Database healthy",
      };

      if (checks.database.status === "warn") {
        overallStatus = "degraded";
      }
    } else {
      checks.database = {
        status: "fail",
        message: dbHealth.error || "Database unreachable",
      };
      overallStatus = "unhealthy";
    }
  } catch (error: any) {
    checks.database = {
      status: "fail",
      message: error.message,
    };
    overallStatus = "unhealthy";
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    checks.memory = {
      status: heapUsedPercent > 90 ? "warn" : "pass",
      message: `Heap usage: ${heapUsedPercent.toFixed(2)}%`,
      details: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
    };

    if (checks.memory.status === "warn" && overallStatus === "healthy") {
      overallStatus = "degraded";
    }
  } catch (error: any) {
    checks.memory = {
      status: "warn",
      message: "Could not check memory usage",
    };
  }

  // Check circuit breakers
  try {
    const breakerStatus = circuitBreakerRegistry.getHealthStatus();
    checks.circuitBreakers = breakerStatus;

    // If any circuit breaker is OPEN, mark as degraded
    for (const [name, stats] of Object.entries(breakerStatus)) {
      if ((stats as any).state === "OPEN") {
        if (overallStatus === "healthy") {
          overallStatus = "degraded";
        }
      }
    }
  } catch (error) {
    // Circuit breaker check is optional
  }

  // Check rate limits
  try {
    checks.rateLimits = getRateLimitStats();
  } catch (error) {
    // Rate limit check is optional
  }

  const healthCheck: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - appStartTime,
    version: process.env.APP_VERSION || "development",
    checks,
    metadata: {
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  return healthCheck;
}
