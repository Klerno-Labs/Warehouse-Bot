import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(
  _req: Request,
  { params }: { params: { siteId: string } },
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.siteIds.includes(params.siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }
  const departments = await storage.getDepartmentsBySite(params.siteId);
  return NextResponse.json(departments);
}
