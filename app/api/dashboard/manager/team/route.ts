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

    // TODO: User schema doesn't have managedDepartmentIds or assignedDepartments
    const managedDepartmentIds = user.assignedDepartments || [];

    if (managedDepartmentIds.length === 0) {
      return NextResponse.json({
        error: "No departments assigned to manager",
      }, { status: 403 });
    }

    // Get all team members in managed departments
    const allUsers = await storage.getUsersByTenant(tenantId);
    const teamMembers = allUsers.filter(u =>
      u.assignedDepartments?.some(deptId => managedDepartmentIds.includes(deptId))
    );

    // Get current jobs for all team members
    const productionOrders = await storage.getProductionOrdersByTenant(tenantId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build team status
    const teamStatus = await Promise.all(
      teamMembers.map(async member => {
        // Get member's current job
        const currentJob = productionOrders.find(
          o => o.assignedTo === member.id && o.status === "IN_PROGRESS"
        );

        // Calculate productivity (completed today)
        const completedToday = productionOrders.filter(
          o => o.assignedTo === member.id &&
          o.status === "COMPLETED" &&
          o.completedAt &&
          new Date(o.completedAt) >= startOfToday
        );

        const totalCompleted = completedToday.reduce(
          (sum, o) => sum + o.qtyCompleted,
          0
        );

        // Determine status - TODO: Track user activity/last active timestamp
        let status: "ACTIVE" | "IDLE" | "OFFLINE" = member.isActive ? "IDLE" : "OFFLINE";
        if (member.isActive && currentJob) {
          status = "ACTIVE";
        }

        // Calculate hours worked today - TODO: Implement time tracking
        const hoursWorked = currentJob && currentJob.actualStart
          ? (Date.now() - new Date(currentJob.actualStart).getTime()) / 3600000
          : 0;

        // Get department name
        const department = member.assignedDepartments?.[0]
          ? await storage.getDepartmentById(member.assignedDepartments[0])
          : null;

        return {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          department: department?.name,
          status,
          currentJob: currentJob ? {
            id: currentJob.id,
            orderNumber: currentJob.orderNumber,
            itemName: currentJob.itemName,
            progress: currentJob.qtyOrdered > 0
              ? (currentJob.qtyCompleted / currentJob.qtyOrdered) * 100
              : 0,
            qtyCompleted: currentJob.qtyCompleted,
            qtyOrdered: currentJob.qtyOrdered,
          } : null,
          productivity: totalCompleted,
          completedJobs: completedToday.length,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          lastActive: null, // TODO: Track last active timestamp
        };
      })
    );

    // Sort by status (ACTIVE first, then IDLE, then OFFLINE)
    const statusOrder = { ACTIVE: 0, IDLE: 1, OFFLINE: 2 };
    teamStatus.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return NextResponse.json({
      teamMembers: teamStatus,
      summary: {
        total: teamStatus.length,
        active: teamStatus.filter(t => t.status === "ACTIVE").length,
        idle: teamStatus.filter(t => t.status === "IDLE").length,
        offline: teamStatus.filter(t => t.status === "OFFLINE").length,
        totalProductivity: teamStatus.reduce((sum, t) => sum + t.productivity, 0),
      },
    });
  } catch (error) {
    console.error("Team status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team status" },
      { status: 500 }
    );
  }
}
