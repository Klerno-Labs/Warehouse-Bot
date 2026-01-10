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

    // Users statistics
    const users = await storage.getUsersByTenant(user.tenantId);
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;

    const usersByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Departments statistics
    const departments = await storage.getDepartmentsByTenant(user.tenantId);
    const totalDepartments = departments.length;
    const activeDepartments = departments.length; // All departments considered active

    const mostUsedDepartments = departments
      .slice(0, 5)
      .map((dept) => ({
        name: dept.name,
        jobCount: Math.floor(Math.random() * 50), // Mock data - replace with actual job counts
        color: '#3b82f6', // Default color
      }))
      .sort((a, b) => b.jobCount - a.jobCount);

    // Routings statistics - placeholder
    const totalRoutings = 0;
    const activeRoutings = 0;
    const defaultRoutings = 0;

    // Production statistics - placeholder
    const production = {
      activeOrders: 0,
      completedToday: 0,
      pendingOrders: 0,
      avgCompletionTime: 0,
    };

    // Inventory statistics
    const items = await storage.getItemsByTenant(user.tenantId);
    const inventory = {
      totalItems: items.length,
      lowStockItems: 0, // Would need stock level checks
      totalValue: 0, // Would need value calculation
    };

    // Purchasing statistics - placeholder
    const purchasing = {
      openPOs: 0,
      awaitingApproval: 0,
      receivedToday: 0,
    };

    // Sales statistics - placeholder
    const sales = {
      openOrders: 0,
      shippedToday: 0,
      readyToShip: 0,
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
    console.error('Error fetching system overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system overview' },
      { status: 500 }
    );
  }
}
