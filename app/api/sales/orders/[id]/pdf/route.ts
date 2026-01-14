import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";
import { generateSalesOrderPDF, generateInvoicePDF, generatePackingSlipPDF } from "@server/pdf-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "order"; // order, invoice, packing-slip

    const order = await prisma.salesOrder.findFirst({
      where: {
        id: id,
        tenantId: context.user.tenantId,
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

    const validatedOrder = await requireTenantResource(context, order, "Order");
    if (validatedOrder instanceof NextResponse) return validatedOrder;

    // Format data for PDF
    const pdfData = {
      orderNumber: validatedOrder.orderNumber,
      orderDate: validatedOrder.orderDate,
      requestedDate: validatedOrder.requestedDate || undefined,
      promisedDate: validatedOrder.promisedDate || undefined,
      status: validatedOrder.status,
      customerPO: validatedOrder.customerPO || undefined,
      customer: {
        name: validatedOrder.customer.name,
        code: validatedOrder.customer.code,
        email: validatedOrder.customer.email || undefined,
        phone: validatedOrder.customer.phone || undefined,
      },
      billTo: {
        name: validatedOrder.customer.name,
        address1: validatedOrder.customer.billingAddress1 || undefined,
        address2: validatedOrder.customer.billingAddress2 || undefined,
        city: validatedOrder.customer.billingCity || undefined,
        state: validatedOrder.customer.billingState || undefined,
        zip: validatedOrder.customer.billingZip || undefined,
        country: validatedOrder.customer.billingCountry || undefined,
      },
      shipTo: {
        name: validatedOrder.shipToName || validatedOrder.customer.name,
        address1: validatedOrder.shipToAddress1 || undefined,
        address2: validatedOrder.shipToAddress2 || undefined,
        city: validatedOrder.shipToCity || undefined,
        state: validatedOrder.shipToState || undefined,
        zip: validatedOrder.shipToZip || undefined,
        country: validatedOrder.shipToCountry || undefined,
      },
      lines: validatedOrder.lines.map((line) => ({
        sku: line.item.sku,
        description: line.description || line.item.name,
        qty: line.qtyOrdered,
        uom: line.uom,
        unitPrice: line.unitPrice,
        total: line.lineTotal,
      })),
      subtotal: validatedOrder.subtotal,
      taxAmount: validatedOrder.taxAmount,
      shippingAmount: validatedOrder.shippingAmount,
      total: validatedOrder.total,
      notes: validatedOrder.notes || undefined,
      createdBy: validatedOrder.createdBy?.firstName
        ? `${validatedOrder.createdBy.firstName} ${validatedOrder.createdBy.lastName}`
        : undefined,
    };

    let pdfBuffer: Buffer;
    let filename: string;

    switch (type) {
      case "invoice":
        pdfBuffer = generateInvoicePDF({
          ...pdfData,
          invoiceNumber: `INV-${validatedOrder.orderNumber.replace("SO-", "")}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
          paymentTerms: validatedOrder.customer.paymentTerms || "Net 30",
        });
        filename = `Invoice-${validatedOrder.orderNumber}.pdf`;
        break;

      case "packing-slip":
        pdfBuffer = generatePackingSlipPDF({
          orderNumber: validatedOrder.orderNumber,
          shipmentNumber: `SHIP-${Date.now()}`,
          shipDate: new Date(),
          carrier: "TBD",
          customer: pdfData.customer,
          shipTo: pdfData.shipTo,
          lines: validatedOrder.lines.map((line) => ({
            sku: line.item.sku,
            description: line.description || line.item.name,
            qtyOrdered: line.qtyOrdered,
            qtyShipped: line.qtyShipped,
            uom: line.uom,
          })),
          notes: validatedOrder.notes || undefined,
        });
        filename = `PackingSlip-${validatedOrder.orderNumber}.pdf`;
        break;

      default:
        pdfBuffer = generateSalesOrderPDF(pdfData);
        filename = `SalesOrder-${validatedOrder.orderNumber}.pdf`;
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
