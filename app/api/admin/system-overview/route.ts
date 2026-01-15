import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";
import storage from "@/server/storage";
import { prisma } from "@server/prisma";
import { startOfDay, subDays } from "date-fns";

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
    const totalUsers = await storage.prisma.user.count({
      where: { tenantId },
    });

    const activeUsers = await storage.prisma.user.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Get users by role
    const users = await storage.prisma.user.findMany({
      where: { tenantId },
      select: { role: true },
    });

    const usersByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Departments statistics
    const totalDepartments = await storage.prisma.customDepartment.count({
      where: { tenantId },
    });

    const activeDepartments = await storage.prisma.customDepartment.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Get most used departments with actual job operation counts
    const departments = await storage.prisma.customDepartment.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      take: 10,
      orderBy: {
        order: 'asc',
      },
    });

    // Get job operation counts grouped by department for this tenant
    const jobOperationCounts = await prisma.jobOperation.groupBy({
      by: ['department'],
      where: {
        productionOrder: {
          tenantId,
        },
      },
      _count: {
        id: true,
      },
    });

    // Create a map of department name to job count
    const deptJobCounts = new Map<string, number>();
    jobOperationCounts.forEach(op => {
      deptJobCounts.set(op.department.toLowerCase(), op._count.id);
    });

    const mostUsedDepartments = departments.map((dept) => ({
      name: dept.name,
      jobCount: deptJobCounts.get(dept.name.toLowerCase()) || 0,
      color: dept.color,
    })).sort((a, b) => b.jobCount - a.jobCount).slice(0, 5);

    // Routings statistics
    const totalRoutings = await storage.prisma.productionRouting.count({
      where: { tenantId },
    });

    const activeRoutings = await storage.prisma.productionRouting.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const defaultRoutings = await storage.prisma.productionRouting.count({
      where: {
        tenantId,
        isDefault: true,
      },
    });

    // Calculate today boundaries for date-based queries
    const today = startOfDay(new Date());

    // Production statistics with real data
    const [activeOrders, completedToday, pendingOrders] = await Promise.all([
      prisma.productionOrder.count({
        where: {
          tenantId,
          status: { in: ['IN_PROGRESS', 'RELEASED'] },
        },
      }).catch(() => 0),
      prisma.productionOrder.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          actualEnd: { gte: today },
        },
      }).catch(() => 0),
      prisma.productionOrder.count({
        where: {
          tenantId,
          status: { in: ['PLANNED', 'PENDING'] },
        },
      }).catch(() => 0),
    ]);

    const production = {
      activeOrders,
      completedToday,
      pendingOrders,
      avgCompletionTime: 0, // Complex calculation - left as 0 for now
    };

    // Inventory statistics with real data
    const [totalItems, inventoryBalancesWithItems] = await Promise.all([
      prisma.item.count({
        where: { tenantId },
      }).catch(() => 0),
      prisma.inventoryBalance.findMany({
        where: { tenantId },
        include: {
          item: {
            select: { reorderPointBase: true, costBase: true },
          },
        },
      }).catch(() => []),
    ]);

    // Calculate low stock and total value from the balances
    const lowStockItemsCount = inventoryBalancesWithItems.filter(
      b => b.item.reorderPointBase !== null && b.qtyBase <= (b.item.reorderPointBase || 0)
    ).length;

    const inventoryTotalValue = inventoryBalancesWithItems.reduce(
      (sum, b) => sum + (b.qtyBase * (b.item.costBase || 0)), 0
    );

    const inventory = {
      totalItems,
      lowStockItems: lowStockItemsCount,
      totalValue: Math.round(inventoryTotalValue * 100) / 100,
    };

    // Purchasing statistics with real data
    const [openPOs, awaitingApproval, receivedToday] = await Promise.all([
      prisma.purchaseOrder.count({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'] },
        },
      }).catch(() => 0),
      prisma.purchaseOrder.count({
        where: {
          tenantId,
          status: 'PENDING_APPROVAL',
        },
      }).catch(() => 0),
      prisma.receipt.count({
        where: {
          tenantId,
          receiptDate: { gte: today },
        },
      }).catch(() => 0),
    ]);

    const purchasing = {
      openPOs,
      awaitingApproval,
      receivedToday,
    };

    // Sales statistics with real data
    const [openSalesOrders, shippedToday, readyToShip] = await Promise.all([
      prisma.salesOrder.count({
        where: {
          tenantId,
          status: { in: ['PENDING', 'CONFIRMED', 'ALLOCATED', 'PICKING'] },
        },
      }).catch(() => 0),
      prisma.shipment.count({
        where: {
          tenantId,
          status: 'SHIPPED',
          shipDate: { gte: today },
        },
      }).catch(() => 0),
      prisma.salesOrder.count({
        where: {
          tenantId,
          status: 'PACKED',
        },
      }).catch(() => 0),
    ]);

    const sales = {
      openOrders: openSalesOrders,
      shippedToday,
      readyToShip,
    };

    // Recent activity from audit events
    const recentAuditEvents = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }).catch(() => []);

    const recentActivity = recentAuditEvents.map(event => ({
      id: event.id,
      user: event.user?.name || event.user?.email || 'System',
      action: event.action,
      entity: `${event.entityType}${event.entityId ? ` (${event.entityId.slice(0, 8)})` : ''}`,
      timestamp: event.createdAt.toISOString(),
    }));

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
