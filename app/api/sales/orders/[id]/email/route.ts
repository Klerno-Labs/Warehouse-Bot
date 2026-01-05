import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { prisma } from "@server/prisma";
import { EmailService } from "@server/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "confirmation"; // confirmation, shipped, delivered

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

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if customer has email
    if (!order.customer.email) {
      return NextResponse.json(
        { error: "Customer does not have an email address" },
        { status: 400 }
      );
    }

    let success = false;

    switch (type) {
      case "confirmation":
        success = await EmailService.sendOrderConfirmation(
          order.customer.email,
          {
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            orderDate: order.orderDate,
            total: order.total,
            items: order.lines.map((line) => ({
              name: line.item.name,
              qty: line.qtyOrdered,
              unitPrice: line.unitPrice,
            })),
            shippingAddress: [
              order.shipToName || order.customer.name,
              order.shipToAddress1,
              order.shipToAddress2,
              `${order.shipToCity}, ${order.shipToState} ${order.shipToZip}`,
              order.shipToCountry,
            ]
              .filter(Boolean)
              .join("\n"),
          }
        );
        break;

      case "shipped":
        // Get the most recent shipment
        const shipment = order.shipments[order.shipments.length - 1];
        if (!shipment) {
          return NextResponse.json(
            { error: "No shipment found for this order" },
            { status: 400 }
          );
        }

        success = await EmailService.sendShipmentNotification(
          order.customer.email,
          {
            orderNumber: order.orderNumber,
            shipmentNumber: shipment.shipmentNumber,
            customerName: order.customer.name,
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
          order.customer.email,
          {
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
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
        message: `Email sent successfully to ${order.customer.email}` 
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send email. Check email configuration." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
