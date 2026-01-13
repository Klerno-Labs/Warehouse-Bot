import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";

const updateProductionOrderSchema = z.object({
  status: z
    .enum([
      "PLANNED",
      "RELEASED",
      "IN_PROGRESS",
      "COMPLETED",
      "CLOSED",
      "CANCELLED",
    ])
    .optional(),
  qtyCompleted: z.number().min(0).optional(),
  qtyRejected: z.number().min(0).optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  workcellId: z.string().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(params.id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const existing = await storage.getProductionOrderById(params.id);
    const validatedExisting = await requireTenantResource(context, existing, "Production order");
    if (validatedExisting instanceof NextResponse) return validatedExisting;

    // Cannot edit COMPLETED, CLOSED, or CANCELLED orders
    if (["COMPLETED", "CLOSED", "CANCELLED"].includes(validatedExisting.status)) {
      return NextResponse.json(
        { error: `Cannot edit ${validatedExisting.status} production orders` },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, updateProductionOrderSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;

      // Track status transitions
      if (validatedData.status === "RELEASED" && validatedExisting.status === "PLANNED") {
        updateData.releasedByUserId = context.user.id;
        updateData.releasedAt = new Date();
      }

      if (validatedData.status === "IN_PROGRESS" && !validatedExisting.actualStart) {
        updateData.actualStart = new Date();
      }

      if (validatedData.status === "COMPLETED") {
        if (!validatedExisting.actualStart) {
          updateData.actualStart = validatedExisting.scheduledStart;
        }
        updateData.actualEnd = new Date();
      }
    }

    if (validatedData.qtyCompleted !== undefined) {
      updateData.qtyCompleted = validatedData.qtyCompleted;
    }

    if (validatedData.qtyRejected !== undefined) {
      updateData.qtyRejected = validatedData.qtyRejected;
    }

    if (validatedData.scheduledStart) {
      updateData.scheduledStart = new Date(validatedData.scheduledStart);
    }

    if (validatedData.scheduledEnd) {
      updateData.scheduledEnd = new Date(validatedData.scheduledEnd);
    }

    if (validatedData.actualStart) {
      updateData.actualStart = new Date(validatedData.actualStart);
    }

    if (validatedData.actualEnd) {
      updateData.actualEnd = new Date(validatedData.actualEnd);
    }

    if (validatedData.workcellId !== undefined) {
      updateData.workcellId = validatedData.workcellId;
    }

    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const order = await storage.updateProductionOrder(params.id, updateData);

    await createAuditLog(
      context,
      "UPDATE",
      "ProductionOrder",
      order.id,
      `Updated production order ${order.orderNumber}`
    );

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(params.id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Only allow deletion of PLANNED orders
    if (order.status !== "PLANNED") {
      return NextResponse.json(
        { error: "Can only delete PLANNED production orders" },
        { status: 400 }
      );
    }

    // Check if order has consumptions or outputs
    if (
      order.consumptions.length > 0 ||
      order.outputs.length > 0
    ) {
      return NextResponse.json(
        { error: "Cannot delete production order with existing consumptions or outputs" },
        { status: 400 }
      );
    }

    await storage.deleteProductionOrder(params.id);

    await createAuditLog(
      context,
      "DELETE",
      "ProductionOrder",
      params.id,
      `Deleted production order ${order.orderNumber}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
