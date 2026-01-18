import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;
  const { id } = await params;
    const roleId = id;

  try {
    const role = await storage.getRoleById(roleId);

    if (!role || role.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Get user count for this role
    const users = await storage.getUsersByTenant(tenantId);
    const userCount = users.filter(u => u.customRoleId === roleId).length;

    return NextResponse.json({
      ...role,
      userCount,
    });
  } catch (error) {
    console.error("Role fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;
  const { id } = await params;
    const roleId = id;

  // Check if user has admin permissions
  if (!["Admin", "SuperAdmin", "Executive"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const role = await storage.getRoleById(roleId);

    if (!role || role.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // If changing customName, check for duplicates
    if (updates.customName && updates.customName !== role.customName) {
      const existingRoles = await storage.getRolesByTenant(tenantId);
      if (existingRoles.some(
        (r: typeof existingRoles[number]) => r.id !== roleId && r.customName.toLowerCase() === updates.customName.toLowerCase()
      )) {
        return NextResponse.json(
          { error: "Role name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedRole = await storage.updateRole(roleId, {
      ...updates,
      updatedBy: context.user.id,
      updatedAt: new Date(),
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;
  const { id } = await params;
    const roleId = id;

  // Check if user has admin permissions
  if (!["Admin", "SuperAdmin", "Executive"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const role = await storage.getRoleById(roleId);

    if (!role || role.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Check if any users have this role
    const users = await storage.getUsersByTenant(tenantId);
    const usersWithRole = users.filter(u => u.customRoleId === roleId);

    if (usersWithRole.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role: ${usersWithRole.length} user(s) are assigned to this role`,
        },
        { status: 400 }
      );
    }

    await storage.deleteRole(roleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Role deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
