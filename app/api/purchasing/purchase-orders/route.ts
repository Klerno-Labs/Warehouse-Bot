import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const createPOLineSchema = z.object({
  itemId: z.string(),
  lineNumber: z.number().int(),
  description: z.string().optional(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(["EA", "FT", "YD", "ROLL"]),
  unitPrice: z.number().min(0),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

const createPOSchema = z.object({
  supplierId: z.string(),
  poNumber: z.string().min(1),
  orderDate: z.string(),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(createPOLineSchema).min(1),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");

  let purchaseOrders = await storage.getPurchaseOrdersByTenant(session.user.tenantId);

  // Apply filters
  if (status) {
    purchaseOrders = purchaseOrders.filter((po) => po.status === status);
  }

  if (supplierId) {
    purchaseOrders = purchaseOrders.filter((po) => po.supplierId === supplierId);
  }

  return NextResponse.json({ purchaseOrders });
}

export async function POST(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createPOSchema.parse(body);

    // Calculate totals
    const subtotal = validatedData.lines.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitPrice,
      0
    );

    const purchaseOrder = await storage.createPurchaseOrder({
      tenantId: session.user.tenantId,
      siteId: session.user.siteIds[0], // Use primary site
      supplierId: validatedData.supplierId,
      poNumber: validatedData.poNumber,
      orderDate: new Date(validatedData.orderDate),
      expectedDelivery: validatedData.expectedDelivery
        ? new Date(validatedData.expectedDelivery)
        : null,
      notes: validatedData.notes,
      subtotal,
      total: subtotal,
      createdByUserId: session.user.id,
      lines: {
        create: validatedData.lines.map((line) => ({
          itemId: line.itemId,
          lineNumber: line.lineNumber,
          description: line.description,
          qtyOrdered: line.qtyOrdered,
          uom: line.uom,
          unitPrice: line.unitPrice,
          lineTotal: line.qtyOrdered * line.unitPrice,
          expectedDelivery: line.expectedDelivery
            ? new Date(line.expectedDelivery)
            : null,
          notes: line.notes,
        })),
      },
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      details: `Created PO ${purchaseOrder.poNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
