/**
 * Structured Logging System
 *
 * Provides comprehensive logging with log levels, context tracking,
 * and integration with monitoring systems (Sentry, DataDog, etc.)
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export interface LogContext {
  userId?: string;
  tenantId?: string;
  siteId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  metadata?: Record<string, any>;
}

class Logger {
  private context: LogContext = {};
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() || "info";
    this.logLevel = this.parseLogLevel(envLogLevel);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level) {
      case "debug":
        return LogLevel.DEBUG;
      case "info":
        return LogLevel.INFO;
      case "warn":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      case "fatal":
        return LogLevel.FATAL;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context },
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private outputLog(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }

    // Send to external monitoring services
    this.sendToMonitoring(entry);
  }

  private sendToMonitoring(entry: LogEntry): void {
    // In production, send to Sentry, DataDog, CloudWatch, etc.
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry integration
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
        // Sentry.captureException(entry.error);
      }
    }
  }

  /**
   * Set context for all subsequent logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context keys
   */
  clearContext(keys?: string[]): void {
    if (keys) {
      keys.forEach((key) => delete this.context[key]);
    } else {
      this.context = {};
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    childLogger.logLevel = this.logLevel;
    return childLogger;
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatLogEntry(LogLevel.DEBUG, message, metadata);
    this.outputLog(entry);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.formatLogEntry(LogLevel.INFO, message, metadata);
    this.outputLog(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.formatLogEntry(LogLevel.WARN, message, metadata);
    this.outputLog(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.formatLogEntry(LogLevel.ERROR, message, metadata, error);
    this.outputLog(entry);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;

    const entry = this.formatLogEntry(LogLevel.FATAL, message, metadata, error);
    this.outputLog(entry);
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    const entry = this.formatLogEntry(
      level,
      `${method} ${path} ${statusCode}`,
      {
        ...metadata,
        method,
        path,
        statusCode,
      }
    );

    entry.duration = duration;
    this.outputLog(entry);
  }

  /**
   * Log database query
   */
  logQuery(
    operation: string,
    model: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatLogEntry(
      LogLevel.DEBUG,
      `DB Query: ${operation} on ${model}`,
      {
        ...metadata,
        operation,
        model,
      }
    );

    entry.duration = duration;
    this.outputLog(entry);
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    metadata?: Record<string, any>
  ): void {
    const level = severity === "critical" || severity === "high" ? LogLevel.ERROR : LogLevel.WARN;

    const entry = this.formatLogEntry(
      level,
      `Security Event: ${event}`,
      {
        ...metadata,
        eventType: "security",
        severity,
      }
    );

    this.outputLog(entry);

    // In production, send to security monitoring
    if (process.env.NODE_ENV === "production" && (severity === "high" || severity === "critical")) {
      // Alert security team
      this.alertSecurityTeam(event, severity, metadata);
    }
  }

  /**
   * Log audit event
   */
  logAudit(
    action: string,
    resource: string,
    resourceId: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.formatLogEntry(
      LogLevel.INFO,
      `Audit: ${action} ${resource} ${resourceId}`,
      {
        ...metadata,
        eventType: "audit",
        action,
        resource,
        resourceId,
      }
    );

    this.outputLog(entry);
  }

  /**
   * Log performance metric
   */
  logPerformance(
    metric: string,
    value: number,
    unit: string = "ms",
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatLogEntry(
      LogLevel.DEBUG,
      `Performance: ${metric} = ${value}${unit}`,
      {
        ...metadata,
        eventType: "performance",
        metric,
        value,
        unit,
      }
    );

    this.outputLog(entry);
  }

  private alertSecurityTeam(
    event: string,
    severity: string,
    metadata?: Record<string, any>
  ): void {
    // In production, send alert via email/Slack/PagerDuty
    // For now, just log
    this.warn("Security alert triggered", {
      event,
      severity,
      ...metadata,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for creating contextual loggers
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

/**
 * Request timing utility
 */
export class RequestTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log the request duration
   */
  logDuration(message: string, metadata?: Record<string, any>): void {
    const duration = this.elapsed();
    logger.info(message, { ...metadata, duration });
  }
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const timer = new RequestTimer();
    const methodName = `${target.constructor.name}.${propertyKey}`;

    try {
      const result = await originalMethod.apply(this, args);
      logger.logPerformance(methodName, timer.elapsed());
      return result;
    } catch (error) {
      logger.error(`Error in ${methodName}`, error as Error);
      throw error;
    }
  };

  return descriptor;
}
