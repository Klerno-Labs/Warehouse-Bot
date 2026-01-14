import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireSiteAccess, handleApiError } from "@app/api/_utils/middleware";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
    const context = await requireAuth();
    const { siteId } = await params;
    if (context instanceof NextResponse) return context;

    const siteCheck = requireSiteAccess(context, siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    const departments = await storage.getDepartmentsBySite(siteId);
    return NextResponse.json(departments);
  } catch (error) {
    return handleApiError(error);
  }
}
