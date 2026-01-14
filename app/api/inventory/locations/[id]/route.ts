import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { updateLocationSchema } from "@shared/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const location = await storage.getLocationById(id);
    const tenantCheck = await requireTenantResource(context, location, "Location");
    if (tenantCheck instanceof NextResponse) return tenantCheck;

    const payload = await validateBody(req, updateLocationSchema);
    if (payload instanceof NextResponse) return payload;

    const updated = await storage.updateLocation(location.id, payload);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
