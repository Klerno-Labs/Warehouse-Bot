import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { convertQuantity } from "@server/inventory";

const recordOutputSchema = z.object({
  qtyProduced: z.number().min(0),
  qtyRejected: z.number().min(0).default(0),
  toLocationId: z.string(),
  lotNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  inspectionStatus: z.string().optional(),
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

    // Can only record output for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot record output for ${order.status} orders` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = recordOutputSchema.parse(body);

    // Validate total output doesn't exceed ordered quantity
    const currentTotal = order.qtyCompleted + order.qtyRejected;
    const newTotal = currentTotal + validatedData.qtyProduced + validatedData.qtyRejected;

    if (newTotal > order.qtyOrdered) {
      return NextResponse.json(
        { error: "Total output (produced + rejected) cannot exceed ordered quantity" },
        { status: 400 }
      );
    }

    // Convert to base UOM
    const { qtyBase } = await convertQuantity(
      storage.prisma,
      session.user.tenantId,
      order.itemId,
      validatedData.qtyProduced,
      order.uom
    );

    // Create output record
    const output = await storage.createOutput({
      productionOrderId: params.id,
      itemId: order.itemId,
      qtyProduced: validatedData.qtyProduced,
      qtyRejected: validatedData.qtyRejected,
      uom: order.uom,
      qtyBase,
      toLocationId: validatedData.toLocationId,
      lotNumber: validatedData.lotNumber || order.lotNumber,
      batchNumber: validatedData.batchNumber || order.batchNumber,
      expirationDate: validatedData.expirationDate
        ? new Date(validatedData.expirationDate)
        : null,
      inspectionStatus: validatedData.inspectionStatus,
      notes: validatedData.notes,
      createdByUserId: session.user.id,
    });

    // Update production order quantities
    const updatedOrder = await storage.updateProductionOrder(params.id, {
      qtyCompleted: order.qtyCompleted + validatedData.qtyProduced,
      qtyRejected: order.qtyRejected + validatedData.qtyRejected,
      status: order.status === "RELEASED" ? "IN_PROGRESS" : order.status,
      actualStart: order.actualStart || new Date(),
    });

    // Check if order is now complete
    const totalProduced = updatedOrder.qtyCompleted + updatedOrder.qtyRejected;
    if (totalProduced >= updatedOrder.qtyOrdered) {
      await storage.updateProductionOrder(params.id, {
        status: "COMPLETED",
        actualEnd: new Date(),
      });
    }

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "ProductionOutput",
      entityId: output.id,
      details: `Recorded output: ${validatedData.qtyProduced} produced, ${validatedData.qtyRejected} rejected for order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ output }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error recording output:", error);
    return NextResponse.json(
      { error: "Failed to record output" },
      { status: 500 }
    );
  }
}
