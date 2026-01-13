import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LotSerialTrackingService } from "@server/lot-serial-tracking";
import { z } from "zod";

export const dynamic = "force-dynamic";

const InitiateRecallSchema = z.object({
  lotIds: z.array(z.string()).min(1),
  reason: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  notifyCustomers: z.boolean().default(true),
});

/**
 * Lot Recall API
 *
 * POST /api/lots/recall - Initiate a recall for specified lots
 * GET /api/lots/recall?lotId=xxx - Get affected customers for a lot recall
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const lotId = searchParams.get("lotId");

    if (!lotId) {
      return NextResponse.json(
        { error: "lotId is required" },
        { status: 400 }
      );
    }

    const service = new LotSerialTrackingService(context.user.tenantId);
    const affectedCustomers = await service.getAffectedCustomers(lotId);

    return NextResponse.json({
      lotId,
      affectedCustomers,
      count: affectedCustomers.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, InitiateRecallSchema);
    if (body instanceof NextResponse) return body;

    const service = new LotSerialTrackingService(context.user.tenantId);

    const recallResults = await service.initiateRecall(
      body.lotIds,
      body.reason,
      body.severity
    );

    for (const lotId of body.lotIds) {
      await createAuditLog(
        context,
        "RECALL",
        "Lot",
        lotId,
        `Initiated ${body.severity} recall: ${body.reason}`
      );
    }

    return NextResponse.json({
      success: true,
      recall: recallResults,
      message: `Recall initiated for ${body.lotIds.length} lots`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
