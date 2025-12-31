"use client";

import { MainLayout } from "@/components/main-layout";
import LoginPage from "@/pages/login";
import SiteSelectorPage from "@/pages/site-selector";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, currentSite, availableSites } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!currentSite && availableSites.length > 1) {
    return <SiteSelectorPage />;
  }

  return <MainLayout>{children}</MainLayout>;
}
