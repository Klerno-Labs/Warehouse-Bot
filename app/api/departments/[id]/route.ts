import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * PATCH /api/departments/[id]
 * Update a custom department
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin' && user.role !== 'Supervisor') {
      return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      color,
      icon,
      allowConcurrent,
      requireQC,
      defaultDuration,
      order,
      isActive,
    } = body;

    // Verify department exists and belongs to tenant
    const existing = await storage.prisma.customDepartment.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const department = await storage.prisma.customDepartment.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        color: color !== undefined ? color : undefined,
        icon: icon !== undefined ? icon : undefined,
        allowConcurrent: allowConcurrent !== undefined ? allowConcurrent : undefined,
        requireQC: requireQC !== undefined ? requireQC : undefined,
        defaultDuration: defaultDuration !== undefined ? defaultDuration : undefined,
        order: order !== undefined ? order : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/departments/[id]
 * Delete a custom department
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify department exists and belongs to tenant
    const existing = await storage.prisma.customDepartment.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Check if department is used in any routings
    const routingSteps = await storage.routingStep.findFirst({
      where: {
        departmentId: params.id,
      },
    });

    if (routingSteps) {
      return NextResponse.json(
        { error: 'Cannot delete department that is used in production routings' },
        { status: 400 }
      );
    }

    await storage.prisma.customDepartment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
