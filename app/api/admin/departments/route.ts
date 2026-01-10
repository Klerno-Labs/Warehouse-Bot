import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/admin/departments
 * Get all departments for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await storage.prisma.department.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      departments: departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        siteId: dept.siteId,
      })),
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments
 * Create a new department
 * Only Executive and above can create departments
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Executive and above can create departments
    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can create departments' },
        { status: 403 }
      );
    }

    const { name, siteId } = await req.json();

    if (!name || !siteId) {
      return NextResponse.json(
        { error: 'Department name and site ID are required' },
        { status: 400 }
      );
    }

    // Create department
    const department = await storage.prisma.department.create({
      data: {
        tenantId: user.tenantId,
        siteId,
        name,
      },
    });

    return NextResponse.json({
      success: true,
      department: {
        id: department.id,
        name: department.name,
        siteId: department.siteId,
      },
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
