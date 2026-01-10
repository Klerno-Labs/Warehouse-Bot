import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * DELETE /api/admin/department-users/[id]
 * Remove a user from the department (soft delete)
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

    // Only Supervisor, Manager roles, and above can delete users
    const allowedRoles = ['Supervisor', 'Inventory', 'Purchasing', 'Maintenance', 'QC', 'Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only managers can remove users from departments' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // Get the user to be deleted
    const targetUser = await storage.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user belongs to manager's tenant
    if (targetUser.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot delete user from another tenant' },
        { status: 403 }
      );
    }

    // Prevent deleting SuperAdmin
    if (targetUser.role === 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Cannot delete Super Admin user' },
        { status: 403 }
      );
    }

    // Soft delete: deactivate the user instead of deleting
    await storage.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    // Also deactivate their badges
    await storage.prisma.badge.updateMany({
      where: { userId },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting department user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/department-users/[id]
 * Update a user's information
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

    const allowedRoles = ['Supervisor', 'Inventory', 'Purchasing', 'Maintenance', 'QC', 'Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only managers can update users' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const { firstName, lastName, email, roleId, assignedDepartments, isActive } = await req.json();

    // Get the target user
    const targetUser = await storage.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify same tenant
    if (targetUser.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot update user from another tenant' },
        { status: 403 }
      );
    }

    // Prevent modifying SuperAdmin
    if (targetUser.role === 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Cannot modify Super Admin user' },
        { status: 403 }
      );
    }

    // Get custom role if changing
    let baseRole = targetUser.role;
    if (roleId && roleId !== targetUser.customRoleId) {
      const customRole = await storage.prisma.tenantRoleConfig.findUnique({
        where: { id: roleId, tenantId: user.tenantId },
      });

      if (customRole) {
        baseRole = customRole.baseRole as any;
      }
    }

    // Update the user
    const updatedUser = await storage.prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(roleId !== undefined && { customRoleId: roleId, role: baseRole }),
        ...(assignedDepartments && { assignedDepartments }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        customRole: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.customRole?.customName || updatedUser.role,
        assignedDepartments: updatedUser.assignedDepartments,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating department user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
