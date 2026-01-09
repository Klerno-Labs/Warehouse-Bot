import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";
import storage from "@/server/storage";
import { Role } from "@prisma/client";

/**
 * POST /api/admin/roles/custom
 * Create a custom role variant
 * Executives can create multiple custom roles per base tier
 */
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only Executive and Admin can create custom roles
    const roleCheck = requireRole(context, ["Executive", "Admin", "SuperAdmin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

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
    const existing = await storage.tenantRoleConfig.findUnique({
      where: {
        tenantId_customName: {
          tenantId: context.user.tenantId,
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
    const customRole = await storage.tenantRoleConfig.create({
      data: {
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/roles/custom
 * Get all custom roles for the tenant
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const customRoles = await storage.tenantRoleConfig.findMany({
      where: {
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}
