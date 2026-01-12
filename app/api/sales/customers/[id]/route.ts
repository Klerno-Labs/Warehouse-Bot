import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddress1: z.string().optional().nullable(),
  billingAddress2: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),
  billingCountry: z.string().optional(),
  shippingAddress1: z.string().optional().nullable(),
  shippingAddress2: z.string().optional().nullable(),
  shippingCity: z.string().optional().nullable(),
  shippingState: z.string().optional().nullable(),
  shippingZip: z.string().optional().nullable(),
  shippingCountry: z.string().optional(),
  paymentTerms: z.string().optional().nullable(),
  creditLimit: z.number().min(0).optional().nullable(),
  taxExempt: z.boolean().optional(),
  taxExemptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
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

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Supervisor", "Sales"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateCustomerSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { _count: { select: { salesOrders: true } } },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Soft delete if has orders
  if (customer._count.salesOrders > 0) {
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "Customer deactivated" });
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ message: "Customer deleted" });
}
