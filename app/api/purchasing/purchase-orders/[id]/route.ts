import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const updatePOSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).optional(),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  tax: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchaseOrder = await storage.getPurchaseOrderById(params.id);
  if (!purchaseOrder || purchaseOrder.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  return NextResponse.json({ purchaseOrder });
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
    const existing = await storage.getPurchaseOrderById(params.id);
    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updatePOSchema.parse(body);

    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;
      if (validatedData.status === "APPROVED") {
        updateData.approvedByUserId = session.user.id;
        updateData.approvedAt = new Date();
      } else if (validatedData.status === "SENT") {
        updateData.sentAt = new Date();
      }
    }

    if (validatedData.expectedDelivery) {
      updateData.expectedDelivery = new Date(validatedData.expectedDelivery);
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    if (validatedData.tax !== undefined || validatedData.shipping !== undefined) {
      const tax = validatedData.tax ?? existing.tax;
      const shipping = validatedData.shipping ?? existing.shipping;
      updateData.tax = tax;
      updateData.shipping = shipping;
      updateData.total = existing.subtotal + tax + shipping;
    }

    const purchaseOrder = await storage.updatePurchaseOrder(params.id, updateData);

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      details: `Updated PO ${purchaseOrder.poNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
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
    const purchaseOrder = await storage.getPurchaseOrderById(params.id);
    if (!purchaseOrder || purchaseOrder.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Only allow deletion of draft POs
    if (purchaseOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft purchase orders" },
        { status: 400 }
      );
    }

    await storage.deletePurchaseOrder(params.id);

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "PurchaseOrder",
      entityId: params.id,
      details: `Deleted PO ${purchaseOrder.poNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
