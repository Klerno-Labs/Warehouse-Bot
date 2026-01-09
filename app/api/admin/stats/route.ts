import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";
import storage from "@/server/storage";

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only Admin can access admin stats
    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    // Get tenant info
    const tenant = await storage.tenant.findUnique({
      where: { id: context.user.tenantId },
      select: {
        id: true,
        name: true,
        brandLogo: true,
        brandColor: true,
      },
    });

    // Count users
    const totalUsers = await storage.user.count({
      where: { tenantId: context.user.tenantId },
    });

    const activeUsers = await storage.user.count({
      where: {
        tenantId: context.user.tenantId,
        isActive: true,
      },
    });

    // Count departments
    const totalDepartments = await storage.customDepartment.count({
      where: { tenantId: context.user.tenantId },
    });

    // Count routings
    const totalRoutings = await storage.productionRouting.count({
      where: { tenantId: context.user.tenantId },
    });

    // Get recent audit events (if available)
    const recentActivity: Array<{
      id: string;
      action: string;
      user: string;
      timestamp: string;
    }> = [];

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalDepartments,
      totalRoutings,
      tenantInfo: tenant,
      recentActivity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
