import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { updateSOSchema } from "@shared/sales";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { id } = await params;

  const salesOrder = await prisma.salesOrder.findFirst({
    where: {
      id,
      tenantId: context.user.tenantId,
    },
    include: {
      customer: true,
      lines: {
        include: { item: true },
        orderBy: { lineNumber: "asc" },
      },
      shipments: {
        include: {
          lines: true,
          packages: true,
        },
        orderBy: { createdAt: "desc" },
      },
      pickTasks: {
        include: {
          lines: {
            include: { item: true, location: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      approvedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const resource = await requireTenantResource(context, salesOrder, "Sales order");
  if (resource instanceof NextResponse) return resource;

  return NextResponse.json({ salesOrder });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Sales"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { id } = await params;

  try {
    const data = await validateBody(req, updateSOSchema);
    if (data instanceof NextResponse) return data;

    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id, tenantId: context.user.tenantId },
    });

    const resource = await requireTenantResource(context, salesOrder, "Sales order");
    if (resource instanceof NextResponse) return resource;

    // Only allow edits on draft orders
    if (salesOrder!.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only edit draft orders" },
        { status: 400 }
      );
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...data,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : null,
        promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { id } = await params;

  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id, tenantId: context.user.tenantId },
    include: { _count: { select: { shipments: true } } },
  });

  const resource = await requireTenantResource(context, salesOrder, "Sales order");
  if (resource instanceof NextResponse) return resource;

  if (salesOrder!.status !== "DRAFT" && salesOrder!.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "Can only delete draft or cancelled orders" },
      { status: 400 }
    );
  }

  await prisma.salesOrder.delete({ where: { id } });
  return NextResponse.json({ message: "Sales order deleted" });
}
