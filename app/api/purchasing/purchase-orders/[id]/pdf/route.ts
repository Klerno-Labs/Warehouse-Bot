import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { generatePurchaseOrderPDF } from "@server/pdf-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const po = await prisma.purchaseOrder.findFirst({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
        site: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const pdfData = {
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      expectedDate: po.expectedDelivery || undefined,
      status: po.status,
      supplier: {
        name: po.supplier.name,
        code: po.supplier.code,
        email: po.supplier.email || undefined,
        phone: po.supplier.phone || undefined,
        address1: po.supplier.address || undefined,
        city: po.supplier.city || undefined,
        state: po.supplier.state || undefined,
        zip: po.supplier.zipCode || undefined,
      },
      shipTo: {
        name: po.site.name,
        address1: po.site.address || undefined,
      },
      lines: po.lines.map((line) => ({
        sku: line.item.sku,
        description: line.description || line.item.name,
        qty: line.qtyOrdered,
        uom: line.uom,
        unitCost: line.unitPrice,
        total: line.lineTotal,
      })),
      subtotal: po.subtotal,
      taxAmount: po.tax || 0,
      shippingAmount: po.shipping || 0,
      total: po.total,
      notes: po.notes || undefined,
    };

    const pdfBuffer = generatePurchaseOrderPDF(pdfData);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PO-${po.poNumber}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
