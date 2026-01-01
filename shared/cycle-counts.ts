import { z } from "zod";

export const CYCLE_COUNT_STATUS = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type CycleCountStatus = (typeof CYCLE_COUNT_STATUS)[number];

export const COUNT_LINE_STATUS = [
  "PENDING",
  "COUNTED",
  "VARIANCE_APPROVED",
  "VARIANCE_REJECTED",
] as const;
export type CountLineStatus = (typeof COUNT_LINE_STATUS)[number];

export const CYCLE_COUNT_TYPE = [
  "FULL",
  "ABC",
  "RANDOM",
  "LOCATION",
  "ITEM",
] as const;
export type CycleCountType = (typeof CYCLE_COUNT_TYPE)[number];

// Cycle Count Header
export type CycleCount = {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  type: CycleCountType;
  status: CycleCountStatus;
  scheduledDate: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  assignedToUserId?: string | null;
  notes?: string | null;
  createdByUserId: string;
  createdAt: Date;
};

// Cycle Count Line (individual item/location count)
export type CycleCountLine = {
  id: string;
  cycleCountId: string;
  tenantId: string;
  siteId: string;
  itemId: string;
  locationId: string;
  expectedQtyBase: number;
  countedQtyBase?: number | null;
  varianceQtyBase?: number | null;
  status: CountLineStatus;
  countedByUserId?: string | null;
  countedAt?: Date | null;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
};

// Variance threshold settings
export type VarianceThreshold = {
  absoluteQty?: number;
  percentageQty?: number;
};

// Schemas for validation
export const createCycleCountSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(CYCLE_COUNT_TYPE),
  scheduledDate: z.string().transform((s) => new Date(s)),
  assignedToUserId: z.string().optional(),
  notes: z.string().optional(),
  // For generating lines
  locationIds: z.array(z.string()).optional(),
  itemIds: z.array(z.string()).optional(),
});

export const updateCycleCountSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(CYCLE_COUNT_STATUS).optional(),
  scheduledDate: z.string().transform((s) => new Date(s)).optional(),
  assignedToUserId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const recordCountSchema = z.object({
  cycleCountLineId: z.string().min(1),
  countedQtyBase: z.number().min(0),
  notes: z.string().optional(),
});

export const approveVarianceSchema = z.object({
  cycleCountLineId: z.string().min(1),
  approved: z.boolean(),
  notes: z.string().optional(),
});

// Summary stats
export type CycleCountSummary = {
  totalLines: number;
  pendingLines: number;
  countedLines: number;
  varianceLines: number;
  approvedLines: number;
  rejectedLines: number;
  totalVarianceValue: number;
};
