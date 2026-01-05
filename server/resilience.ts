/**
 * Resilience Patterns for Reliable System Operation
 *
 * Implements retry logic, circuit breakers, and graceful degradation
 * to handle transient failures and external service outages.
 */

import { logger } from "./logger";
import { ExternalServiceError, DatabaseError } from "./errors";

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error codes that should be retried
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (config.retryableErrors && config.retryableErrors.length > 0) {
        const errorCode = error.code || error.constructor.name;
        if (!config.retryableErrors.includes(errorCode)) {
          // Non-retryable error, throw immediately
          throw error;
        }
      }

      // Last attempt, don't retry
      if (attempt === config.maxRetries) {
        break;
      }

      // Log retry attempt
      logger.warn(`Retry attempt ${attempt + 1}/${config.maxRetries}`, {
        error: error.message,
        nextDelay: delay,
      });

      // Call retry callback
      if (config.onRetry) {
        config.onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  logger.error("Max retries exceeded", lastError!);
  throw lastError!;
}

/**
 * Retry specifically for database operations
 */
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  operation: string = "Database operation"
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 2000,
    retryableErrors: [
      "P1001", // Can't reach database server
      "P1002", // Database server timeout
      "P1008", // Operations timed out
      "P1017", // Server has closed the connection
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ECONNRESET",
    ],
    onRetry: (attempt, error) => {
      logger.warn(`Database retry ${attempt} for: ${operation}`, {
        error: error.message,
      });
    },
  });
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing, reject requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes before closing from half-open
  timeout: number; // Time in ms to wait before attempting half-open
  resetTimeout: number; // Time in ms to reset failure count
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

const DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  resetTimeout: 30000, // 30 seconds
};

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is down.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private lastFailureTime: number = 0;
  private options: CircuitBreakerOptions;
  private readonly serviceName: string;

  constructor(serviceName: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.serviceName = serviceName;
    this.options = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };

    logger.info(`Circuit breaker initialized for: ${serviceName}`, {
      options: this.options,
    });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new ExternalServiceError(
          this.serviceName,
          "Circuit breaker is OPEN - service temporarily unavailable"
        );
      }

      // Attempt to recover - move to half-open
      this.changeState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }

    // Reset failure count if enough time has passed
    if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    logger.warn(`Circuit breaker failure for ${this.serviceName}`, {
      failureCount: this.failureCount,
      threshold: this.options.failureThreshold,
      error: error.message,
    });

    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  private trip(): void {
    this.changeState(CircuitState.OPEN);
    this.nextAttempt = Date.now() + this.options.timeout;

    logger.error(`Circuit breaker OPENED for ${this.serviceName}`, undefined, {
      failureCount: this.failureCount,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    });
  }

  /**
   * Change circuit state
   */
  private changeState(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState !== newState) {
      this.state = newState;

      logger.info(`Circuit breaker state change: ${this.serviceName}`, {
        from: oldState,
        to: newState,
      });

      if (this.options.onStateChange) {
        this.options.onStateChange(oldState, newState);
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.changeState(CircuitState.CLOSED);
    logger.info(`Circuit breaker manually reset: ${this.serviceName}`);
  }
}

/**
 * Global circuit breaker registry
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker for service
   */
  getBreaker(serviceName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getStats();
    });

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
    logger.info("All circuit breakers reset");
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Timeout wrapper with cancellation
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Graceful degradation wrapper
 *
 * Executes function with fallback on failure
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: () => Promise<T> | T,
  onFallback?: (error: Error) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.warn("Primary operation failed, using fallback", {
      error: (error as Error).message,
    });

    if (onFallback) {
      onFallback(error as Error);
    }

    return await Promise.resolve(fallback());
  }
}

/**
 * Bulk operation with error collection
 *
 * Executes operations in parallel and collects errors without failing completely
 */
export async function bulkExecute<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
  } = {}
): Promise<{
  results: R[];
  errors: Array<{ item: T; error: Error }>;
}> {
  const { concurrency = 10, continueOnError = true } = options;
  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];

  // Process in batches for concurrency control
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map((item) => fn(item))
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const item = batch[index];
        errors.push({ item, error: result.reason });

        if (!continueOnError) {
          throw result.reason;
        }
      }
    });
  }

  return { results, errors };
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async waitForTokens(tokens: number = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      const waitTime = (tokens / this.refillRate) * 1000;
      await sleep(Math.min(waitTime, 1000));
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let resolvePromise: ((value: ReturnType<T>) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolvePromise = resolve;

      timeoutId = setTimeout(async () => {
        const result = await fn(...args);
        if (resolvePromise) {
          resolvePromise(result);
        }
      }, delayMs);
    });
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;

  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();

    if (now - lastCall >= limitMs) {
      lastCall = now;
      return fn(...args);
    }

    return undefined;
  };
}
