import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

// Confirm a draft sales order
export async function POST(
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

  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      lines: { include: { item: true } },
      customer: true,
    },
  });

  if (!salesOrder) {
    return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
  }

  if (salesOrder.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Can only confirm draft orders" },
      { status: 400 }
    );
  }

  // Validate order has lines
  if (salesOrder.lines.length === 0) {
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
      approvedByUserId: session.user.id,
      approvedAt: new Date(),
    },
    include: {
      customer: true,
      lines: { include: { item: true } },
    },
  });

  return NextResponse.json({ salesOrder: updated });
}
