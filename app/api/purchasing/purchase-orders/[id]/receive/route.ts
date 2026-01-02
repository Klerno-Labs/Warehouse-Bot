import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { applyInventoryEvent, convertQuantity } from "@server/inventory";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const receiveLineSchema = z.object({
  purchaseOrderLineId: z.string(),
  qtyReceived: z.number().positive(),
  notes: z.string().optional(),
});

const receiveSchema = z.object({
  receiptNumber: z.string().min(1),
  receiptDate: z.string(),
  locationId: z.string(),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(receiveLineSchema).min(1),
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
    const purchaseOrder = await storage.getPurchaseOrderById(params.id);
    if (!purchaseOrder || purchaseOrder.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Only allow receiving approved or sent POs
    if (!["APPROVED", "SENT", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status)) {
      return NextResponse.json(
        { error: "Purchase order must be approved before receiving" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = receiveSchema.parse(body);

    // Create receipt
    const receipt = await storage.createReceipt({
      tenantId: session.user.tenantId,
      siteId: purchaseOrder.siteId,
      purchaseOrderId: purchaseOrder.id,
      receiptNumber: validatedData.receiptNumber,
      receiptDate: new Date(validatedData.receiptDate),
      locationId: validatedData.locationId,
      receivedBy: validatedData.receivedBy || session.user.email,
      notes: validatedData.notes,
    });

    // Process each received line
    for (const receiveLine of validatedData.lines) {
      const poLine = purchaseOrder.lines.find((l) => l.id === receiveLine.purchaseOrderLineId);
      if (!poLine) {
        throw new Error(`PO line ${receiveLine.purchaseOrderLineId} not found`);
      }

      // Create receipt line
      await storage.createReceiptLine({
        receiptId: receipt.id,
        purchaseOrderLineId: receiveLine.purchaseOrderLineId,
        itemId: poLine.itemId,
        qtyReceived: receiveLine.qtyReceived,
        uom: poLine.uom,
        notes: receiveLine.notes,
      });

      // Update PO line qty received
      const newQtyReceived = poLine.qtyReceived + receiveLine.qtyReceived;
      const lineStatus =
        newQtyReceived >= poLine.qtyOrdered ? "RECEIVED" : "PARTIALLY_RECEIVED";

      await storage.updatePurchaseOrderLine(poLine.id, {
        qtyReceived: newQtyReceived,
        status: lineStatus,
      });

      // Create inventory event (RECEIVE)
      const { qtyBase } = await convertQuantity(
        prisma,
        session.user.tenantId,
        poLine.itemId,
        receiveLine.qtyReceived,
        poLine.uom
      );

      await applyInventoryEvent(
        prisma,
        { tenantId: session.user.tenantId, role: session.user.role },
        {
          tenantId: session.user.tenantId,
          siteId: purchaseOrder.siteId,
          eventType: "RECEIVE",
          itemId: poLine.itemId,
          qtyEntered: receiveLine.qtyReceived,
          uomEntered: poLine.uom,
          qtyBase,
          toLocationId: validatedData.locationId,
          referenceId: receipt.id,
          notes: `Received from PO ${purchaseOrder.poNumber}`,
          createdByUserId: session.user.id,
        }
      );
    }

    // Update PO status
    const allLinesReceived = purchaseOrder.lines.every((line) => {
      const receivedQty = validatedData.lines
        .filter((rl) => rl.purchaseOrderLineId === line.id)
        .reduce((sum, rl) => sum + rl.qtyReceived, line.qtyReceived);
      return receivedQty >= line.qtyOrdered;
    });

    const someLinesReceived = validatedData.lines.length > 0;

    const newPOStatus = allLinesReceived
      ? "RECEIVED"
      : someLinesReceived
      ? "PARTIALLY_RECEIVED"
      : purchaseOrder.status;

    await storage.updatePurchaseOrder(purchaseOrder.id, {
      status: newPOStatus,
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Receipt",
      entityId: receipt.id,
      details: `Received items for PO ${purchaseOrder.poNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error receiving purchase order:", error);
    return NextResponse.json(
      { error: "Failed to receive purchase order" },
      { status: 500 }
    );
  }
}
