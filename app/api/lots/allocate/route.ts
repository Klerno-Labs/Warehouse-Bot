import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LotSerialTrackingService } from "@server/lot-serial-tracking";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AllocateSchema = z.object({
  itemId: z.string(),
  siteId: z.string(),
  quantity: z.number().positive(),
  strategy: z.enum(["FIFO", "LIFO", "FEFO"]).default("FIFO"),
  requireLotTracking: z.boolean().default(false),
  requireSerialTracking: z.boolean().default(false),
});

/**
 * Lot Allocation API
 *
 * POST /api/lots/allocate - Allocate inventory using FIFO/LIFO/FEFO
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Manufacturing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, AllocateSchema);
    if (body instanceof NextResponse) return body;

    const service = new LotSerialTrackingService(context.user.tenantId);

    const allocations = await service.allocateInventory({
      itemId: body.itemId,
      siteId: body.siteId,
      quantity: body.quantity,
      strategy: body.strategy,
      requireLotTracking: body.requireLotTracking,
      requireSerialTracking: body.requireSerialTracking,
    });

    await createAuditLog(
      context,
      "ALLOCATE",
      "Inventory",
      body.itemId,
      `Allocated ${body.quantity} units using ${body.strategy} strategy`
    );

    return NextResponse.json({
      success: true,
      allocations,
      totalAllocated: allocations.reduce((sum, a) => sum + a.quantity, 0),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
