import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";

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
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawPurchaseOrder = await storage.getPurchaseOrderById(params.id);
    const purchaseOrder = await requireTenantResource(context, rawPurchaseOrder, "Purchase order");
    if (purchaseOrder instanceof NextResponse) return purchaseOrder;

    return NextResponse.json({ purchaseOrder });
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

    const existing = await storage.getPurchaseOrderById(params.id);
    const validatedExisting = await requireTenantResource(context, existing, "Purchase order");
    if (validatedExisting instanceof NextResponse) return validatedExisting;

    const validatedData = await validateBody(req, updatePOSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;
      if (validatedData.status === "APPROVED") {
        updateData.approvedByUserId = context.user.id;
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
      const tax = validatedData.tax ?? validatedExisting.tax;
      const shipping = validatedData.shipping ?? validatedExisting.shipping;
      updateData.tax = tax;
      updateData.shipping = shipping;
      updateData.total = validatedExisting.subtotal + tax + shipping;
    }

    const purchaseOrder = await storage.updatePurchaseOrder(params.id, updateData);

    await createAuditLog(
      context,
      "UPDATE",
      "PurchaseOrder",
      purchaseOrder.id,
      `Updated PO ${purchaseOrder.poNumber}`
    );

    return NextResponse.json({ purchaseOrder });
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

    const rawPurchaseOrder = await storage.getPurchaseOrderById(params.id);
    const purchaseOrder = await requireTenantResource(context, rawPurchaseOrder, "Purchase order");
    if (purchaseOrder instanceof NextResponse) return purchaseOrder;

    // Only allow deletion of draft POs
    if (purchaseOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft purchase orders" },
        { status: 400 }
      );
    }

    await storage.deletePurchaseOrder(params.id);

    await createAuditLog(
      context,
      "DELETE",
      "PurchaseOrder",
      params.id,
      `Deleted PO ${purchaseOrder.poNumber}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
