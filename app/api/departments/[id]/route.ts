import { NextResponse } from "next/server";
import storage from "@/server/storage";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

/**
 * PATCH /api/departments/[id]
 * Update a custom department
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

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
        id: id,
        tenantId: context.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const department = await storage.prisma.customDepartment.update({
      where: { id: id },
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
    return handleApiError(error);
  }
}

/**
 * DELETE /api/departments/[id]
 * Delete a custom department
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    // Verify department exists and belongs to tenant
    const existing = await storage.prisma.customDepartment.findFirst({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check if department is used in any routings
    const routingSteps = await storage.prisma.routingStep.findFirst({
      where: {
        departmentId: id,
      },
    });

    if (routingSteps) {
      return NextResponse.json(
        { error: "Cannot delete department that is used in production routings" },
        { status: 400 }
      );
    }

    await storage.prisma.customDepartment.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
