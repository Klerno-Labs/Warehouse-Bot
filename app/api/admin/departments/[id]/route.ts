import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * PUT /api/admin/departments/[id]
 * Update a department
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can update departments' },
        { status: 403 }
      );
    }

    const deptId = params.id;
    const { name } = await req.json();

    // Get department
    const department = await storage.prisma.department.findUnique({
      where: { id: deptId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Verify same tenant
    if (department.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot update department from another tenant' },
        { status: 403 }
      );
    }

    // Update department
    const updated = await storage.prisma.department.update({
      where: { id: deptId },
      data: {
        ...(name && { name }),
      },
    });

    return NextResponse.json({
      success: true,
      department: {
        id: updated.id,
        name: updated.name,
        siteId: updated.siteId,
      },
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/departments/[id]
 * Delete a department (only if no users assigned)
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

    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can delete departments' },
        { status: 403 }
      );
    }

    const deptId = params.id;

    const department = await storage.prisma.department.findUnique({
      where: { id: deptId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    if (department.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot delete department from another tenant' },
        { status: 403 }
      );
    }

    // Delete department
    await storage.prisma.department.delete({
      where: { id: deptId },
    });

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
