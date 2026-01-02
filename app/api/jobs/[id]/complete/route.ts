import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { completeJobLineSchema } from "@shared/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
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

    if (job.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Job must be in progress to complete lines" },
        { status: 400 }
      );
    }

    const payload = completeJobLineSchema.parse(await req.json());
    const line = await storage.getJobLineById(payload.lineId);

    if (!line || line.jobId !== id) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    if (line.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Line is already completed" },
        { status: 400 }
      );
    }

    // Determine if fully or partially completed
    const isFullyCompleted = payload.qtyCompleted >= line.qtyOrdered;
    const newStatus = isFullyCompleted ? "COMPLETED" : "IN_PROGRESS";

    const updated = await storage.updateJobLine(payload.lineId, {
      qtyCompleted: payload.qtyCompleted,
      status: newStatus,
      completedByUserId: session.user.id,
      completedAt: new Date(),
      notes: payload.notes || line.notes,
    });

    // If this job is a TRANSFER and line is completed, move inventory
    if (job.type === "TRANSFER" && isFullyCompleted && line.fromLocationId && line.toLocationId && line.itemId) {
      // Get item for UOM
      const item = await storage.getItemById(line.itemId);
      
      // Create transfer event (using MOVE event type)
      await storage.createInventoryEvent({
        tenantId: session.user.tenantId,
        siteId: job.siteId,
        eventType: "MOVE",
        itemId: line.itemId,
        fromLocationId: line.fromLocationId,
        toLocationId: line.toLocationId,
        qtyEntered: payload.qtyCompleted,
        uomEntered: item?.baseUom || "EA",
        qtyBase: payload.qtyCompleted,
        referenceId: job.id,
        reasonCodeId: null,
        notes: `Transfer job ${job.jobNumber}`,
        createdByUserId: session.user.id,
        workcellId: job.workcellId,
        deviceId: null,
      });

      // Update balances
      const fromBalance = await storage.getInventoryBalance(
        session.user.tenantId,
        line.itemId,
        line.fromLocationId!
      );
      if (fromBalance) {
        await storage.upsertInventoryBalance({
          tenantId: fromBalance.tenantId,
          siteId: fromBalance.siteId,
          itemId: fromBalance.itemId,
          locationId: fromBalance.locationId,
          qtyBase: fromBalance.qtyBase - payload.qtyCompleted,
        });
      }

      const toBalance = await storage.getInventoryBalance(
        session.user.tenantId,
        line.itemId,
        line.toLocationId!
      );
      if (toBalance) {
        await storage.upsertInventoryBalance({
          tenantId: toBalance.tenantId,
          siteId: toBalance.siteId,
          itemId: toBalance.itemId,
          locationId: toBalance.locationId,
          qtyBase: toBalance.qtyBase + payload.qtyCompleted,
        });
      } else {
        await storage.upsertInventoryBalance({
          tenantId: session.user.tenantId,
          siteId: job.siteId,
          itemId: line.itemId,
          locationId: line.toLocationId,
          qtyBase: payload.qtyCompleted,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error completing job line:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
