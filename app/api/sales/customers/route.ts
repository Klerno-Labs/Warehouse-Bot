import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const createCustomerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // Billing Address
  billingAddress1: z.string().optional(),
  billingAddress2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().default("US"),
  // Shipping Address
  shippingAddress1: z.string().optional(),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().default("US"),
  // Terms
  paymentTerms: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  taxExempt: z.boolean().default(false),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const activeOnly = searchParams.get("active") === "true";

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(activeOnly && { isActive: true }),
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { salesOrders: true },
      },
    },
  });

  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  if (!["Admin", "Supervisor", "Sales"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createCustomerSchema.parse(body);

    // Check for duplicate customer code
    const existing = await prisma.customer.findFirst({
      where: {
        tenantId: session.user.tenantId,
        code: data.code,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Customer code already exists" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId: session.user.tenantId,
        ...data,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
