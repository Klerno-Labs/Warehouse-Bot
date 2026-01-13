"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example with custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex items-center justify-center min-h-[400px] p-4"
          role="alert"
          aria-live="assertive"
        >
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle
                  className="h-6 w-6 text-destructive"
                  aria-hidden="true"
                />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again or refresh the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-semibold">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  aria-label="Try again without reloading the page"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  aria-label="Reload the entire page"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to trigger error boundary from functional components
 */
export function useErrorBoundary(): { showBoundary: (error: Error) => void } {
  const [, setError] = React.useState<Error | null>(null);

  const showBoundary = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return { showBoundary };
}

/**
 * Wrapper component for async data fetching with error handling
 */
interface AsyncBoundaryProps {
  children: React.ReactNode;
  error: Error | null;
  isLoading: boolean;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
}

export function AsyncBoundary({
  children,
  error,
  isLoading,
  onRetry,
  loadingFallback,
}: AsyncBoundaryProps): React.ReactNode {
  if (isLoading) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-[200px]" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center"
        role="alert"
        aria-live="polite"
      >
        <AlertTriangle
          className="h-10 w-10 text-destructive mb-4"
          aria-hidden="true"
        />
        <h3 className="font-semibold text-lg mb-2">Failed to load data</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {error.message || "An error occurred while loading. Please try again."}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            aria-label="Retry loading the data"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export default ErrorBoundary;
