"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Application error:", error);
    }
  }, [error]);

  return (
    <div
      className="flex h-full min-h-[400px] w-full items-center justify-center p-6"
      role="main"
      aria-labelledby="error-title"
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 id="error-title" className="text-xl font-semibold">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-md bg-muted p-3 text-left text-xs font-mono overflow-auto max-h-32">
              <p className="text-destructive font-semibold break-words">
                {error.name}: {error.message}
              </p>
            </div>
          )}

          <div
            className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center"
            role="group"
            aria-label="Recovery options"
          >
            <Button
              variant="outline"
              onClick={reset}
              aria-label="Try to recover from error"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
            <Button asChild aria-label="Return to dashboard">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
