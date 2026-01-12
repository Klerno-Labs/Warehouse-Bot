import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import type { SalesOrderStatus, Uom } from "@prisma/client";

const createSOLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemId: z.string(),
  description: z.string().optional(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(["EA", "FT", "YD", "ROLL"]),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

const createSOSchema = z.object({
  customerId: z.string(),
  orderNumber: z.string().min(1),
  customerPO: z.string().optional(),
  orderDate: z.string(),
  requestedDate: z.string().optional(),
  promisedDate: z.string().optional(),
  // Ship To
  shipToName: z.string().optional(),
  shipToAddress1: z.string().optional(),
  shipToAddress2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  shipToCountry: z.string().default("US"),
  // Shipping
  shippingMethod: z.string().optional(),
  // Financials (taxAmount is calculated from line taxRates)
  shippingAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  // Notes
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  // Lines
  lines: z.array(createSOLineSchema).min(1),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SalesOrderStatus | null;
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");

  const salesOrders = await prisma.salesOrder.findMany({
    where: {
      tenantId: session.user.tenantId,
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
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Supervisor", "Sales"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSOSchema.parse(body);

    // Check for duplicate order number
    const existing = await prisma.salesOrder.findFirst({
      where: {
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
        siteId: session.user.siteIds[0],
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
        createdByUserId: session.user.id,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating sales order:", error);
    return NextResponse.json(
      { error: "Failed to create sales order" },
      { status: 500 }
    );
  }
}
