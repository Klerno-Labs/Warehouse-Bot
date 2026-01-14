import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { applyInventoryEvent, convertQuantity } from "@server/inventory";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const purchaseOrder = await storage.getPurchaseOrderById(id);
    if (!purchaseOrder || purchaseOrder.tenantId !== context.user.tenantId) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Only allow receiving approved or sent POs
    if (!["APPROVED", "SENT", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status)) {
      return NextResponse.json(
        { error: "Purchase order must be approved before receiving" },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, receiveSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    // Create receipt
    const receipt = await storage.createReceipt({
      tenantId: context.user.tenantId,
      siteId: purchaseOrder.siteId,
      purchaseOrderId: purchaseOrder.id,
      receiptNumber: validatedData.receiptNumber,
      receiptDate: new Date(validatedData.receiptDate),
      locationId: validatedData.locationId,
      receivedBy: validatedData.receivedBy || context.user.name,
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
        context.user.tenantId,
        poLine.itemId,
        receiveLine.qtyReceived,
        poLine.uom
      );

      await applyInventoryEvent(
        prisma,
        { tenantId: context.user.tenantId, role: context.user.role },
        {
          tenantId: context.user.tenantId,
          siteId: purchaseOrder.siteId,
          eventType: "RECEIVE",
          itemId: poLine.itemId,
          qtyEntered: receiveLine.qtyReceived,
          uomEntered: poLine.uom,
          qtyBase,
          toLocationId: validatedData.locationId,
          referenceId: receipt.id,
          notes: `Received from PO ${purchaseOrder.poNumber}`,
          createdByUserId: context.user.id,
        }
      );

      // ============ AUTOMATIC COST TRACKING ============
      // Update item costs based on PO line price
      if (poLine.unitPrice && poLine.unitPrice > 0) {
        const item = await storage.getItemById(poLine.itemId);
        if (item) {
              // Convert PO price to base UOM cost
          // convertQuantity returns qtyBase = qtyEntered * toBase
          // So for 1 unit: qtyBase = 1 * toBase = toBase
          const { qtyBase: toBase } = await convertQuantity(
            prisma,
            context.user.tenantId,
            poLine.itemId,
            1,
            poLine.uom
          );
          const costPerBaseUnit = poLine.unitPrice / toBase;

          // Get current inventory balance for weighted average calculation (before this receipt)
          const balances = await prisma.inventoryBalance.findMany({
            where: { itemId: poLine.itemId },
          });
          const currentQtyBase = balances.reduce((sum, b) => sum + (b.qtyBase || 0), 0);

          // Calculate weighted average cost
          const currentAvgCost = item.avgCostBase || item.costBase || 0;
          const newAvgCost = currentQtyBase > 0
            ? ((currentQtyBase * currentAvgCost) + (qtyBase * costPerBaseUnit)) / (currentQtyBase + qtyBase)
            : costPerBaseUnit;

          // Update item costs
          await storage.updateItem(poLine.itemId, {
            lastCostBase: costPerBaseUnit,
            avgCostBase: newAvgCost,
          });
        }
      }
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
      tenantId: context.user.tenantId,
      userId: context.user.id,
      action: "CREATE",
      entityType: "Receipt",
      entityId: receipt.id,
      details: `Received items for PO ${purchaseOrder.poNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
