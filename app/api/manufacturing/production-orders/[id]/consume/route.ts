import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
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

    // Can only consume for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot consume materials for ${order.status} orders` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = consumeComponentSchema.parse(body);

    // Convert to base UOM
    const { qtyBase } = await convertQuantity(
      storage.prisma,
      session.user.tenantId,
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
      createdByUserId: session.user.id,
    });

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
      entityId: consumption.id,
      details: `Consumed ${validatedData.qtyConsumed} ${validatedData.uom} of ${consumption.item.name} for order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ consumption }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error consuming component:", error);
    return NextResponse.json(
      { error: "Failed to consume component" },
      { status: 500 }
    );
  }
}
