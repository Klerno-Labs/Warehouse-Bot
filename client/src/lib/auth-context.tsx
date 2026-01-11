import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SessionUser, Site } from "@shared/schema";
import { apiRequest } from "./queryClient";

type AuthContextType = {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentSite: Site | null;
  availableSites: Site[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectSite: (site: Site) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAvailableSites(data.sites || []);
        if (data.sites?.length === 1) {
          setCurrentSite(data.sites[0]);
        } else {
          const storedSiteId = localStorage.getItem("currentSiteId");
          if (storedSiteId) {
            const site = data.sites?.find((s: Site) => s.id === storedSiteId);
            if (site) setCurrentSite(site);
          }
        }
      } else if (response.status === 401) {
        // Expected when not logged in - silently set user to null
        setUser(null);
        setAvailableSites([]);
        setCurrentSite(null);
      } else {
        // Unexpected error status
        console.error("Auth check failed with status:", response.status);
        setUser(null);
        setAvailableSites([]);
        setCurrentSite(null);
      }
    } catch (error) {
      // Network or parsing error
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    setUser(data.user);
    setAvailableSites(data.sites || []);
    if (data.sites?.length === 1) {
      setCurrentSite(data.sites[0]);
    }
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    setCurrentSite(null);
    setAvailableSites([]);
    localStorage.removeItem("currentSiteId");
  };

  const selectSite = (site: Site) => {
    setCurrentSite(site);
    localStorage.setItem("currentSiteId", site.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        currentSite,
        availableSites,
        login,
        logout,
        selectSite,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
