/**
 * Prisma Client Configuration with Connection Pooling and Query Logging
 *
 * Implements proper connection management, query logging, and graceful shutdown
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { DatabaseError } from "./errors";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Parse connection pool settings from environment or use defaults
 */
function getConnectionPoolConfig() {
  return {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "20", 10),
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || "30", 10),
    statementCacheSize: parseInt(process.env.DB_STATEMENT_CACHE_SIZE || "500", 10),
  };
}

/**
 * Create Prisma Client with production-ready configuration
 */
function createPrismaClient(): PrismaClient {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const poolConfig = getConnectionPoolConfig();

  // Log configuration on startup
  logger.info("Initializing Prisma client", {
    environment: process.env.NODE_ENV,
    connectionLimit: poolConfig.connectionLimit,
  });

  const client = new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "event",
        level: "error",
      },
      {
        emit: "event",
        level: "warn",
      },
    ],
    // Connection pool configuration via datasource URL
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Query logging for performance monitoring
  client.$on("query" as any, (e: any) => {
    if (isDevelopment || process.env.LOG_QUERIES === "true") {
      logger.logQuery(e.query.split(" ")[0], e.target || "unknown", e.duration, {
        query: e.query,
        params: e.params,
      });
    }

    // Log slow queries in production
    if (!isDevelopment && e.duration > 1000) {
      logger.warn("Slow query detected", {
        query: e.query,
        duration: e.duration,
        target: e.target,
      });
    }
  });

  // Error logging
  client.$on("error" as any, (e: any) => {
    logger.error("Prisma client error", new Error(e.message), {
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  // Warning logging
  client.$on("warn" as any, (e: any) => {
    logger.warn("Prisma warning", {
      message: e.message,
      target: e.target,
    });
  });

  return client;
}

/**
 * Singleton Prisma client instance
 */
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      healthy: true,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    logger.error("Database health check failed", error);

    return {
      healthy: false,
      responseTime,
      error: error.message,
    };
  }
}

/**
 * Graceful shutdown - disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    logger.info("Disconnecting from database...");
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error: any) {
    logger.error("Error disconnecting from database", error);
    throw new DatabaseError("Failed to disconnect from database", error);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      await disconnectDatabase();
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", error as Error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGUSR2", () => shutdown("SIGUSR2")); // Nodemon restart

  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (error: Error) => {
    logger.fatal("Uncaught exception", error);
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.fatal("Unhandled rejection", new Error(String(reason)), {
      promise: String(promise),
    });
    shutdown("unhandledRejection");
  });
}

// Initialize graceful shutdown in production
if (process.env.NODE_ENV === "production" || process.env.ENABLE_GRACEFUL_SHUTDOWN === "true") {
  setupGracefulShutdown();
}

/**
 * Transaction wrapper with retry logic
 */
export async function withTransaction<T>(
  fn: (tx: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const retryableCodes = ["P1001", "P1002", "P1008", "P1017"];
      const isRetryable = retryableCodes.includes(error.code);

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      logger.warn(`Transaction failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        error: error.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Execute query with automatic retry on transient failures
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string = "Database operation"
): Promise<T> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Transient error codes that should be retried
      const transientErrors = [
        "P1001", // Can't reach database server
        "P1002", // Database server timeout
        "P1008", // Operations timed out
        "P1017", // Server has closed the connection
      ];

      const isTransient = transientErrors.includes(error.code) ||
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("ETIMEDOUT");

      if (!isTransient || attempt === maxRetries - 1) {
        logger.error(`${operationName} failed`, error);
        throw new DatabaseError(operationName, error);
      }

      const delay = Math.min(100 * Math.pow(2, attempt), 2000);
      logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        error: error.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new DatabaseError(operationName, lastError!);
}
