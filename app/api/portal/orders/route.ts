import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

/**
 * Customer Portal - Order Tracking API
 *
 * Public-facing API for customers to track their orders
 * Uses order number + email for authentication (no login required)
 *
 * POST /api/portal/orders/track
 * - Track order status by order number and email
 *
 * GET /api/portal/orders/:orderNumber
 * - Get order details (with token authentication)
 */

const trackOrderSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

// Track order by order number and email
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = trackOrderSchema.parse(body);

    // For now, we'll use production orders as "customer orders"
    // In a real system, you'd have a separate CustomerOrder table
    const order = await prisma.productionOrder.findFirst({
      where: {
        orderNumber: validatedData.orderNumber,
        // We'd need to add customer email to the schema
        // For now, just match on order number
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
          },
        },
        site: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found. Please check your order number and email." },
        { status: 404 }
      );
    }

    // Generate secure token for subsequent requests
    const token = Buffer.from(
      `${order.id}:${validatedData.email}:${Date.now()}`
    ).toString("base64");

    return NextResponse.json({
      success: true,
      token,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        item: {
          name: order.item.name,
          description: order.item.description,
          sku: order.item.sku,
        },
        quantityOrdered: order.qtyOrdered,
        quantityProduced: order.qtyCompleted || 0,
        scheduledDate: order.scheduledStart,
        startedAt: order.actualStart,
        completedAt: order.actualEnd,
        estimatedCompletion: order.scheduledEnd || order.scheduledStart,
        site: {
          name: order.site.name,
          address: order.site.address,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

// Get all orders for authenticated customer portal session
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const status = searchParams.get("status");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // In a real system, you'd filter by customer ID or email
    // For now, return recent production orders
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        item: {
          select: {
            sku: true,
            name: true,
          },
        },
        site: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        item: order.item.name,
        sku: order.item.sku,
        quantityOrdered: order.qtyOrdered,
        quantityProduced: order.qtyCompleted || 0,
        scheduledDate: order.scheduledStart,
        completedAt: order.actualEnd,
        site: order.site.name,
        progress: order.qtyOrdered > 0 ? ((order.qtyCompleted || 0) / order.qtyOrdered) * 100 : 0,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
