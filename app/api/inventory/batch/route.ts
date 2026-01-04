import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

/**
 * Batch Operations API
 *
 * Perform bulk updates on inventory, items, and other entities
 *
 * POST /api/inventory/batch
 * - Execute batch operations
 */

const batchOperationSchema = z.object({
  operation: z.enum([
    "update-costs",
    "adjust-quantities",
    "update-reorder-points",
    "move-locations",
    "update-categories",
    "bulk-scrap",
  ]),
  items: z.array(z.string()), // Array of item IDs
  data: z.record(z.any()), // Operation-specific data
});

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, batchOperationSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const { operation, items, data } = validatedData;

    let results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ itemId: string; error: string }>,
    };

    switch (operation) {
      case "update-costs":
        // Bulk update item costs
        for (const itemId of items) {
          try {
            await prisma.item.update({
              where: { id: itemId },
              data: {
                costBase: data.costBase,
                ...(data.costPerUom && { costPerUom: data.costPerUom }),
              },
            });
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      case "adjust-quantities":
        // Bulk adjust inventory quantities
        for (const itemId of items) {
          try {
            const balance = await prisma.inventoryBalance.findFirst({
              where: {
                itemId,
                siteId: data.siteId,
                locationId: data.locationId,
              },
            });

            if (balance) {
              await prisma.inventoryBalance.update({
                where: { id: balance.id },
                data: {
                  qtyBase: balance.qtyBase + data.adjustmentQty,
                },
              });

              // Create inventory event
              await prisma.inventoryEvent.create({
                data: {
                  tenantId: context.user.tenantId,
                  siteId: data.siteId,
                  itemId,
                  fromLocationId: data.locationId,
                  eventType: data.adjustmentQty > 0 ? "RECEIVE" : "ADJUST",
                  qtyBase: Math.abs(data.adjustmentQty),
                  uom: "EA",
                  reasonCode: data.reasonCode || "ADJUST",
                  notes: data.notes || "Batch adjustment",
                  createdByUserId: context.user.id,
                },
              });
            }
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      case "update-reorder-points":
        // Bulk update reorder points
        for (const itemId of items) {
          try {
            await prisma.item.update({
              where: { id: itemId },
              data: {
                reorderPointBase: data.reorderPoint,
                ...(data.reorderQty && { reorderQty: data.reorderQty }),
              },
            });
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      case "move-locations":
        // Bulk move items between locations
        for (const itemId of items) {
          try {
            // Get current balance
            const fromBalance = await prisma.inventoryBalance.findFirst({
              where: {
                itemId,
                siteId: data.siteId,
                locationId: data.fromLocationId,
              },
            });

            if (!fromBalance || fromBalance.qtyBase < data.qtyToMove) {
              throw new Error("Insufficient quantity");
            }

            // Update from location
            await prisma.inventoryBalance.update({
              where: { id: fromBalance.id },
              data: { qtyBase: fromBalance.qtyBase - data.qtyToMove },
            });

            // Update or create to location
            const toBalance = await prisma.inventoryBalance.findFirst({
              where: {
                itemId,
                siteId: data.siteId,
                locationId: data.toLocationId,
              },
            });

            if (toBalance) {
              await prisma.inventoryBalance.update({
                where: { id: toBalance.id },
                data: { qtyBase: toBalance.qtyBase + data.qtyToMove },
              });
            } else {
              await prisma.inventoryBalance.create({
                data: {
                  tenantId: context.user.tenantId,
                  siteId: data.siteId,
                  itemId,
                  locationId: data.toLocationId,
                  qtyBase: data.qtyToMove,
                },
              });
            }

            // Create move event
            await prisma.inventoryEvent.create({
              data: {
                tenantId: context.user.tenantId,
                siteId: data.siteId,
                itemId,
                fromLocationId: data.fromLocationId,
                toLocationId: data.toLocationId,
                eventType: "MOVE",
                qtyBase: data.qtyToMove,
                uom: "EA",
                notes: data.notes || "Batch move",
                createdByUserId: context.user.id,
              },
            });

            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      case "update-categories":
        // Bulk update item categories
        for (const itemId of items) {
          try {
            await prisma.item.update({
              where: { id: itemId },
              data: { category: data.category },
            });
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      case "bulk-scrap":
        // Bulk scrap items
        for (const itemId of items) {
          try {
            const balance = await prisma.inventoryBalance.findFirst({
              where: {
                itemId,
                siteId: data.siteId,
                locationId: data.locationId,
              },
            });

            if (balance && balance.qtyBase >= data.scrapQty) {
              await prisma.inventoryBalance.update({
                where: { id: balance.id },
                data: { qtyBase: balance.qtyBase - data.scrapQty },
              });

              await prisma.inventoryEvent.create({
                data: {
                  tenantId: context.user.tenantId,
                  siteId: data.siteId,
                  itemId,
                  fromLocationId: data.locationId,
                  eventType: "SCRAP",
                  qtyBase: data.scrapQty,
                  uom: "EA",
                  reasonCode: data.reasonCode || "SCRAP",
                  notes: data.notes || "Batch scrap",
                  createdByUserId: context.user.id,
                },
              });
            }
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ itemId, error: error.message });
          }
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Batch operation completed: ${results.success} successful, ${results.failed} failed`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
