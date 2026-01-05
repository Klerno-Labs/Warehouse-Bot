import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { prisma } from "@server/prisma";
import { generatePurchaseOrderPDF } from "@server/pdf-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        tenantId: session.sessionUser.tenantId,
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
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
