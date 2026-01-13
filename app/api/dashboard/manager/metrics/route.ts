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

    // Get departments managed by this user
    // Fall back to all departments if user has admin/manager role but no specific assignments
    let managedDepartmentIds = user.assignedDepartments || user.managedDepartmentIds || [];

    // If manager has no specific departments, get all departments (for admin view)
    if (managedDepartmentIds.length === 0 && (user.role === 'Admin' || user.role === 'Manager')) {
      const allDepts = await storage.getDepartmentsByTenant(tenantId);
      managedDepartmentIds = allDepts.map(d => d.id);
    }

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
      u.assignedDepartments?.some(deptId => managedDepartmentIds.includes(deptId)) ||
      managedDepartmentIds.includes(u.departmentId)
    );

    // Determine user activity based on production order assignments
    const usersWithActiveJobs = new Set(activeJobs.map(job => job.assignedTo).filter(Boolean));
    const usersWithRecentActivity = new Set(
      allOrders
        .filter(o => o.updatedAt && new Date(o.updatedAt) >= startOfToday)
        .map(o => o.assignedTo)
        .filter(Boolean)
    );

    // Active team = users with active jobs or recent activity
    const activeTeam = teamMembers.filter(u =>
      u.isActive && (usersWithActiveJobs.has(u.id) || usersWithRecentActivity.has(u.id))
    );

    // Idle team = active users without current work assignments
    const idleTeam = teamMembers.filter(u =>
      u.isActive && !usersWithActiveJobs.has(u.id)
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

    // Quality rate from quality records
    const qualityRecords = await storage.getQualityRecordsByTenant(tenantId);
    const recentQuality = qualityRecords.filter(
      q => new Date(q.createdAt) >= startOfWeek
    );
    // Check for PASSED status or PASS result
    const passedQuality = recentQuality.filter(q =>
      q.status === "PASSED" || q.result === "PASS" || q.outcome === "PASS"
    );
    const qualityRate = recentQuality.length > 0
      ? (passedQuality.length / recentQuality.length) * 100
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
