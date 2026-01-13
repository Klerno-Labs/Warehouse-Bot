import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, validateBody, handleApiError, createAuditLog } from "@app/api/_utils/middleware";
import { createPOSchema } from "@shared/purchasing";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");

  let purchaseOrders = await storage.getPurchaseOrdersByTenant(context.user.tenantId);

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
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const data = await validateBody(req, createPOSchema);
    if (data instanceof NextResponse) return data;

    // Calculate totals
    const subtotal = data.lines.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitPrice,
      0
    );

    const purchaseOrder = await storage.createPurchaseOrder({
      tenantId: context.user.tenantId,
      siteId: context.user.siteIds[0],
      supplierId: data.supplierId,
      poNumber: data.poNumber,
      orderDate: new Date(data.orderDate),
      expectedDelivery: data.expectedDelivery
        ? new Date(data.expectedDelivery)
        : null,
      notes: data.notes,
      subtotal,
      total: subtotal,
      createdByUserId: context.user.id,
      lines: {
        create: data.lines.map((line) => ({
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

    await createAuditLog(
      context,
      "CREATE",
      "PurchaseOrder",
      purchaseOrder.id,
      `Created PO ${purchaseOrder.poNumber}`
    );

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
