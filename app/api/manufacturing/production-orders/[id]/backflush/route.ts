import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { backflushConsumption } from "@server/manufacturing";

const backflushSchema = z.object({
  qtyProduced: z.number().positive(),
  fromLocationId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Can only backflush for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot backflush materials for ${order.status} orders` },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, backflushSchema);
    if (validatedData instanceof NextResponse) return validatedData;

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
      context.user.tenantId,
      id,
      validatedData.qtyProduced,
      validatedData.fromLocationId,
      context.user.id
    );

    // Update order status to IN_PROGRESS if not already
    if (order.status === "RELEASED") {
      await storage.updateProductionOrder(id, {
        status: "IN_PROGRESS",
        actualStart: new Date(),
      });
    }

    await createAuditLog(
      context,
      "CREATE",
      "ProductionConsumption",
      id,
      `Backflushed ${backflushedComponents.length} components for ${validatedData.qtyProduced} units of order ${order.orderNumber}`
    );

    return NextResponse.json({
      backflushedComponents,
      count: backflushedComponents.length,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
