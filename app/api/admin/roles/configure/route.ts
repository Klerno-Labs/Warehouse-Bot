import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/session';
import storage from '@/server/storage';
import { Role } from '@prisma/client';

/**
 * POST /api/admin/roles/configure
 * Configure tenant-specific role customization
 * Executive tier can customize role names and permissions
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Executive and Admin can customize roles
    if (!['Executive', 'Admin', 'SuperAdmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can customize roles' },
        { status: 403 }
      );
    }

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
    const config = await storage.tenantRoleConfig.upsert({
      where: {
        tenantId_role: {
          tenantId: user.tenantId,
          role: role,
        },
      },
      create: {
        tenantId: user.tenantId,
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
    console.error('Error configuring role:', error);
    return NextResponse.json(
      { error: 'Failed to configure role' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/roles/configure
 * Get tenant role configurations
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all role configurations for this tenant
    const configs = await storage.tenantRoleConfig.findMany({
      where: {
        tenantId: user.tenantId,
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
    console.error('Error fetching role configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role configurations' },
      { status: 500 }
    );
  }
}
