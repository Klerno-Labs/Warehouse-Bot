import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/departments
 * List all custom departments for tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await storage.customDepartment.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/departments
 * Create a new custom department
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin' && user.role !== 'Supervisor') {
      return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      color,
      icon,
      allowConcurrent,
      requireQC,
      defaultDuration,
      order,
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await storage.customDepartment.findUnique({
      where: {
        tenantId_code: {
          tenantId: user.tenantId,
          code: code.toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Department code already exists' },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let departmentOrder = order;
    if (departmentOrder === undefined) {
      const maxOrderDept = await storage.customDepartment.findFirst({
        where: { tenantId: user.tenantId },
        orderBy: { order: 'desc' },
      });
      departmentOrder = (maxOrderDept?.order || 0) + 1;
    }

    const department = await storage.customDepartment.create({
      data: {
        tenantId: user.tenantId,
        name,
        code: code.toUpperCase(),
        color: color || '#3b82f6',
        icon,
        allowConcurrent: allowConcurrent ?? true,
        requireQC: requireQC ?? false,
        defaultDuration,
        order: departmentOrder,
      },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
