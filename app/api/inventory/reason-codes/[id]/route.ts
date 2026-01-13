import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { updateReasonCodeSchema } from "@shared/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const reason = await storage.getReasonCodeById(params.id);
    const tenantCheck = await requireTenantResource(context, reason, "Reason code");
    if (tenantCheck instanceof NextResponse) return tenantCheck;

    const payload = await validateBody(req, updateReasonCodeSchema);
    if (payload instanceof NextResponse) return payload;

    const updated = await storage.updateReasonCode(reason.id, payload);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
