import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { PutawayService, SlottingService } from "@server/warehouse-operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PutawayRequestSchema = z.object({
  itemId: z.string(),
  siteId: z.string(),
  quantity: z.number().positive(),
  lotId: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  receivingLocationId: z.string().optional(),
});

const OptimizeSlottingSchema = z.object({
  siteId: z.string(),
  itemIds: z.array(z.string()).optional(),
});

/**
 * Putaway & Slotting API
 *
 * POST /api/warehouse-ops/putaway - Get directed putaway suggestion
 * POST /api/warehouse-ops/putaway/confirm - Confirm putaway
 * POST /api/warehouse-ops/putaway/optimize - Optimize slotting
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, PutawayRequestSchema);
    if (body instanceof NextResponse) return body;

    const service = new PutawayService(context.user.tenantId);

    const suggestion = await service.suggestPutawayLocation({
      itemId: body.itemId,
      siteId: body.siteId,
      quantity: body.quantity,
      lotId: body.lotId,
      serialNumbers: body.serialNumbers,
      receivingLocationId: body.receivingLocationId,
    });

    return NextResponse.json({
      suggestion,
      message: `Suggested location: ${suggestion.locationCode}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, OptimizeSlottingSchema);
    if (body instanceof NextResponse) return body;

    const slottingService = new SlottingService(context.user.tenantId);
    const recommendations = await slottingService.optimizeSlotting(body.siteId);

    await createAuditLog(
      context,
      "OPTIMIZE",
      "Slotting",
      body.siteId,
      `Generated ${recommendations.length} slotting recommendations`
    );

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
