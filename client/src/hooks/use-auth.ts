/**
 * Authentication Hook
 * Provides access to the current user and authentication state
 */

import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  siteIds: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from session
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user session:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
