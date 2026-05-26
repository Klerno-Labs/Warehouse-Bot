import type { Role } from "./prisma-enums";

// Module ID type for routing
export type ModuleId = "inventory" | "cycle-counts" | "jobs" | "dashboards";

// Session user type for authentication
export type SessionUser = {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  siteIds: string[];
  isActive: boolean;
};

// Site type for user context
export type Site = {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};
