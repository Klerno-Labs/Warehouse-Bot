import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
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
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(params.id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Can only record output for RELEASED or IN_PROGRESS orders
    if (!["RELEASED", "IN_PROGRESS"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot record output for ${order.status} orders` },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, recordOutputSchema);
    if (validatedData instanceof NextResponse) return validatedData;

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
      context.user.tenantId,
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
      createdByUserId: context.user.id,
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

    await createAuditLog(
      context,
      "CREATE",
      "ProductionOutput",
      output.id,
      `Recorded output: ${validatedData.qtyProduced} produced, ${validatedData.qtyRejected} rejected for order ${order.orderNumber}`
    );

    return NextResponse.json({ output }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
