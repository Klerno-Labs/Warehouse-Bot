import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { convertQuantity } from "@server/inventory";

const consumeComponentSchema = z.object({
  bomComponentId: z.string().optional(),
  itemId: z.string(),
  qtyConsumed: z.number().positive(),
  uom: z.enum(["EA", "FT", "YD", "ROLL"]),
  fromLocationId: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  isScrap: z.boolean().default(false),
  reasonCodeId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(params.id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Can only consume for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot consume materials for ${order.status} orders` },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, consumeComponentSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    // Convert to base UOM
    const { qtyBase } = await convertQuantity(
      storage.prisma,
      context.user.tenantId,
      validatedData.itemId,
      validatedData.qtyConsumed,
      validatedData.uom
    );

    // Create consumption record
    const consumption = await storage.createConsumption({
      productionOrderId: params.id,
      bomComponentId: validatedData.bomComponentId,
      itemId: validatedData.itemId,
      qtyConsumed: validatedData.qtyConsumed,
      uom: validatedData.uom,
      qtyBase,
      fromLocationId: validatedData.fromLocationId,
      lotNumber: validatedData.lotNumber,
      serialNumber: validatedData.serialNumber,
      isBackflushed: false,
      isScrap: validatedData.isScrap,
      reasonCodeId: validatedData.reasonCodeId,
      notes: validatedData.notes,
      createdByUserId: context.user.id,
    });

    // Update order status to IN_PROGRESS if not already
    if (order.status === "RELEASED") {
      await storage.updateProductionOrder(params.id, {
        status: "IN_PROGRESS",
        actualStart: new Date(),
      });
    }

    await createAuditLog(
      context,
      "CREATE",
      "ProductionConsumption",
      consumption.id,
      `Consumed ${validatedData.qtyConsumed} ${validatedData.uom} of ${consumption.item.name} for order ${order.orderNumber}`
    );

    return NextResponse.json({ consumption }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
