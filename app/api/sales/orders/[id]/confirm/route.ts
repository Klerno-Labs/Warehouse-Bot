import { NextResponse } from "next/server";
import { requireAuth, requireRole, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

// Confirm a draft sales order
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Sales"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;

    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id, tenantId: context.user.tenantId },
      include: {
        lines: { include: { item: true } },
        customer: true,
      },
    });

    const validatedOrder = await requireTenantResource(context, salesOrder, "Sales order");
    if (validatedOrder instanceof NextResponse) return validatedOrder;

    if (validatedOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only confirm draft orders" },
        { status: 400 }
      );
    }

    // Validate order has lines
    if (validatedOrder.lines.length === 0) {
      return NextResponse.json(
        { error: "Cannot confirm order with no lines" },
        { status: 400 }
      );
    }

    // Confirm the order
    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        approvedByUserId: context.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    });

    return NextResponse.json({ salesOrder: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
