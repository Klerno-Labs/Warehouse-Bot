import { z } from "zod";

// Job status constants
export const JOB_STATUS = ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

// Job type constants
export const JOB_TYPE = [
  "RECEIVING",
  "PUTAWAY", 
  "PICK",
  "PACK",
  "SHIP",
  "TRANSFER",
  "ADJUSTMENT",
  "COUNT",
  "MAINTENANCE",
  "OTHER",
] as const;
export type JobType = (typeof JOB_TYPE)[number];

// Job priority constants
export const JOB_PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type JobPriority = (typeof JOB_PRIORITY)[number];

// Job line status
export const JOB_LINE_STATUS = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;
export type JobLineStatus = (typeof JOB_LINE_STATUS)[number];

// Job type
export type Job = {
  id: string;
  tenantId: string;
  siteId: string;
  jobNumber: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  assignedToUserId: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

// Job line type
export type JobLine = {
  id: string;
  jobId: string;
  tenantId: string;
  siteId: string;
  lineNumber: number;
  itemId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  qtyOrdered: number;
  qtyCompleted: number;
  uomId: string | null;
  status: JobLineStatus;
  notes: string | null;
  completedByUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Zod schemas for validation
export const createJobSchema = z.object({
  siteId: z.string().min(1),
  type: z.enum(JOB_TYPE),
  priority: z.enum(JOB_PRIORITY).default("NORMAL"),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  dueDate: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().optional(),
    fromLocationId: z.string().optional(),
    toLocationId: z.string().optional(),
    qtyOrdered: z.number().min(0),
    uomId: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
});

export const updateJobSchema = z.object({
  status: z.enum(JOB_STATUS).optional(),
  priority: z.enum(JOB_PRIORITY).optional(),
  description: z.string().optional(),
  assignedToUserId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const completeJobLineSchema = z.object({
  lineId: z.string().min(1),
  qtyCompleted: z.number().min(0),
  notes: z.string().optional(),
});

export const addJobLineSchema = z.object({
  itemId: z.string().optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  qtyOrdered: z.number().min(0),
  uomId: z.string().optional(),
  notes: z.string().optional(),
});

// Summary type for job details
export type JobSummary = {
  totalLines: number;
  completedLines: number;
  pendingLines: number;
  totalQtyOrdered: number;
  totalQtyCompleted: number;
};
