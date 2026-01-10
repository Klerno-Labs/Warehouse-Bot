import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const userId = context.user.id;
  const tenantId = context.user.tenantId;

  try {
    // Get pending jobs assigned to this user or available in their departments
    const user = await storage.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const departmentIds = user.assignedDepartments || [];

    // Get jobs assigned specifically to this user
    const assignedJobs = await storage.getProductionOrdersByAssignee(tenantId, userId);
    const pendingAssigned = assignedJobs.filter(job => job.status === "PENDING");

    // Get unassigned jobs in user's departments
    const departmentJobs = await Promise.all(
      departmentIds.map(deptId => storage.getProductionOrdersByDepartment(tenantId, deptId))
    );
    const unassignedJobs = departmentJobs
      .flat()
      .filter(job => job.status === "PENDING" && !job.assignedTo);

    // Combine and deduplicate
    const allPendingJobs = [...pendingAssigned, ...unassignedJobs];
    const uniqueJobs = Array.from(
      new Map(allPendingJobs.map(job => [job.id, job])).values()
    );

    // Sort by priority and due date
    uniqueJobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      const dateA = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Infinity;
      const dateB = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Infinity;
      return dateA - dateB;
    });

    // Get details for each job
    const jobsWithDetails = await Promise.all(
      uniqueJobs.slice(0, 20).map(async job => {
        const [item, customer] = await Promise.all([
          job.itemId ? storage.getItemById(job.itemId) : null,
          job.customerId ? storage.getCustomerById(job.customerId) : null,
        ]);

        return {
          id: job.id,
          orderNumber: job.orderNumber,
          itemName: item?.name || job.itemName,
          itemSKU: item?.sku,
          qtyOrdered: job.qtyOrdered,
          priority: job.priority,
          scheduledEnd: job.scheduledEnd,
          customerName: customer?.name,
          estimatedDuration: job.estimatedDuration,
          isAssignedToMe: job.assignedTo === userId,
        };
      })
    );

    return NextResponse.json({
      nextJobs: jobsWithDetails,
      count: jobsWithDetails.length,
    });
  } catch (error) {
    console.error("Next jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch next jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const userId = context.user.id;
  const tenantId = context.user.tenantId;

  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing job ID" },
        { status: 400 }
      );
    }

    // Check if user already has an active job
    const userJobs = await storage.getProductionOrdersByAssignee(tenantId, userId);
    const hasActiveJob = userJobs.some(job => job.status === "IN_PROGRESS");

    if (hasActiveJob) {
      return NextResponse.json(
        { error: "You already have an active job. Please complete or pause it first." },
        { status: 400 }
      );
    }

    // Get and validate the job
    const job = await storage.getProductionOrderById(jobId);
    if (!job || job.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "PENDING") {
      return NextResponse.json(
        { error: "Job is not available" },
        { status: 400 }
      );
    }

    // Assign job to user and start it
    await storage.updateProductionOrder(jobId, {
      assignedTo: userId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Job started successfully",
    });
  } catch (error) {
    console.error("Start job error:", error);
    return NextResponse.json(
      { error: "Failed to start job" },
      { status: 500 }
    );
  }
}
