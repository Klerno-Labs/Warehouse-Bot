/**
 * Prisma Enum Definitions
 * These are manually maintained to match prisma/schema.prisma
 * Used when Prisma client cannot be regenerated
 */

export enum Role {
  // Tier 1: Operators
  Operator = 'Operator',

  // Tier 2: Management
  Supervisor = 'Supervisor',
  Inventory = 'Inventory',
  Purchasing = 'Purchasing',
  Maintenance = 'Maintenance',
  QC = 'QC',

  // Tier 3: Sales
  Sales = 'Sales',

  // Tier 4: Engineering
  Engineering = 'Engineering',

  // Tier 5: Executive
  Manager = 'Manager',
  Executive = 'Executive',

  // Tier 6: System Administration
  Admin = 'Admin',
  Viewer = 'Viewer',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
  PAUSED = 'PAUSED',
}

export enum PlanTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
