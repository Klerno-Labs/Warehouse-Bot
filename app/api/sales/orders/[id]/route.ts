import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import type { SalesOrderStatus, SOLineStatus } from "@prisma/client";

const updateSOSchema = z.object({
  customerPO: z.string().optional().nullable(),
  requestedDate: z.string().optional().nullable(),
  promisedDate: z.string().optional().nullable(),
  shipToName: z.string().optional().nullable(),
  shipToAddress1: z.string().optional().nullable(),
  shipToAddress2: z.string().optional().nullable(),
  shipToCity: z.string().optional().nullable(),
  shipToState: z.string().optional().nullable(),
  shipToZip: z.string().optional().nullable(),
  shipToCountry: z.string().optional(),
  shippingMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
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

  const salesOrder = await prisma.salesOrder.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
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

  if (!salesOrder) {
    return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
  }

  return NextResponse.json({ salesOrder });
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
    const data = updateSOSchema.parse(body);

    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    // Only allow edits on draft orders
    if (salesOrder.status !== "DRAFT") {
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating sales order:", error);
    return NextResponse.json(
      { error: "Failed to update sales order" },
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

  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { _count: { select: { shipments: true } } },
  });

  if (!salesOrder) {
    return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
  }

  if (salesOrder.status !== "DRAFT" && salesOrder.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "Can only delete draft or cancelled orders" },
      { status: 400 }
    );
  }

  await prisma.salesOrder.delete({ where: { id } });
  return NextResponse.json({ message: "Sales order deleted" });
}
