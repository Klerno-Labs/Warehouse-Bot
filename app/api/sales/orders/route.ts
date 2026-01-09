import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createSOSchema } from "@shared/sales";
import type { SalesOrderStatus, Uom } from "@prisma/client";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SalesOrderStatus | null;
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");

  const salesOrders = await prisma.salesOrder.findMany({
    where: {
      tenantId: context.user.tenantId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    },
    orderBy: { orderDate: "desc" },
    include: {
      customer: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: { lines: true, shipments: true },
      },
    },
  });

  return NextResponse.json({ salesOrders });
}

export async function POST(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Sales"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  try {
    const data = await validateBody(req, createSOSchema);
    if (data instanceof NextResponse) return data;

    // Check for duplicate order number
    const existing = await prisma.salesOrder.findFirst({
      where: {
        tenantId: context.user.tenantId,
        orderNumber: data.orderNumber,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Order number already exists" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        tenantId: context.user.tenantId,
        isActive: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or inactive" },
        { status: 400 }
      );
    }

    // Verify all items exist
    const itemIds = data.lines.map((line) => line.itemId);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        tenantId: context.user.tenantId,
      },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { error: "One or more items not found" },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = data.lines.reduce((sum, line) => {
      const lineSubtotal = line.qtyOrdered * line.unitPrice;
      return sum + lineSubtotal - (line.discount || 0);
    }, 0);

    const taxAmount = data.lines.reduce((sum, line) => {
      const lineSubtotal = line.qtyOrdered * line.unitPrice - (line.discount || 0);
      return sum + lineSubtotal * ((line.taxRate || 0) / 100);
    }, 0);

    const total = subtotal + taxAmount + data.shippingAmount - data.discountAmount;

    // Create sales order with lines
    const salesOrder = await prisma.salesOrder.create({
      data: {
        tenantId: context.user.tenantId,
        siteId: context.user.siteIds[0],
        customerId: data.customerId,
        orderNumber: data.orderNumber,
        customerPO: data.customerPO,
        orderDate: new Date(data.orderDate),
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : null,
        promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
        shipToName: data.shipToName || customer.name,
        shipToAddress1: data.shipToAddress1 || customer.shippingAddress1,
        shipToAddress2: data.shipToAddress2 || customer.shippingAddress2,
        shipToCity: data.shipToCity || customer.shippingCity,
        shipToState: data.shipToState || customer.shippingState,
        shipToZip: data.shipToZip || customer.shippingZip,
        shipToCountry: data.shipToCountry || customer.shippingCountry,
        shippingMethod: data.shippingMethod,
        subtotal,
        taxAmount,
        shippingAmount: data.shippingAmount,
        discountAmount: data.discountAmount,
        total,
        notes: data.notes,
        internalNotes: data.internalNotes,
        createdByUserId: context.user.id,
        lines: {
          create: data.lines.map((line) => ({
            lineNumber: line.lineNumber,
            itemId: line.itemId,
            description: line.description,
            qtyOrdered: line.qtyOrdered,
            uom: line.uom as Uom,
            unitPrice: line.unitPrice,
            discount: line.discount || 0,
            taxRate: line.taxRate || 0,
            lineTotal: (line.qtyOrdered * line.unitPrice - (line.discount || 0)) * (1 + (line.taxRate || 0) / 100),
            notes: line.notes,
          })),
        },
      },
      include: {
        customer: true,
        lines: {
          include: { item: true },
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ salesOrder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
