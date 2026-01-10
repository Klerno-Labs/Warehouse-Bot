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

    // Fetch data for managed departments
    const [productionOrders, users] = await Promise.all([
      Promise.all(managedDepartmentIds.map(deptId =>
        storage.getProductionOrdersByDepartment(tenantId, deptId)
      )),
      storage.getUsersByTenant(tenantId),
    ]);

    const allOrders = productionOrders.flat();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Active jobs
    const activeJobs = allOrders.filter(o => o.status === "IN_PROGRESS");

    // Completed today
    const completedToday = allOrders.filter(
      o => o.status === "COMPLETED" &&
      o.actualEnd &&
      new Date(o.actualEnd) >= startOfToday
    );

    // Pending jobs
    const pendingJobs = allOrders.filter(o => o.status === "PENDING");

    // Overdue jobs
    const overdueJobs = allOrders.filter(
      o => o.status !== "COMPLETED" &&
      o.scheduledEnd &&
      new Date(o.scheduledEnd) < now
    );

    // Team metrics
    const teamMembers = users.filter(u =>
      u.assignedDepartments?.some(deptId => managedDepartmentIds.includes(deptId))
    );

    // TODO: Track user activity/last active timestamp
    const activeTeam = teamMembers.filter(u => u.isActive);

    // TODO: Implement user status tracking
    const idleTeam = teamMembers.filter(u =>
      !activeJobs.some(job => job.assignedTo === u.id)
    );

    // Calculate efficiency
    const completedThisWeek = allOrders.filter(
      o => o.status === "COMPLETED" &&
      o.actualEnd &&
      new Date(o.actualEnd) >= startOfWeek
    );

    const totalPlanned = allOrders.filter(
      o => o.scheduledEnd &&
      new Date(o.scheduledEnd) >= startOfWeek &&
      new Date(o.scheduledEnd) <= now
    );

    const efficiency = totalPlanned.length > 0
      ? (completedThisWeek.length / totalPlanned.length) * 100
      : 100;

    // Average cycle time (in hours)
    const completedWithTimes = completedThisWeek.filter(
      o => o.startedAt && o.actualEnd
    );

    const avgCycleTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, o) => {
          const start = new Date(o.startedAt!).getTime();
          const end = new Date(o.actualEnd!).getTime();
          return sum + (end - start) / 3600000; // Convert to hours
        }, 0) / completedWithTimes.length
      : 0;

    // Quality rate (assuming quality checks recorded)
    const qualityRecords = await storage.getQualityRecordsByTenant(tenantId);
    const recentQuality = qualityRecords.filter(
      q => new Date(q.createdAt) >= startOfWeek
    );
    // TODO: Determine passed/failed from quality record status
    const qualityRate = recentQuality.length > 0
      ? (recentQuality.filter(q => q.status === "PASSED").length / recentQuality.length) * 100
      : 100;

    // Bottleneck detection
    const bottlenecks = [];

    // Check for overdue jobs
    if (overdueJobs.length > 3) {
      bottlenecks.push({
        type: "overdue",
        severity: "high",
        message: `${overdueJobs.length} jobs are overdue`,
        count: overdueJobs.length,
      });
    }

    // Check for idle team members
    if (idleTeam.length > 2 && pendingJobs.length > 0) {
      bottlenecks.push({
        type: "idle_workers",
        severity: "medium",
        message: `${idleTeam.length} team members are idle with ${pendingJobs.length} pending jobs`,
        count: idleTeam.length,
      });
    }

    // Check for quality issues
    if (qualityRate < 95 && recentQuality.length > 5) {
      bottlenecks.push({
        type: "quality",
        severity: "high",
        message: `Quality rate is ${qualityRate.toFixed(1)}% (below 95% target)`,
        rate: qualityRate,
      });
    }

    // Check for long cycle times
    if (avgCycleTime > 8) {
      bottlenecks.push({
        type: "slow_completion",
        severity: "medium",
        message: `Average cycle time is ${avgCycleTime.toFixed(1)} hours`,
        hours: avgCycleTime,
      });
    }

    return NextResponse.json({
      metrics: {
        activeJobs: activeJobs.length,
        completedToday: completedToday.length,
        pendingJobs: pendingJobs.length,
        overdueJobs: overdueJobs.length,
        efficiency,
        avgCycleTime,
        qualityRate,
      },
      team: {
        total: teamMembers.length,
        active: activeTeam.length,
        idle: idleTeam.length,
        offline: teamMembers.length - activeTeam.length - idleTeam.length,
        utilization: teamMembers.length > 0
          ? (activeTeam.length / teamMembers.length) * 100
          : 0,
      },
      bottlenecks,
    });
  } catch (error) {
    console.error("Manager metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manager metrics" },
      { status: 500 }
    );
  }
}
