import { NextResponse } from "next/server";
import storage from "@/server/storage";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

/**
 * GET /api/departments
 * List all custom departments for tenant
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const departments = await storage.prisma.customDepartment.findMany({
      where: {
        tenantId: context.user.tenantId,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/departments
 * Create a new custom department
 */
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      name,
      code,
      color,
      icon,
      allowConcurrent,
      requireQC,
      defaultDuration,
      order,
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await storage.prisma.customDepartment.findUnique({
      where: {
        tenantId_code: {
          tenantId: context.user.tenantId,
          code: code.toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Department code already exists" },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let departmentOrder = order;
    if (departmentOrder === undefined) {
      const maxOrderDept = await storage.prisma.customDepartment.findFirst({
        where: { tenantId: context.user.tenantId },
        orderBy: { order: "desc" },
      });
      departmentOrder = (maxOrderDept?.order || 0) + 1;
    }

    const department = await storage.prisma.customDepartment.create({
      data: {
        tenantId: context.user.tenantId,
        name,
        code: code.toUpperCase(),
        color: color || "#3b82f6",
        icon,
        allowConcurrent: allowConcurrent ?? true,
        requireQC: requireQC ?? false,
        defaultDuration,
        order: departmentOrder,
      },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
