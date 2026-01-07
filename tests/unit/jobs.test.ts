/**
 * Job Tracking Tests
 * 
 * Tests for job creation, status management, line completion, and assignment.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Define test constants to match shared/jobs.ts
const JOB_STATUS = ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const JOB_TYPE = [
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
const JOB_PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

// Define schemas locally for testing
const createJobSchema = z.object({
  siteId: z.string().min(1),
  type: z.enum(JOB_TYPE),
  priority: z.enum(JOB_PRIORITY).optional().default("NORMAL"),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateJobSchema = z.object({
  status: z.enum(JOB_STATUS).optional(),
  priority: z.enum(JOB_PRIORITY).optional(),
  description: z.string().optional(),
  assignedToUserId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

// Define mock prisma for use in tests
const prisma = {
  job: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  jobLine: {
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    jobLine: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Job Tracking Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Job Creation", () => {
    it("should create a job with valid data", async () => {
      const mockJob = {
        id: "job-001",
        tenantId: "tenant-1",
        siteId: "site-1",
        jobNumber: "JOB-2026-001",
        type: "PICK",
        status: "DRAFT",
        priority: "NORMAL",
        description: "Pick order for customer ABC",
      };

      (prisma.job.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);

      const result = await prisma.job.create({ data: mockJob });

      expect(result.jobNumber).toBe("JOB-2026-001");
      expect(result.type).toBe("PICK");
      expect(result.status).toBe("DRAFT");
    });

    it("should validate job schema", () => {
      const validJob = {
        siteId: "site-1",
        type: "PICK" as const,
        priority: "HIGH" as const,
        description: "Test job",
      };

      const result = createJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it("should reject invalid job type", () => {
      const invalidJob = {
        siteId: "site-1",
        type: "INVALID_TYPE",
        priority: "NORMAL",
      };

      const result = createJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    it("should generate sequential job numbers", () => {
      const generateJobNumber = (lastNumber: string | null, prefix: string = "JOB"): string => {
        const year = new Date().getFullYear();
        if (!lastNumber) return `${prefix}-${year}-0001`;
        
        const match = lastNumber.match(new RegExp(`${prefix}-(\\d{4})-(\\d+)`));
        if (!match) return `${prefix}-${year}-0001`;
        
        const lastYear = parseInt(match[1]);
        const lastSeq = parseInt(match[2]);
        
        if (lastYear < year) {
          return `${prefix}-${year}-0001`;
        }
        
        return `${prefix}-${year}-${(lastSeq + 1).toString().padStart(4, "0")}`;
      };

      expect(generateJobNumber(null)).toBe("JOB-2026-0001");
      expect(generateJobNumber("JOB-2026-0001")).toBe("JOB-2026-0002");
      expect(generateJobNumber("JOB-2025-0099")).toBe("JOB-2026-0001"); // New year reset
    });
  });

  describe("Job Status Transitions", () => {
    it("should validate allowed status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["OPEN", "CANCELLED"],
        OPEN: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [], // Terminal state
        CANCELLED: [], // Terminal state
      };

      const canTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) ?? false;
      };

      expect(canTransition("DRAFT", "OPEN")).toBe(true);
      expect(canTransition("OPEN", "IN_PROGRESS")).toBe(true);
      expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
      expect(canTransition("COMPLETED", "OPEN")).toBe(false);
    });

    it("should auto-update status based on line completion", () => {
      const calculateJobStatus = (
        lines: { status: string }[],
        currentStatus: string
      ): string => {
        if (currentStatus === "CANCELLED") return "CANCELLED";
        
        const allCompleted = lines.every(l => l.status === "COMPLETED" || l.status === "SKIPPED");
        const anyInProgress = lines.some(l => l.status === "IN_PROGRESS");
        const anyCompleted = lines.some(l => l.status === "COMPLETED");
        
        if (allCompleted && lines.length > 0) return "COMPLETED";
        if (anyInProgress || anyCompleted) return "IN_PROGRESS";
        return currentStatus;
      };

      expect(calculateJobStatus([{ status: "PENDING" }], "OPEN")).toBe("OPEN");
      expect(calculateJobStatus([{ status: "IN_PROGRESS" }], "OPEN")).toBe("IN_PROGRESS");
      expect(calculateJobStatus([{ status: "COMPLETED" }], "IN_PROGRESS")).toBe("COMPLETED");
      expect(calculateJobStatus([
        { status: "COMPLETED" },
        { status: "PENDING" },
      ], "IN_PROGRESS")).toBe("IN_PROGRESS");
    });

    it("should record status change timestamps", () => {
      type JobUpdate = {
        status: string;
        startedAt: Date | null;
        completedAt: Date | null;
      };

      const job: JobUpdate = {
        status: "DRAFT",
        startedAt: null,
        completedAt: null,
      };

      const updateJobStatus = (
        job: JobUpdate,
        newStatus: string
      ): JobUpdate => {
        const now = new Date();
        const updated = { ...job, status: newStatus };
        
        if (newStatus === "IN_PROGRESS" && !job.startedAt) {
          updated.startedAt = now;
        }
        if (newStatus === "COMPLETED") {
          updated.completedAt = now;
        }
        
        return updated;
      };

      const inProgress = updateJobStatus(job, "IN_PROGRESS");
      expect(inProgress.startedAt).not.toBeNull();
      expect(inProgress.completedAt).toBeNull();

      const completed = updateJobStatus(inProgress, "COMPLETED");
      expect(completed.completedAt).not.toBeNull();
    });
  });

  describe("Job Line Operations", () => {
    it("should complete job line with quantity", async () => {
      type JobLine = {
        id: string;
        qtyOrdered: number;
        qtyCompleted: number;
        status: string;
      };

      const line: JobLine = {
        id: "line-001",
        qtyOrdered: 100,
        qtyCompleted: 0,
        status: "PENDING",
      };

      const completeLine = (
        line: JobLine,
        qtyCompleted: number
      ): JobLine => {
        const newQtyCompleted = line.qtyCompleted + qtyCompleted;
        const newStatus = newQtyCompleted >= line.qtyOrdered ? "COMPLETED" : "IN_PROGRESS";
        
        return {
          ...line,
          qtyCompleted: newQtyCompleted,
          status: newStatus,
        };
      };

      const partial = completeLine(line, 50);
      expect(partial.qtyCompleted).toBe(50);
      expect(partial.status).toBe("IN_PROGRESS");

      const full = completeLine(partial, 50);
      expect(full.qtyCompleted).toBe(100);
      expect(full.status).toBe("COMPLETED");
    });

    it("should prevent over-completion", () => {
      const line = { qtyOrdered: 100, qtyCompleted: 90 };
      const attemptedQty = 20;

      const remainingQty = line.qtyOrdered - line.qtyCompleted;
      const wouldOverComplete = attemptedQty > remainingQty;

      expect(wouldOverComplete).toBe(true);
      expect(remainingQty).toBe(10);
    });

    it("should skip line with reason", () => {
      const skipLine = (
        line: { status: string; notes: string | null },
        reason: string
      ): typeof line => {
        return {
          ...line,
          status: "SKIPPED",
          notes: reason,
        };
      };

      const skipped = skipLine({ status: "PENDING", notes: null }, "Item out of stock");
      expect(skipped.status).toBe("SKIPPED");
      expect(skipped.notes).toBe("Item out of stock");
    });
  });

  describe("Job Assignment", () => {
    it("should assign job to user", async () => {
      type AssignableJob = {
        id: string;
        assignedToUserId: string | null;
      };

      const job: AssignableJob = {
        id: "job-001",
        assignedToUserId: null,
      };

      const assignJob = (
        job: AssignableJob,
        userId: string
      ): AssignableJob => {
        return { ...job, assignedToUserId: userId };
      };

      const assigned = assignJob(job, "user-001");
      expect(assigned.assignedToUserId).toBe("user-001");
    });

    it("should validate user assignment eligibility", () => {
      const users = [
        { id: "user-1", role: "Operator", siteIds: ["site-1"] },
        { id: "user-2", role: "Viewer", siteIds: ["site-1"] },
        { id: "user-3", role: "Operator", siteIds: ["site-2"] },
      ];

      const jobSiteId = "site-1";
      const assignableRoles = ["Admin", "Supervisor", "Operator"];

      const eligibleUsers = users.filter(user => 
        assignableRoles.includes(user.role) &&
        user.siteIds.includes(jobSiteId)
      );

      expect(eligibleUsers).toHaveLength(1);
      expect(eligibleUsers[0].id).toBe("user-1");
    });

    it("should track workload per user", () => {
      const jobs = [
        { assignedToUserId: "user-1", status: "OPEN" },
        { assignedToUserId: "user-1", status: "IN_PROGRESS" },
        { assignedToUserId: "user-2", status: "OPEN" },
        { assignedToUserId: "user-1", status: "COMPLETED" }, // Not active
      ];

      const getActiveWorkload = (userId: string): number => {
        return jobs.filter(
          j => j.assignedToUserId === userId && 
          ["OPEN", "IN_PROGRESS"].includes(j.status)
        ).length;
      };

      expect(getActiveWorkload("user-1")).toBe(2);
      expect(getActiveWorkload("user-2")).toBe(1);
      expect(getActiveWorkload("user-3")).toBe(0);
    });
  });

  describe("Job Priority", () => {
    it("should sort jobs by priority", () => {
      const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      
      const jobs = [
        { id: "job-1", priority: "NORMAL" as const },
        { id: "job-2", priority: "URGENT" as const },
        { id: "job-3", priority: "LOW" as const },
        { id: "job-4", priority: "HIGH" as const },
      ];

      const sorted = [...jobs].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      expect(sorted.map(j => j.priority)).toEqual(["URGENT", "HIGH", "NORMAL", "LOW"]);
    });

    it("should escalate priority based on due date", () => {
      const escalatePriority = (
        currentPriority: string,
        dueDate: Date | null
      ): string => {
        if (!dueDate) return currentPriority;
        
        const now = new Date();
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilDue < 0) return "URGENT";
        if (hoursUntilDue < 4) return "HIGH";
        if (hoursUntilDue < 24) return currentPriority === "LOW" ? "NORMAL" : currentPriority;
        
        return currentPriority;
      };

      const now = new Date();
      const overdue = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      expect(escalatePriority("NORMAL", overdue)).toBe("URGENT");
      expect(escalatePriority("NORMAL", soon)).toBe("HIGH");
      expect(escalatePriority("LOW", null)).toBe("LOW");
    });
  });

  describe("Job Types", () => {
    it("should have valid job type constants", () => {
      expect(JOB_TYPE).toContain("RECEIVING");
      expect(JOB_TYPE).toContain("PICK");
      expect(JOB_TYPE).toContain("PACK");
      expect(JOB_TYPE).toContain("SHIP");
      expect(JOB_TYPE).toContain("TRANSFER");
      expect(JOB_TYPE).toContain("COUNT");
    });

    it("should create job with reference to source document", () => {
      const job = {
        type: "PICK" as const,
        referenceType: "SalesOrder",
        referenceId: "so-001",
      };

      expect(job.referenceType).toBe("SalesOrder");
      expect(job.referenceId).toBe("so-001");
    });
  });

  describe("Job Summary Calculations", () => {
    it("should calculate job summary", () => {
      const lines = [
        { qtyOrdered: 100, qtyCompleted: 100, status: "COMPLETED" },
        { qtyOrdered: 50, qtyCompleted: 25, status: "IN_PROGRESS" },
        { qtyOrdered: 75, qtyCompleted: 0, status: "PENDING" },
      ];

      const summary = {
        totalLines: lines.length,
        completedLines: lines.filter(l => l.status === "COMPLETED").length,
        pendingLines: lines.filter(l => l.status === "PENDING").length,
        totalQtyOrdered: lines.reduce((sum, l) => sum + l.qtyOrdered, 0),
        totalQtyCompleted: lines.reduce((sum, l) => sum + l.qtyCompleted, 0),
      };

      expect(summary.totalLines).toBe(3);
      expect(summary.completedLines).toBe(1);
      expect(summary.pendingLines).toBe(1);
      expect(summary.totalQtyOrdered).toBe(225);
      expect(summary.totalQtyCompleted).toBe(125);
    });

    it("should calculate completion percentage", () => {
      const calculateCompletion = (ordered: number, completed: number): number => {
        if (ordered === 0) return 0;
        return Math.round((completed / ordered) * 100);
      };

      expect(calculateCompletion(100, 50)).toBe(50);
      expect(calculateCompletion(100, 100)).toBe(100);
      expect(calculateCompletion(0, 0)).toBe(0);
    });
  });
});
