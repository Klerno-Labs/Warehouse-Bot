"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { InstallPWA } from "@/components/pwa/InstallPWA";
import { registerServiceWorker } from "@/lib/pwa/registerServiceWorker";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on client side only
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <AuthProvider>
              {children}
              <InstallPWA />
            </AuthProvider>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
