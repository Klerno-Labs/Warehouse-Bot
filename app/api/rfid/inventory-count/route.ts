import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { RFIDService } from "@server/rfid-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RFIDInventoryCountSchema = z.object({
  siteId: z.string(),
  locationId: z.string().optional(),
  zoneId: z.string().optional(),
  epcs: z.array(z.string()),
  readerId: z.string(),
});

/**
 * RFID Inventory Count API
 *
 * POST /api/rfid/inventory-count - Perform RFID-based inventory count
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, RFIDInventoryCountSchema);
    if (body instanceof NextResponse) return body;

    const service = new RFIDService(context.user.tenantId);

    const result = await service.performInventoryCount({
      siteId: body.siteId,
      locationId: body.locationId,
      zoneId: body.zoneId,
      epcs: body.epcs,
      readerId: body.readerId,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "RFID_COUNT",
      "Inventory",
      body.siteId,
      `RFID inventory count: ${result.matchedCount} matched, ${result.discrepancies.length} discrepancies`
    );

    return NextResponse.json({
      success: true,
      result,
      summary: {
        scannedTags: body.epcs.length,
        matchedCount: result.matchedCount,
        discrepancyCount: result.discrepancies.length,
        missingCount: result.missingTags.length,
        unexpectedCount: result.unexpectedTags.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
