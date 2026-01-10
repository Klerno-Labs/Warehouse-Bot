import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can access admin stats
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get tenant info
    const tenant = await storage.getTenantById(user.tenantId);

    // Count users
    const allUsers = await storage.getUsersByTenant(user.tenantId);
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.isActive).length;

    // Count departments
    const departments = await storage.getDepartmentsByTenant(user.tenantId);
    const totalDepartments = departments.length;

    // Count routings - placeholder for now
    const totalRoutings = 0;

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
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
