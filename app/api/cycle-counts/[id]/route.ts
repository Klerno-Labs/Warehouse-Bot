import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { updateCycleCountSchema, CYCLE_COUNT_STATUS } from "@shared/cycle-counts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cycleCount = await storage.getCycleCountById(id);

  if (!cycleCount || cycleCount.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
  }

  if (!session.user.siteIds.includes(cycleCount.siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }

  // Get lines and summary data
  const lines = await storage.getCycleCountLinesByCycleCount(id);
  const totalLines = lines.length;
  const countedLines = lines.filter((l) => l.status === "COUNTED" || l.status === "VARIANCE_APPROVED" || l.status === "VARIANCE_REJECTED").length;
  const varianceLines = lines.filter((l) => l.varianceQtyBase && l.varianceQtyBase !== 0).length;

  return NextResponse.json({
    ...cycleCount,
    lines,
    summary: {
      totalLines,
      countedLines,
      pendingLines: totalLines - countedLines,
      varianceLines,
    },
  });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const cycleCount = await storage.getCycleCountById(id);

    if (!cycleCount || cycleCount.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
    }

    if (!session.user.siteIds.includes(cycleCount.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    const payload = updateCycleCountSchema.parse(await req.json());

    // Handle status transitions
    const updates: Partial<typeof cycleCount> = {};

    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.scheduledDate !== undefined) updates.scheduledDate = payload.scheduledDate;
    if (payload.assignedToUserId !== undefined) updates.assignedToUserId = payload.assignedToUserId;
    if (payload.notes !== undefined) updates.notes = payload.notes;

    if (payload.status !== undefined) {
      const currentStatus = cycleCount.status;
      const newStatus = payload.status;

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
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

      updates.status = newStatus as typeof CYCLE_COUNT_STATUS[number];

      if (newStatus === "IN_PROGRESS") {
        updates.startedAt = new Date();
      } else if (newStatus === "COMPLETED") {
        // Check if all lines are counted
        const lines = await storage.getCycleCountLinesByCycleCount(id);
        const uncountedLines = lines.filter((l) => l.status === "PENDING");
        if (uncountedLines.length > 0) {
          return NextResponse.json(
            { error: `${uncountedLines.length} lines have not been counted` },
            { status: 400 }
          );
        }
        updates.completedAt = new Date();
      }
    }

    const updated = await storage.updateCycleCount(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating cycle count:", error);
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
  const cycleCount = await storage.getCycleCountById(id);

  if (!cycleCount || cycleCount.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
  }

  if (!session.user.siteIds.includes(cycleCount.siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }

  // Only allow deletion of scheduled or cancelled counts
  if (!["SCHEDULED", "CANCELLED"].includes(cycleCount.status)) {
    return NextResponse.json(
      { error: "Can only delete scheduled or cancelled cycle counts" },
      { status: 400 }
    );
  }

  // Delete lines first
  await storage.deleteCycleCountLinesByCycleCount(id);

  // For now, we'll update the status to CANCELLED since we don't have a delete method
  await storage.updateCycleCount(id, { status: "CANCELLED" });

  return NextResponse.json({ success: true });
}
