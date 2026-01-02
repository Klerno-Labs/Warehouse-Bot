import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

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
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await storage.getProductionOrderById(params.id);
  if (!order || order.tenantId !== session.user.tenantId) {
    return NextResponse.json(
      { error: "Production order not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ order });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await storage.getProductionOrderById(params.id);
    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

    // Cannot edit COMPLETED, CLOSED, or CANCELLED orders
    if (["COMPLETED", "CLOSED", "CANCELLED"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot edit ${existing.status} production orders` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updateProductionOrderSchema.parse(body);

    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;

      // Track status transitions
      if (validatedData.status === "RELEASED" && existing.status === "PLANNED") {
        updateData.releasedByUserId = session.user.id;
        updateData.releasedAt = new Date();
      }

      if (validatedData.status === "IN_PROGRESS" && !existing.actualStart) {
        updateData.actualStart = new Date();
      }

      if (validatedData.status === "COMPLETED") {
        if (!existing.actualStart) {
          updateData.actualStart = existing.scheduledStart;
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

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ProductionOrder",
      entityId: order.id,
      details: `Updated production order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating production order:", error);
    return NextResponse.json(
      { error: "Failed to update production order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "ProductionOrder",
      entityId: params.id,
      details: `Deleted production order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting production order:", error);
    return NextResponse.json(
      { error: "Failed to delete production order" },
      { status: 500 }
    );
  }
}
