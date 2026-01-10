import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  try {
    const [departments, users] = await Promise.all([
      storage.getDepartmentsByTenant(tenantId),
      storage.getUsersByTenant(tenantId),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // TODO: Link production orders to departments when schema is finalized
    const departmentMetrics = departments.map(dept => {
      // Placeholder metrics
      const activeJobs = 0;
      const completedToday = 0;
      const efficiency = 85; // Placeholder

      // Team members in this department
      const teamCount = users.filter(u =>
        u.assignedDepartments && u.assignedDepartments.includes(dept.id)
      ).length;

      // Calculate utilization - placeholder
      const utilization = 75; // Placeholder
      const overdueJobs = 0; // Placeholder

      return {
        id: dept.id,
        name: dept.name,
        activeJobs,
        completedToday,
        efficiency,
        teamCount,
        utilization,
        overdueJobs,
        status: overdueJobs > 0 ? "warning" : efficiency > 90 ? "excellent" : "good",
      };
    });

    // Sort by efficiency (worst first to highlight problems)
    departmentMetrics.sort((a, b) => a.efficiency - b.efficiency);

    return NextResponse.json({
      departments: departmentMetrics,
      summary: {
        totalDepartments: departments.length,
        avgEfficiency: departmentMetrics.reduce((sum, d) => sum + d.efficiency, 0) / departments.length || 0,
        totalActiveJobs: departmentMetrics.reduce((sum, d) => sum + d.activeJobs, 0),
        totalOverdue: departmentMetrics.reduce((sum, d) => sum + d.overdueJobs, 0),
      },
    });
  } catch (error) {
    console.error("Department metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch department metrics" },
      { status: 500 }
    );
  }
}
