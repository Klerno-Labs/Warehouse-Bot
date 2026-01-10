import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;
  const userId = context.user.id;

  try {
    // Get user's managed departments
    const user = await storage.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // TODO: User schema doesn't have managedDepartmentIds or departmentIds
    const managedDepartmentIds = user.assignedDepartments || [];

    if (managedDepartmentIds.length === 0) {
      return NextResponse.json({
        error: "No departments assigned to manager",
      }, { status: 403 });
    }

    // Get all jobs in managed departments
    const productionOrders = await Promise.all(
      managedDepartmentIds.map(deptId =>
        storage.getProductionOrdersByDepartment(tenantId, deptId)
      )
    );

    const allOrders = productionOrders.flat();
    const now = new Date();

    // Filter for active and pending jobs
    const relevantJobs = allOrders.filter(
      o => ["IN_PROGRESS", "PENDING", "PAUSED", "RELEASED"].includes(o.status)
    );

    // Get additional details for each job
    const jobsWithDetails = await Promise.all(
      relevantJobs.map(async job => {
        const [assignee, item, customer, department, station] = await Promise.all([
          job.assignedTo ? storage.getUserById(job.assignedTo) : null,
          job.itemId ? storage.getItemById(job.itemId) : null,
          job.customerId ? storage.getCustomerById(job.customerId) : null,
          job.departmentId ? storage.getDepartmentById(job.departmentId) : null,
          job.stationId ? storage.getStationById(job.stationId) : null,
        ]);

        // Calculate progress
        const progress = job.qtyOrdered > 0
          ? (job.qtyCompleted / job.qtyOrdered) * 100
          : 0;

        // Check if overdue
        const isOverdue = job.scheduledEnd && new Date(job.scheduledEnd) < now;

        // Calculate time metrics
        const startTime = job.actualStart ? new Date(job.actualStart) : null;
        const elapsedMinutes = startTime
          ? Math.floor((Date.now() - startTime.getTime()) / 60000)
          : 0;

        const scheduledEnd = job.scheduledEnd ? new Date(job.scheduledEnd) : null;
        const timeUntilDue = scheduledEnd
          ? Math.floor((scheduledEnd.getTime() - Date.now()) / 60000)
          : null;

        return {
          id: job.id,
          orderNumber: job.orderNumber,
          itemName: item?.name || job.itemName,
          itemSKU: item?.sku,
          qtyOrdered: job.qtyOrdered,
          qtyCompleted: job.qtyCompleted,
          progress,
          priority: job.priority,
          status: job.status,
          assignedTo: assignee ? {
            id: assignee.id,
            name: `${assignee.firstName} ${assignee.lastName}`,
          } : null,
          customerName: customer?.name,
          department: department?.name,
          station: station?.name,
          scheduledEnd: job.scheduledEnd,
          isOverdue,
          elapsedMinutes,
          timeUntilDue,
          estimatedDuration: job.estimatedDuration,
          createdAt: job.createdAt,
        };
      })
    );

    // Sort by priority and status
    jobsWithDetails.sort((a, b) => {
      // Overdue jobs first
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      // Then by status (IN_PROGRESS, PAUSED, PENDING)
      const statusOrder = { IN_PROGRESS: 0, PAUSED: 1, PENDING: 2 };
      if (a.status !== b.status) {
        return statusOrder[a.status as keyof typeof statusOrder] -
               statusOrder[b.status as keyof typeof statusOrder];
      }
      // Then by priority
      return a.priority - b.priority;
    });

    // Categorize jobs
    const activeJobs = jobsWithDetails.filter(j => j.status === "IN_PROGRESS");
    const pendingJobs = jobsWithDetails.filter(j => j.status === "PENDING");
    const pausedJobs = jobsWithDetails.filter(j => j.status === "PAUSED");
    const overdueJobs = jobsWithDetails.filter(j => j.isOverdue);

    return NextResponse.json({
      activeJobs,
      pendingJobs,
      pausedJobs,
      overdueJobs,
      all: jobsWithDetails,
      summary: {
        total: jobsWithDetails.length,
        active: activeJobs.length,
        pending: pendingJobs.length,
        paused: pausedJobs.length,
        overdue: overdueJobs.length,
      },
    });
  } catch (error) {
    console.error("Active jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active jobs" },
      { status: 500 }
    );
  }
}
