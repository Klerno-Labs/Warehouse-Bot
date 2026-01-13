import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LotSerialTrackingService } from "@server/lot-serial-tracking";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateLotSchema = z.object({
  status: z.enum(["AVAILABLE", "QUARANTINE", "EXPIRED", "CONSUMED"]).optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Lot Detail API
 *
 * GET /api/lots/:id - Get lot details
 * PATCH /api/lots/:id - Update lot (status, expiration, etc.)
 * DELETE /api/lots/:id - Delete lot
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { id } = await params;
    const service = new LotSerialTrackingService(context.user.tenantId);

    const traceability = await service.getFullTraceability(id, "lot");

    if (!traceability) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    return NextResponse.json(traceability);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const body = await validateBody(req, UpdateLotSchema);
    if (body instanceof NextResponse) return body;

    const service = new LotSerialTrackingService(context.user.tenantId);

    const updated = await service.updateLotStatus(
      id,
      body.status || "AVAILABLE",
      body.notes
    );

    await createAuditLog(
      context,
      "UPDATE",
      "Lot",
      id,
      `Updated lot status to ${body.status}`
    );

    return NextResponse.json({ lot: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
