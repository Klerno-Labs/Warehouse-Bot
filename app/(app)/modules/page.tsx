"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Root /modules page
 * Redirects to the dashboard since there's no standalone modules overview page
 */
export default function ModulesPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to dashboard instead of showing a blank modules page
    router.replace("/");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
