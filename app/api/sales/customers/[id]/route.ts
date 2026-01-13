import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { updateCustomerSchema } from "@shared/sales";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      tenantId: context.user.tenantId,
    },
    include: {
      salesOrders: {
        orderBy: { orderDate: "desc" },
        take: 10,
        include: {
          _count: { select: { lines: true } },
        },
      },
      _count: {
        select: { salesOrders: true, shipments: true },
      },
    },
  });

  const resource = await requireTenantResource(context, customer, "Customer");
  if (resource instanceof NextResponse) return resource;

  return NextResponse.json({ customer });
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
    const data = await validateBody(req, updateCustomerSchema);
    if (data instanceof NextResponse) return data;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: context.user.tenantId },
    });

    const resource = await requireTenantResource(context, customer, "Customer");
    if (resource instanceof NextResponse) return resource;

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json({ customer: updated });
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

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.user.tenantId },
    include: { _count: { select: { salesOrders: true } } },
  });

  const resource = await requireTenantResource(context, customer, "Customer");
  if (resource instanceof NextResponse) return resource;

  // Soft delete if has orders
  if (customer!._count.salesOrders > 0) {
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "Customer deactivated" });
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ message: "Customer deleted" });
}
