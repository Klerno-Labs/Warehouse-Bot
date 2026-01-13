import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && (
        <p className={`${textSizeClasses[size]} text-muted-foreground`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Table loading state with skeleton rows
 */
interface TableLoadingProps {
  columns?: number;
  rows?: number;
}

export function TableLoading({ columns = 5, rows = 5 }: TableLoadingProps) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Inline loading text for tables/lists
 */
export function InlineLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

/**
 * Card/metric loading skeleton
 */
export function CardLoading() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/**
 * Page loading wrapper - use for initial page loads
 */
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}
