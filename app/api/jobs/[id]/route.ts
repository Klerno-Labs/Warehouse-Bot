import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { updateJobSchema, JOB_STATUS } from "@shared/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await storage.getJobById(id);

  if (!job || job.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!session.user.siteIds.includes(job.siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }

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
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory", "Operator"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const job = await storage.getJobById(id);

    if (!job || job.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!session.user.siteIds.includes(job.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    const payload = updateJobSchema.parse(await req.json());

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const job = await storage.getJobById(id);

  if (!job || job.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!session.user.siteIds.includes(job.siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }

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
}
