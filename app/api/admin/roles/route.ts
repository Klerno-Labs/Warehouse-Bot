import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  // Check if user has admin permissions
  if (!["Admin", "SuperAdmin", "Executive"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const [roles, users] = await Promise.all([
      storage.getRolesByTenant(tenantId),
      storage.getUsersByTenant(tenantId),
    ]);

    // Count users for each role
    const rolesWithCounts = roles.map(role => {
      const userCount = users.filter(u => u.customRoleId === role.id).length;
      return {
        ...role,
        userCount,
      };
    });

    return NextResponse.json(rolesWithCounts);
  } catch (error) {
    console.error("Roles fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  // Check if user has admin permissions
  if (!["Admin", "SuperAdmin", "Executive"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const { customName, baseRole, description, permissions, assignedDepartments, assignedWorkcells } = await request.json();

    if (!customName || !baseRole) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRoles = await storage.getRolesByTenant(tenantId);
    if (existingRoles.some(r => r.customName.toLowerCase() === customName.toLowerCase())) {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 400 }
      );
    }

    const newRole = await storage.createRole({
      tenantId,
      baseRole,
      customName,
      description: description || null,
      permissions: permissions || {},
      assignedDepartments: assignedDepartments || [],
      assignedWorkcells: assignedWorkcells || [],
    });

    return NextResponse.json(newRole);
  } catch (error) {
    console.error("Role creation error:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
