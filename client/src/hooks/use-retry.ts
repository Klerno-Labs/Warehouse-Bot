import { useState, useCallback } from "react";

interface UseRetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Base delay between retries in milliseconds */
  baseDelay?: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
  /** Callback when retry starts */
  onRetry?: (attempt: number) => void;
  /** Callback when all retries exhausted */
  onMaxRetriesReached?: () => void;
}

interface UseRetryResult<T> {
  /** Execute the async function with retry logic */
  execute: (fn: () => Promise<T>) => Promise<T>;
  /** Current attempt number (0 = initial, 1+ = retries) */
  attempt: number;
  /** Whether currently retrying */
  isRetrying: boolean;
  /** Last error encountered */
  error: Error | null;
  /** Reset the retry state */
  reset: () => void;
  /** Manually trigger a retry */
  retry: () => Promise<T | undefined>;
}

/**
 * Hook for executing async functions with automatic retry logic
 *
 * @example
 * const { execute, isRetrying, error, retry } = useRetry({ maxAttempts: 3 });
 *
 * const fetchData = async () => {
 *   const result = await execute(() => api.getData());
 *   setData(result);
 * };
 */
export function useRetry<T>(options: UseRetryOptions = {}): UseRetryResult<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [attempt, setAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFn, setLastFn] = useState<(() => Promise<T>) | null>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T> => {
      setLastFn(() => fn);
      setError(null);
      setAttempt(0);

      let currentAttempt = 0;
      let lastError: Error | null = null;

      while (currentAttempt <= maxAttempts) {
        try {
          if (currentAttempt > 0) {
            setIsRetrying(true);
            onRetry?.(currentAttempt);

            const waitTime = exponentialBackoff
              ? baseDelay * Math.pow(2, currentAttempt - 1)
              : baseDelay;

            await delay(waitTime);
          }

          const result = await fn();
          setIsRetrying(false);
          setAttempt(currentAttempt);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          currentAttempt++;
          setAttempt(currentAttempt);
        }
      }

      setIsRetrying(false);
      setError(lastError);
      onMaxRetriesReached?.();
      throw lastError;
    },
    [maxAttempts, baseDelay, exponentialBackoff, onRetry, onMaxRetriesReached]
  );

  const retry = useCallback(async (): Promise<T | undefined> => {
    if (lastFn) {
      return execute(lastFn);
    }
    return undefined;
  }, [lastFn, execute]);

  const reset = useCallback(() => {
    setAttempt(0);
    setIsRetrying(false);
    setError(null);
    setLastFn(null);
  }, []);

  return {
    execute,
    attempt,
    isRetrying,
    error,
    reset,
    retry,
  };
}

/**
 * Hook for React Query integration with retry UI
 */
export function useQueryRetry() {
  const [retryCount, setRetryCount] = useState(0);

  const triggerRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    /** Key to add to query for forcing refetch */
    retryKey: retryCount,
    /** Function to trigger a retry */
    triggerRetry,
  };
}

export default useRetry;
