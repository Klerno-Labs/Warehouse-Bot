import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import {
  requireAuth,
  requireRole,
  requireTenantResource,
  requireSiteAccess,
  validateBody,
  handleApiError,
} from "@app/api/_utils/middleware";
import { updateJobSchema, JOB_STATUS } from "@shared/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { id } = await params;
    const rawJob = await storage.getJobById(id);

    const job = await requireTenantResource(context, rawJob, "Job");
    if (job instanceof NextResponse) return job;

    const siteCheck = requireSiteAccess(context, job.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    // Get lines and summary data
    const lines = await storage.getJobLinesByJob(id);
    const totalLines = lines.length;
    const completedLines = lines.filter((l) => l.status === "COMPLETED").length;
    const totalQtyOrdered = lines.reduce((sum, l) => sum + l.qtyOrdered, 0);
    const totalQtyCompleted = lines.reduce((sum, l) => sum + l.qtyCompleted, 0);

    return NextResponse.json({
      ...job,
      lines,
      summary: {
        totalLines,
        completedLines,
        pendingLines: totalLines - completedLines,
        totalQtyOrdered,
        totalQtyCompleted,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const rawJob = await storage.getJobById(id);

    const job = await requireTenantResource(context, rawJob, "Job");
    if (job instanceof NextResponse) return job;

    const siteCheck = requireSiteAccess(context, job.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    const payload = await validateBody(req, updateJobSchema);
    if (payload instanceof NextResponse) return payload;

    // Handle status transitions
    const updates: Partial<typeof job> = {};

    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.assignedToUserId !== undefined) updates.assignedToUserId = payload.assignedToUserId;

    if (payload.status !== undefined) {
      const currentStatus = job.status;
      const newStatus = payload.status;

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["OPEN", "CANCELLED"],
        OPEN: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }

      updates.status = newStatus as typeof JOB_STATUS[number];

      if (newStatus === "IN_PROGRESS") {
        updates.startedAt = new Date();
      } else if (newStatus === "COMPLETED") {
        // Check if all lines are completed
        const lines = await storage.getJobLinesByJob(id);
        const pendingLines = lines.filter((l) => l.status === "PENDING" || l.status === "IN_PROGRESS");
        if (pendingLines.length > 0) {
          return NextResponse.json(
            { error: `${pendingLines.length} lines are not completed` },
            { status: 400 }
          );
        }
        updates.completedAt = new Date();
      }
    }

    const updated = await storage.updateJob(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const rawJob = await storage.getJobById(id);

    const job = await requireTenantResource(context, rawJob, "Job");
    if (job instanceof NextResponse) return job;

    const siteCheck = requireSiteAccess(context, job.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    // Only allow deletion of draft or cancelled jobs
    if (!["DRAFT", "CANCELLED"].includes(job.status)) {
      return NextResponse.json(
        { error: "Can only delete draft or cancelled jobs" },
        { status: 400 }
      );
    }

    // Delete lines first
    await storage.deleteJobLinesByJob(id);

    // Mark as cancelled
    await storage.updateJob(id, { status: "CANCELLED" });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
