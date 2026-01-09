import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can access admin stats
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get tenant info
    const tenant = await storage.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        brandLogo: true,
        brandColor: true,
      },
    });

    // Count users
    const totalUsers = await storage.user.count({
      where: { tenantId: user.tenantId },
    });

    const activeUsers = await storage.user.count({
      where: {
        tenantId: user.tenantId,
        isActive: true,
      },
    });

    // Count departments
    const totalDepartments = await storage.customDepartment.count({
      where: { tenantId: user.tenantId },
    });

    // Count routings
    const totalRoutings = await storage.productionRouting.count({
      where: { tenantId: user.tenantId },
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
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
