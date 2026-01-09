import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireSiteAccess, handleApiError } from "@app/api/_utils/middleware";

export async function GET(
  _req: Request,
  { params }: { params: { siteId: string } },
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const siteCheck = requireSiteAccess(context, params.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    const workcells = await storage.getWorkcellsBySite(params.siteId);
    return NextResponse.json(workcells);
  } catch (error) {
    return handleApiError(error);
  }
}
