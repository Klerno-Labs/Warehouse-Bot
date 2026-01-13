import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createCustomerSchema } from "@shared/sales";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const activeOnly = searchParams.get("active") === "true";

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: context.user.tenantId,
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
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Sales"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  try {
    const data = await validateBody(req, createCustomerSchema);
    if (data instanceof NextResponse) return data;

    // Check for duplicate customer code
    const existing = await prisma.customer.findFirst({
      where: {
        tenantId: context.user.tenantId,
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
        tenantId: context.user.tenantId,
        ...data,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
