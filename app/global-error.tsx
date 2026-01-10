"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error page for root layout errors.
 * This is a fallback for errors that occur outside of nested error boundaries.
 * Must include its own <html> and <body> tags as it replaces the root layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div
          className="flex min-h-screen w-full items-center justify-center p-6"
          role="main"
          aria-labelledby="error-title"
        >
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                aria-hidden="true"
              >
                <AlertTriangle
                  className="h-8 w-8"
                  style={{ color: "#ef4444" }}
                />
              </div>
              <h1
                id="error-title"
                className="text-xl font-semibold"
                style={{ color: "#1f2937" }}
              >
                Application Error
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "#6b7280" }}
              >
                A critical error occurred. Please reload the page.
              </p>
              {error.digest && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: "#9ca3af" }}
                >
                  Error ID: {error.digest}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                  }}
                  aria-label="Try to recover from error"
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "#2563eb",
                    color: "white",
                  }}
                  aria-label="Reload the application"
                >
                  Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
