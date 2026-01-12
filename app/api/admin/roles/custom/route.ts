import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';
import { Role } from '@shared/prisma-enums';

/**
 * POST /api/admin/roles/custom
 * Create a custom role variant
 * Executives can create multiple custom roles per base tier
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Executive and Admin can create custom roles
    if (!['Executive', 'Admin', 'SuperAdmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can create custom roles' },
        { status: 403 }
      );
    }

    const { baseRole, customName, description, permissions, assignedDepartments, assignedWorkcells } =
      await req.json();

    if (!baseRole || !customName || !permissions) {
      return NextResponse.json(
        { error: 'Base role, custom name, and permissions are required' },
        { status: 400 }
      );
    }

    // Validate base role
    if (!Object.values(Role).includes(baseRole)) {
      return NextResponse.json({ error: 'Invalid base role' }, { status: 400 });
    }

    // Don't allow customizing SuperAdmin role
    if (baseRole === 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Cannot customize SuperAdmin role' },
        { status: 403 }
      );
    }

    // Check if custom name already exists for this tenant
    const existing = await storage.prisma.tenantRoleConfig.findUnique({
      where: {
        tenantId_customName: {
          tenantId: user.tenantId,
          customName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A custom role with this name already exists' },
        { status: 400 }
      );
    }

    // Create custom role
    const customRole = await storage.prisma.tenantRoleConfig.create({
      data: {
        tenantId: user.tenantId,
        baseRole: baseRole,
        customName,
        description: description || null,
        permissions,
        assignedDepartments: assignedDepartments || [],
        assignedWorkcells: assignedWorkcells || [],
      },
    });

    return NextResponse.json({
      success: true,
      role: {
        id: customRole.id,
        baseRole: customRole.baseRole,
        customName: customRole.customName,
        description: customRole.description,
        permissions: customRole.permissions,
        assignedDepartments: customRole.assignedDepartments,
        assignedWorkcells: customRole.assignedWorkcells,
      },
    });
  } catch (error) {
    console.error('Error creating custom role:', error);
    return NextResponse.json(
      { error: 'Failed to create custom role' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/roles/custom
 * Get all custom roles for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customRoles = await storage.prisma.tenantRoleConfig.findMany({
      where: {
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        baseRole: 'asc',
      },
    });

    return NextResponse.json({
      roles: customRoles.map((role) => ({
        id: role.id,
        baseRole: role.baseRole,
        customName: role.customName,
        description: role.description,
        permissions: role.permissions,
        assignedDepartments: role.assignedDepartments,
        assignedWorkcells: role.assignedWorkcells,
        isActive: role.isActive,
        userCount: role._count.users,
      })),
    });
  } catch (error) {
    console.error('Error fetching custom roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom roles' },
      { status: 500 }
    );
  }
}
