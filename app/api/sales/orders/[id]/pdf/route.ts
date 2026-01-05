import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { prisma } from "@server/prisma";
import { generateSalesOrderPDF, generateInvoicePDF, generatePackingSlipPDF } from "@server/pdf-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "order"; // order, invoice, packing-slip

  try {
    const order = await prisma.salesOrder.findFirst({
      where: {
        id: params.id,
        tenantId: session.sessionUser.tenantId,
      },
      include: {
        customer: true,
        lines: {
          include: {
            item: true,
          },
        },
        createdBy: true,
        site: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Format data for PDF
    const pdfData = {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      requestedDate: order.requestedDate || undefined,
      promisedDate: order.promisedDate || undefined,
      status: order.status,
      customerPO: order.customerPO || undefined,
      customer: {
        name: order.customer.name,
        code: order.customer.code,
        email: order.customer.email || undefined,
        phone: order.customer.phone || undefined,
      },
      billTo: {
        name: order.customer.name,
        address1: order.customer.billingAddress1 || undefined,
        address2: order.customer.billingAddress2 || undefined,
        city: order.customer.billingCity || undefined,
        state: order.customer.billingState || undefined,
        zip: order.customer.billingZip || undefined,
        country: order.customer.billingCountry || undefined,
      },
      shipTo: {
        name: order.shipToName || order.customer.name,
        address1: order.shipToAddress1 || undefined,
        address2: order.shipToAddress2 || undefined,
        city: order.shipToCity || undefined,
        state: order.shipToState || undefined,
        zip: order.shipToZip || undefined,
        country: order.shipToCountry || undefined,
      },
      lines: order.lines.map((line) => ({
        sku: line.item.sku,
        description: line.description || line.item.name,
        qty: line.qtyOrdered,
        uom: line.uom,
        unitPrice: line.unitPrice,
        total: line.lineTotal,
      })),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      total: order.total,
      notes: order.notes || undefined,
      createdBy: order.createdBy?.firstName 
        ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
        : undefined,
    };

    let pdfBuffer: Buffer;
    let filename: string;

    switch (type) {
      case "invoice":
        pdfBuffer = generateInvoicePDF({
          ...pdfData,
          invoiceNumber: `INV-${order.orderNumber.replace("SO-", "")}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
          paymentTerms: order.customer.paymentTerms || "Net 30",
        });
        filename = `Invoice-${order.orderNumber}.pdf`;
        break;

      case "packing-slip":
        pdfBuffer = generatePackingSlipPDF({
          orderNumber: order.orderNumber,
          shipmentNumber: `SHIP-${Date.now()}`,
          shipDate: new Date(),
          carrier: "TBD",
          customer: pdfData.customer,
          shipTo: pdfData.shipTo,
          lines: order.lines.map((line) => ({
            sku: line.item.sku,
            description: line.description || line.item.name,
            qtyOrdered: line.qtyOrdered,
            qtyShipped: line.qtyShipped,
            uom: line.uom,
          })),
          notes: order.notes || undefined,
        });
        filename = `PackingSlip-${order.orderNumber}.pdf`;
        break;

      default:
        pdfBuffer = generateSalesOrderPDF(pdfData);
        filename = `SalesOrder-${order.orderNumber}.pdf`;
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
