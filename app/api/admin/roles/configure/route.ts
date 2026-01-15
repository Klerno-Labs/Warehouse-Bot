import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";
import storage from "@/server/storage";
import { Role } from "@prisma/client";

/**
 * POST /api/admin/roles/configure
 * Configure tenant-specific role customization
 * Executive tier can customize role names and permissions
 */
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only Executive and Admin can customize roles
    const roleCheck = requireRole(context, ["Executive", "Admin", "SuperAdmin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { role, customName, description, permissions } = await req.json();

    if (!role || !permissions) {
      return NextResponse.json(
        { error: 'Role and permissions are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Don't allow customizing SuperAdmin role (platform-only)
    if (role === 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Cannot customize SuperAdmin role' },
        { status: 403 }
      );
    }

    // Create or update role configuration
    const config = await storage.prisma.tenantRoleConfig.upsert({
      where: {
        tenantId_role: {
          tenantId: context.user.tenantId,
          role: role,
        },
      },
      create: {
        tenantId: context.user.tenantId,
        role: role,
        customName: customName || null,
        description: description || null,
        permissions: permissions,
      },
      update: {
        customName: customName || null,
        description: description || null,
        permissions: permissions,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        role: config.role,
        customName: config.customName,
        description: config.description,
        permissions: config.permissions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/roles/configure
 * Get tenant role configurations
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Get all role configurations for this tenant
    const configs = await storage.prisma.tenantRoleConfig.findMany({
      where: {
        tenantId: context.user.tenantId,
      },
      orderBy: {
        role: 'asc',
      },
    });

    return NextResponse.json({
      configs: configs.map((config) => ({
        id: config.id,
        role: config.role,
        customName: config.customName,
        description: config.description,
        permissions: config.permissions,
        isActive: config.isActive,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
