import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";
import storage from "@/server/storage";

/**
 * GET /api/admin/system-overview
 * Get comprehensive system overview statistics
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only Admin can access system overview
    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const tenantId = context.user.tenantId;

    // Users statistics
    const totalUsers = await storage.user.count({
      where: { tenantId },
    });

    const activeUsers = await storage.user.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Get users by role
    const users = await storage.user.findMany({
      where: { tenantId },
      select: { role: true },
    });

    const usersByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Departments statistics
    const totalDepartments = await storage.customDepartment.count({
      where: { tenantId },
    });

    const activeDepartments = await storage.customDepartment.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Get most used departments (mock data for now - would need job tracking)
    const departments = await storage.customDepartment.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      take: 5,
      orderBy: {
        order: 'asc',
      },
    });

    const mostUsedDepartments = departments.map((dept) => ({
      name: dept.name,
      jobCount: Math.floor(Math.random() * 50), // Mock data - replace with actual job counts
      color: dept.color,
    })).sort((a, b) => b.jobCount - a.jobCount);

    // Routings statistics
    const totalRoutings = await storage.productionRouting.count({
      where: { tenantId },
    });

    const activeRoutings = await storage.productionRouting.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const defaultRoutings = await storage.productionRouting.count({
      where: {
        tenantId,
        isDefault: true,
      },
    });

    // Production statistics (mock data - replace with actual production order queries)
    const production = {
      activeOrders: await storage.productionOrder.count({
        where: {
          tenantId,
          status: { in: ['IN_PROGRESS', 'ACTIVE'] },
        },
      }).catch(() => 0),
      completedToday: 0, // Would need date filtering
      pendingOrders: await storage.productionOrder.count({
        where: {
          tenantId,
          status: 'PENDING',
        },
      }).catch(() => 0),
      avgCompletionTime: 0, // Would need time calculation
    };

    // Inventory statistics
    const inventory = {
      totalItems: await storage.item.count({
        where: { tenantId },
      }).catch(() => 0),
      lowStockItems: 0, // Would need stock level checks
      totalValue: 0, // Would need value calculation
    };

    // Purchasing statistics
    const purchasing = {
      openPOs: await storage.purchaseOrder.count({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
        },
      }).catch(() => 0),
      awaitingApproval: await storage.purchaseOrder.count({
        where: {
          tenantId,
          status: 'SUBMITTED',
        },
      }).catch(() => 0),
      receivedToday: 0, // Would need date filtering
    };

    // Sales statistics
    const sales = {
      openOrders: await storage.salesOrder.count({
        where: {
          tenantId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }).catch(() => 0),
      shippedToday: 0, // Would need date filtering
      readyToShip: 0, // Would need status filtering
    };

    // Recent activity (placeholder - would integrate with audit system)
    const recentActivity: Array<{
      id: string;
      user: string;
      action: string;
      entity: string;
      timestamp: string;
    }> = [];

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole,
      },
      departments: {
        total: totalDepartments,
        active: activeDepartments,
        mostUsed: mostUsedDepartments,
      },
      routings: {
        total: totalRoutings,
        active: activeRoutings,
        defaultCount: defaultRoutings,
      },
      production,
      inventory,
      purchasing,
      sales,
      recentActivity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
