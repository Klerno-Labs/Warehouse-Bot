import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";
import { EmailService } from "@server/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "confirmation"; // confirmation, shipped, delivered

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
        shipments: {
          include: {
            lines: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    const validatedOrder = await requireTenantResource(context, order, "Order");
    if (validatedOrder instanceof NextResponse) return validatedOrder;

    // Check if customer has email
    if (!validatedOrder.customer.email) {
      return NextResponse.json(
        { error: "Customer does not have an email address" },
        { status: 400 }
      );
    }

    let success = false;

    switch (type) {
      case "confirmation":
        success = await EmailService.sendOrderConfirmation(
          validatedOrder.customer.email,
          {
            orderNumber: validatedOrder.orderNumber,
            customerName: validatedOrder.customer.name,
            orderDate: validatedOrder.orderDate,
            total: validatedOrder.total,
            items: validatedOrder.lines.map((line) => ({
              name: line.item.name,
              qty: line.qtyOrdered,
              unitPrice: line.unitPrice,
            })),
            shippingAddress: [
              validatedOrder.shipToName || validatedOrder.customer.name,
              validatedOrder.shipToAddress1,
              validatedOrder.shipToAddress2,
              `${validatedOrder.shipToCity}, ${validatedOrder.shipToState} ${validatedOrder.shipToZip}`,
              validatedOrder.shipToCountry,
            ]
              .filter(Boolean)
              .join("\n"),
          }
        );
        break;

      case "shipped":
        // Get the most recent shipment
        const shipment = validatedOrder.shipments[validatedOrder.shipments.length - 1];
        if (!shipment) {
          return NextResponse.json(
            { error: "No shipment found for this order" },
            { status: 400 }
          );
        }

        success = await EmailService.sendShipmentNotification(
          validatedOrder.customer.email,
          {
            orderNumber: validatedOrder.orderNumber,
            shipmentNumber: shipment.shipmentNumber,
            customerName: validatedOrder.customer.name,
            carrier: shipment.carrier || "Standard Shipping",
            trackingNumber: shipment.trackingNumber || undefined,
            estimatedDelivery: shipment.deliveryDate || undefined,
            items: shipment.lines.map((line) => ({
              name: line.item.name,
              qty: line.qtyShipped,
            })),
          }
        );
        break;

      case "delivered":
        success = await EmailService.sendDeliveryConfirmation(
          validatedOrder.customer.email,
          {
            orderNumber: validatedOrder.orderNumber,
            customerName: validatedOrder.customer.name,
            deliveredAt: new Date(),
          }
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({
        message: `Email sent successfully to ${validatedOrder.customer.email}`
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send email. Check email configuration." },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
