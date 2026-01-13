import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

// Type for inventory balance used in batch operations
type InventoryBalanceRecord = {
  id: string;
  itemId: string;
  qtyBase: number;
};

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
  data: z.record(z.string(), z.any()), // Operation-specific data
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
        // Optimized: Single updateMany instead of N updates
        try {
          const updateData: Record<string, unknown> = { costBase: data.costBase };
          if (data.costPerUom) updateData.costPerUom = data.costPerUom;

          const result = await prisma.item.updateMany({
            where: { id: { in: items } },
            data: updateData,
          });
          results.success = result.count;
          results.failed = items.length - result.count;
        } catch (error: unknown) {
          results.failed = items.length;
          results.errors.push({ itemId: "all", error: error instanceof Error ? error.message : String(error) });
        }
        break;

      case "adjust-quantities":
        // Optimized: Fetch all balances in one query, then batch update
        try {
          // Fetch all balances at once
          const balances = await prisma.inventoryBalance.findMany({
            where: {
              itemId: { in: items },
              siteId: data.siteId,
              locationId: data.locationId,
            },
          });

          const balanceMap = new Map<string, InventoryBalanceRecord>(balances.map((b: InventoryBalanceRecord): [string, InventoryBalanceRecord] => [b.itemId, b]));

          // Use transaction for atomic updates
          await prisma.$transaction(async (tx: typeof prisma) => {
            const updatePromises: Promise<unknown>[] = [];
            const eventPromises: Promise<unknown>[] = [];

            for (const itemId of items) {
              const balance = balanceMap.get(itemId);
              if (balance) {
                updatePromises.push(
                  tx.inventoryBalance.update({
                    where: { id: balance.id },
                    data: { qtyBase: balance.qtyBase + data.adjustmentQty },
                  })
                );

                eventPromises.push(
                  tx.inventoryEvent.create({
                    data: {
                      tenantId: context.user.tenantId,
                      siteId: data.siteId,
                      itemId,
                      fromLocationId: data.locationId,
                      eventType: data.adjustmentQty > 0 ? "RECEIVE" : "ADJUST",
                      qtyEntered: Math.abs(data.adjustmentQty),
                      uomEntered: "EA",
                      qtyBase: Math.abs(data.adjustmentQty),
                      notes: data.notes || "Batch adjustment",
                      createdByUserId: context.user.id,
                    },
                  })
                );
                results.success++;
              } else {
                results.failed++;
                results.errors.push({ itemId, error: "No balance found" });
              }
            }

            // Execute all updates in parallel within transaction
            await Promise.all([...updatePromises, ...eventPromises]);
          });
        } catch (error: unknown) {
          results.failed = items.length;
          results.errors.push({ itemId: "all", error: error instanceof Error ? error.message : String(error) });
        }
        break;

      case "update-reorder-points":
        // Optimized: Single updateMany instead of N updates
        try {
          const updateData: Record<string, unknown> = { reorderPointBase: data.reorderPoint };
          if (data.reorderQty) updateData.reorderQty = data.reorderQty;

          const result = await prisma.item.updateMany({
            where: { id: { in: items } },
            data: updateData,
          });
          results.success = result.count;
          results.failed = items.length - result.count;
        } catch (error: unknown) {
          results.failed = items.length;
          results.errors.push({ itemId: "all", error: error instanceof Error ? error.message : String(error) });
        }
        break;

      case "move-locations":
        // Optimized: Fetch all balances at once, batch operations in transaction
        try {
          // Fetch all from and to balances in parallel
          const [fromBalances, toBalances] = await Promise.all([
            prisma.inventoryBalance.findMany({
              where: {
                itemId: { in: items },
                siteId: data.siteId,
                locationId: data.fromLocationId,
              },
            }),
            prisma.inventoryBalance.findMany({
              where: {
                itemId: { in: items },
                siteId: data.siteId,
                locationId: data.toLocationId,
              },
            }),
          ]);

          const fromBalanceMap = new Map<string, InventoryBalanceRecord>(fromBalances.map((b: InventoryBalanceRecord): [string, InventoryBalanceRecord] => [b.itemId, b]));
          const toBalanceMap = new Map<string, InventoryBalanceRecord>(toBalances.map((b: InventoryBalanceRecord): [string, InventoryBalanceRecord] => [b.itemId, b]));

          await prisma.$transaction(async (tx: typeof prisma) => {
            const operations: Promise<unknown>[] = [];

            for (const itemId of items) {
              const fromBalance = fromBalanceMap.get(itemId);

              if (!fromBalance || fromBalance.qtyBase < data.qtyToMove) {
                results.failed++;
                results.errors.push({ itemId, error: "Insufficient quantity" });
                continue;
              }

              // Update from location
              operations.push(
                tx.inventoryBalance.update({
                  where: { id: fromBalance.id },
                  data: { qtyBase: fromBalance.qtyBase - data.qtyToMove },
                })
              );

              // Update or create to location
              const toBalance = toBalanceMap.get(itemId);
              if (toBalance) {
                operations.push(
                  tx.inventoryBalance.update({
                    where: { id: toBalance.id },
                    data: { qtyBase: toBalance.qtyBase + data.qtyToMove },
                  })
                );
              } else {
                operations.push(
                  tx.inventoryBalance.create({
                    data: {
                      tenantId: context.user.tenantId,
                      siteId: data.siteId,
                      itemId,
                      locationId: data.toLocationId,
                      qtyBase: data.qtyToMove,
                    },
                  })
                );
              }

              // Create move event
              operations.push(
                tx.inventoryEvent.create({
                  data: {
                    tenantId: context.user.tenantId,
                    siteId: data.siteId,
                    itemId,
                    fromLocationId: data.fromLocationId,
                    toLocationId: data.toLocationId,
                    eventType: "MOVE",
                    qtyEntered: data.qtyToMove,
                    uomEntered: "EA",
                    qtyBase: data.qtyToMove,
                    notes: data.notes || "Batch move",
                    createdByUserId: context.user.id,
                  },
                })
              );

              results.success++;
            }

            await Promise.all(operations);
          });
        } catch (error: unknown) {
          results.errors.push({ itemId: "transaction", error: error instanceof Error ? error.message : String(error) });
        }
        break;

      case "update-categories":
        // Optimized: Single updateMany instead of N updates
        try {
          const result = await prisma.item.updateMany({
            where: { id: { in: items } },
            data: { category: data.category },
          });
          results.success = result.count;
          results.failed = items.length - result.count;
        } catch (error: unknown) {
          results.failed = items.length;
          results.errors.push({ itemId: "all", error: error instanceof Error ? error.message : String(error) });
        }
        break;

      case "bulk-scrap":
        // Optimized: Fetch all balances at once, batch operations
        try {
          const balances = await prisma.inventoryBalance.findMany({
            where: {
              itemId: { in: items },
              siteId: data.siteId,
              locationId: data.locationId,
            },
          });

          const balanceMap = new Map<string, InventoryBalanceRecord>(balances.map((b: InventoryBalanceRecord): [string, InventoryBalanceRecord] => [b.itemId, b]));

          await prisma.$transaction(async (tx: typeof prisma) => {
            const operations: Promise<unknown>[] = [];

            for (const itemId of items) {
              const balance = balanceMap.get(itemId);

              if (balance && balance.qtyBase >= data.scrapQty) {
                operations.push(
                  tx.inventoryBalance.update({
                    where: { id: balance.id },
                    data: { qtyBase: balance.qtyBase - data.scrapQty },
                  })
                );

                operations.push(
                  tx.inventoryEvent.create({
                    data: {
                      tenantId: context.user.tenantId,
                      siteId: data.siteId,
                      itemId,
                      fromLocationId: data.locationId,
                      eventType: "SCRAP",
                      qtyEntered: data.scrapQty,
                      uomEntered: "EA",
                      qtyBase: data.scrapQty,
                      notes: data.notes || "Batch scrap",
                      createdByUserId: context.user.id,
                    },
                  })
                );
                results.success++;
              } else {
                results.failed++;
                results.errors.push({ itemId, error: "Insufficient quantity or no balance" });
              }
            }

            await Promise.all(operations);
          });
        } catch (error: unknown) {
          results.errors.push({ itemId: "transaction", error: error instanceof Error ? error.message : String(error) });
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
