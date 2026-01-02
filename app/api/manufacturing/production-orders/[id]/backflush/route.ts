import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { backflushConsumption } from "@server/manufacturing";

const backflushSchema = z.object({
  qtyProduced: z.number().positive(),
  fromLocationId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = await storage.getProductionOrderById(params.id);
    if (!order || order.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

    // Can only backflush for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot backflush materials for ${order.status} orders` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = backflushSchema.parse(body);

    // Validate quantity doesn't exceed ordered quantity
    if (validatedData.qtyProduced > order.qtyOrdered) {
      return NextResponse.json(
        { error: "Produced quantity cannot exceed ordered quantity" },
        { status: 400 }
      );
    }

    // Execute backflush
    const backflushedComponents = await backflushConsumption(
      storage.prisma,
      session.user.tenantId,
      params.id,
      validatedData.qtyProduced,
      validatedData.fromLocationId,
      session.user.id
    );

    // Update order status to IN_PROGRESS if not already
    if (order.status === "RELEASED") {
      await storage.updateProductionOrder(params.id, {
        status: "IN_PROGRESS",
        actualStart: new Date(),
      });
    }

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "ProductionConsumption",
      entityId: params.id,
      details: `Backflushed ${backflushedComponents.length} components for ${validatedData.qtyProduced} units of order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({
      backflushedComponents,
      count: backflushedComponents.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error backflushing components:", error);
    return NextResponse.json(
      { error: "Failed to backflush components" },
      { status: 500 }
    );
  }
}
