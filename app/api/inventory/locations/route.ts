import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireSiteAccess, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createLocationSchema } from "@shared/inventory";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId") || context.user.siteIds[0];
  const locations = await storage.getLocationsBySite(siteId);
  return NextResponse.json(locations.filter((l) => l.tenantId === context.user.tenantId));
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const payload = await validateBody(req, createLocationSchema);
    if (payload instanceof NextResponse) return payload;

    const siteCheck = requireSiteAccess(context, payload.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    const existing = await storage.getLocationByLabel(payload.siteId, payload.label);
    if (existing) {
      return NextResponse.json({ error: "Location label already exists" }, { status: 409 });
    }

    const location = await storage.createLocation({
      tenantId: context.user.tenantId,
      ...payload,
      zone: payload.zone || null,
      bin: payload.bin || null,
      type: payload.type || null,
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
