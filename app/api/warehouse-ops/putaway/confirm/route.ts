import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { PutawayService } from "@server/warehouse-operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ConfirmPutawaySchema = z.object({
  itemId: z.string(),
  siteId: z.string(),
  locationId: z.string(),
  quantity: z.number().positive(),
  lotId: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
});

/**
 * Confirm Putaway API
 *
 * POST /api/warehouse-ops/putaway/confirm - Confirm putaway to location
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, ConfirmPutawaySchema);
    if (body instanceof NextResponse) return body;

    const service = new PutawayService(context.user.tenantId);

    const result = await service.confirmPutaway({
      itemId: body.itemId,
      siteId: body.siteId,
      locationId: body.locationId,
      quantity: body.quantity,
      lotId: body.lotId,
      serialNumbers: body.serialNumbers,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "PUTAWAY",
      "Inventory",
      body.itemId,
      `Put away ${body.quantity} units to location ${body.locationId}`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully put away ${body.quantity} units`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
