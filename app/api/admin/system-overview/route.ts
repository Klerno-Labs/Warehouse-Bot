import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/admin/system-overview
 * Get comprehensive system overview statistics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can access system overview
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = user.tenantId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all data in parallel for performance
    const [
      users,
      departments,
      items,
      productionOrders,
      purchaseOrders,
      salesOrders,
      inventoryBalances,
    ] = await Promise.all([
      storage.getUsersByTenant(tenantId),
      storage.getDepartmentsByTenant(tenantId),
      storage.getItemsByTenant(tenantId),
      storage.getProductionOrdersByTenant(tenantId),
      storage.getPurchaseOrdersByTenant(tenantId),
      storage.getSalesByTenant(tenantId),
      storage.getInventoryByTenant(tenantId),
    ]);

    // Users statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;

    const usersByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Departments statistics with real job counts
    const totalDepartments = departments.length;
    const activeDepartments = departments.length;

    // Count jobs per department from production orders
    const jobCountByDept = productionOrders.reduce((acc, order) => {
      const deptId = order.departmentId;
      if (deptId) {
        acc[deptId] = (acc[deptId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedDepartments = departments
      .map((dept) => ({
        name: dept.name,
        jobCount: jobCountByDept[dept.id] || 0,
        color: dept.color || '#3b82f6',
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5);

    // Production statistics from real data
    const activeOrders = productionOrders.filter(o =>
      o.status === 'IN_PROGRESS' || o.status === 'STARTED'
    ).length;
    const completedToday = productionOrders.filter(o =>
      o.status === 'COMPLETED' && o.actualEnd && new Date(o.actualEnd) >= startOfToday
    ).length;
    const pendingOrders = productionOrders.filter(o =>
      o.status === 'PLANNED' || o.status === 'RELEASED'
    ).length;

    // Calculate average completion time (in hours)
    const completedOrders = productionOrders.filter(o => o.actualStart && o.actualEnd);
    const avgCompletionTime = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => {
          const start = new Date(o.actualStart!).getTime();
          const end = new Date(o.actualEnd!).getTime();
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0) / completedOrders.length
      : 0;

    // Inventory statistics from real data
    const lowStockItems = inventoryBalances.filter(inv => {
      const qty = inv.qtyBase || 0;
      const reorderPoint = inv.reorderPoint || 10;
      return qty > 0 && qty <= reorderPoint;
    }).length;

    const totalValue = inventoryBalances.reduce((sum, inv) => {
      const qty = inv.qtyBase || 0;
      const cost = inv.unitCost || 50;
      return sum + (qty * cost);
    }, 0);

    // Purchasing statistics from real data
    const openPOs = purchaseOrders.filter(po =>
      po.status === 'APPROVED' || po.status === 'SENT' || po.status === 'OPEN'
    ).length;
    const awaitingApproval = purchaseOrders.filter(po =>
      po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL'
    ).length;
    const receivedToday = purchaseOrders.filter(po =>
      po.status === 'RECEIVED' && po.receivedAt && new Date(po.receivedAt) >= startOfToday
    ).length;

    // Sales statistics from real data
    const openOrders = salesOrders.filter(so =>
      so.status === 'CONFIRMED' || so.status === 'PICKING' || so.status === 'OPEN'
    ).length;
    const shippedToday = salesOrders.filter(so =>
      so.status === 'SHIPPED' && so.shippedAt && new Date(so.shippedAt) >= startOfToday
    ).length;
    const readyToShip = salesOrders.filter(so =>
      so.status === 'PICKED' || so.status === 'READY_TO_SHIP'
    ).length;

    // Recent activity from production orders (as proxy for activity)
    const recentActivity = productionOrders
      .filter(o => o.updatedAt)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
      .slice(0, 10)
      .map(o => {
        const assignedUser = users.find(u => u.id === o.assignedTo);
        return {
          id: o.id,
          user: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'System',
          action: getActionFromStatus(o.status),
          entity: `Production Order ${o.orderNumber}`,
          timestamp: o.updatedAt!,
        };
      });

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
        total: productionOrders.length,
        active: activeOrders,
        defaultCount: 0,
      },
      production: {
        activeOrders,
        completedToday,
        pendingOrders,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      },
      inventory: {
        totalItems: items.length,
        lowStockItems,
        totalValue: Math.round(totalValue),
      },
      purchasing: {
        openPOs,
        awaitingApproval,
        receivedToday,
      },
      sales: {
        openOrders,
        shippedToday,
        readyToShip,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching system overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system overview' },
      { status: 500 }
    );
  }
}

function getActionFromStatus(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'IN_PROGRESS':
    case 'STARTED':
      return 'started';
    case 'PAUSED':
      return 'paused';
    case 'CANCELLED':
      return 'cancelled';
    case 'RELEASED':
      return 'released';
    default:
      return 'updated';
  }
}
