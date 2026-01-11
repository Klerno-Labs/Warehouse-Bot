import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  try {
    // Get department from query params (optional - can filter by department)
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    // Fetch data
    const [productionOrders, users, departments] = await Promise.all([
      departmentId
        ? storage.getProductionOrdersByDepartment(tenantId, departmentId)
        : storage.getProductionOrdersByTenant(tenantId),
      storage.getUsersByTenant(tenantId),
      departmentId
        ? storage.getDepartmentById(departmentId).then(d => d ? [d] : [])
        : storage.getDepartmentsByTenant(tenantId),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get department name
    const departmentName = departments[0]?.name || "Production";

    // Active jobs (IN_PROGRESS or PAUSED)
    const activeJobsData = productionOrders.filter(
      o => o.status === "IN_PROGRESS" || o.status === "PAUSED"
    );

    // Get details for active jobs
    const activeJobs = await Promise.all(
      activeJobsData.slice(0, 6).map(async job => {
        const [assignee, station] = await Promise.all([
          job.assignedTo ? storage.getUserById(job.assignedTo) : null,
          job.stationId ? storage.getStationById(job.stationId) : null,
        ]);

        return {
          id: job.id,
          orderNumber: job.orderNumber,
          itemName: job.itemName,
          qtyOrdered: job.qtyOrdered,
          qtyCompleted: job.qtyCompleted,
          assignedTo: assignee ? `${assignee.firstName} ${assignee.lastName}` : "Unassigned",
          station: station?.name || "N/A",
          priority: job.priority,
          status: job.status as "IN_PROGRESS" | "PAUSED" | "PENDING",
        };
      })
    );

    // Metrics
    const completedToday = productionOrders.filter(
      o => o.status === "COMPLETED" &&
      o.completedAt &&
      new Date(o.completedAt) >= startOfToday
    );

    const overdueJobs = productionOrders.filter(
      o => o.status !== "COMPLETED" &&
      o.scheduledEnd &&
      new Date(o.scheduledEnd) < now
    );

    // Calculate efficiency
    const plannedToday = productionOrders.filter(
      o => o.scheduledEnd &&
      new Date(o.scheduledEnd) >= startOfToday &&
      new Date(o.scheduledEnd) < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
    );

    const efficiency = plannedToday.length > 0
      ? Math.round((completedToday.length / plannedToday.length) * 100)
      : 100;

    // Calculate average cycle time for completed jobs today
    const completedWithTimes = completedToday.filter(
      o => o.startedAt && o.completedAt
    );

    const avgCycleTime = completedWithTimes.length > 0
      ? Math.round(
          completedWithTimes.reduce((sum, o) => {
            const start = new Date(o.startedAt!).getTime();
            const end = new Date(o.completedAt!).getTime();
            return sum + (end - start) / 60000; // Convert to minutes
          }, 0) / completedWithTimes.length
        )
      : 0;

    // Team Status
    const teamMembers = departmentId
      ? users.filter(u => u.assignedDepartments?.includes(departmentId))
      : users;

    const teamStatus = teamMembers.map(member => {
      const currentJob = activeJobsData.find(
        o => o.assignedTo === member.id && o.status === "IN_PROGRESS"
      );

      // Determine status based on whether they have an active job
      // TODO: Add lastActive field to User schema for better status tracking
      let status: "ACTIVE" | "IDLE" | "OFFLINE" = "IDLE";
      if (currentJob) {
        status = "ACTIVE";
      }

      return {
        name: `${member.firstName} ${member.lastName}`,
        status,
        currentJob: currentJob?.orderNumber || null,
      };
    });

    // Alerts
    const alerts: Array<{
      type: "warning" | "critical" | "info";
      message: string;
    }> = [];

    if (overdueJobs.length > 0) {
      alerts.push({
        type: "critical",
        message: `${overdueJobs.length} job${overdueJobs.length === 1 ? " is" : "s are"} overdue!`,
      });
    }

    if (efficiency < 80 && plannedToday.length > 0) {
      alerts.push({
        type: "warning",
        message: `Production efficiency is ${efficiency}% today`,
      });
    }

    const idleWorkers = teamStatus.filter(t => t.status === "IDLE");
    const pendingJobs = productionOrders.filter(o => o.status === "PENDING");

    if (idleWorkers.length > 2 && pendingJobs.length > 0) {
      alerts.push({
        type: "warning",
        message: `${idleWorkers.length} workers idle with ${pendingJobs.length} pending jobs`,
      });
    }

    // High priority pending jobs
    const highPriorityPending = pendingJobs.filter(j => j.priority <= 3);
    if (highPriorityPending.length > 0) {
      alerts.push({
        type: "info",
        message: `${highPriorityPending.length} high priority job${highPriorityPending.length === 1 ? "" : "s"} waiting`,
      });
    }

    return NextResponse.json({
      department: departmentName,
      currentTime: new Date(),
      activeJobs,
      metrics: {
        activeJobsCount: activeJobsData.length,
        completedToday: completedToday.length,
        efficiency,
        overdueCount: overdueJobs.length,
        avgCycleTime,
      },
      teamStatus,
      alerts,
    });
  } catch (error) {
    console.error("TV Board data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TV board data" },
      { status: 500 }
    );
  }
}
