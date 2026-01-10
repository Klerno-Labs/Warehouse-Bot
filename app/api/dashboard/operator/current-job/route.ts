import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const userId = context.user.id;
  const tenantId = context.user.tenantId;

  try {
    // Get the user's currently assigned job
    const userJobs = await storage.getProductionOrdersByAssignee(tenantId, userId);
    const currentJob = userJobs.find(job => job.status === "IN_PROGRESS");

    if (!currentJob) {
      return NextResponse.json({ currentJob: null });
    }

    // Get additional job details
    const [item, customer, station] = await Promise.all([
      currentJob.itemId ? storage.getItemById(currentJob.itemId) : null,
      currentJob.customerId ? storage.getCustomerById(currentJob.customerId) : null,
      currentJob.stationId ? storage.getStationById(currentJob.stationId) : null,
    ]);

    // Get job steps/checklist if applicable - TODO: Implement job steps
    const steps: any[] = [];

    // Calculate time metrics
    const startTime = currentJob.actualStart ? new Date(currentJob.actualStart) : new Date();
    const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
    const estimatedMinutes = currentJob.estimatedDuration || 0;
    const remainingMinutes = Math.max(0, estimatedMinutes - elapsedMinutes);

    // Calculate progress
    const progress = currentJob.qtyOrdered > 0
      ? (currentJob.qtyCompleted / currentJob.qtyOrdered) * 100
      : 0;

    return NextResponse.json({
      currentJob: {
        id: currentJob.id,
        orderNumber: currentJob.orderNumber,
        itemName: item?.name || currentJob.itemName,
        itemSKU: item?.sku,
        itemDescription: item?.description,
        qtyOrdered: currentJob.qtyOrdered,
        qtyCompleted: currentJob.qtyCompleted,
        qtyRemaining: currentJob.qtyOrdered - currentJob.qtyCompleted,
        progress,
        priority: currentJob.priority,
        scheduledEnd: currentJob.scheduledEnd,
        customerName: customer?.name,
        stationName: station?.name,
        status: currentJob.status,
        startedAt: currentJob.startedAt,
        elapsedMinutes,
        estimatedMinutes,
        remainingMinutes,
        steps: [], // TODO: Implement job steps/checklist
        notes: currentJob.notes,
      },
    });
  } catch (error) {
    console.error("Current job fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch current job" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const userId = context.user.id;
  const tenantId = context.user.tenantId;

  try {
    const { jobId, action, data } = await request.json();

    if (!jobId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const job = await storage.getProductionOrderById(jobId);
    if (!job || job.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "update_progress":
        await storage.updateProductionOrder(jobId, {
          qtyCompleted: data.qtyCompleted,
          lastUpdatedBy: userId,
          lastUpdatedAt: new Date(),
        });
        break;

      case "complete_step":
        await storage.updateJobStep(data.stepId, {
          completed: true,
          completedBy: userId,
          completedAt: new Date(),
        });
        break;

      case "add_note":
        const existingNotes = job.notes || "";
        const timestamp = new Date().toISOString();
        const newNote = `[${timestamp}] ${data.note}`;
        await storage.updateProductionOrder(jobId, {
          notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
        });
        break;

      case "pause":
        await storage.updateProductionOrder(jobId, {
          status: "PAUSED",
          pausedAt: new Date(),
          pausedBy: userId,
        });
        break;

      case "resume":
        await storage.updateProductionOrder(jobId, {
          status: "IN_PROGRESS",
          resumedAt: new Date(),
        });
        break;

      case "complete":
        await storage.updateProductionOrder(jobId, {
          status: "COMPLETED",
          qtyCompleted: job.qtyOrdered,
          completedAt: new Date(),
          completedBy: userId,
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}
