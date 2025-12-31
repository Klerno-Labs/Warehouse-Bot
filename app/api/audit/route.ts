import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");
  const events = await storage.getAuditEvents(session.user.tenantId, limit);
  return NextResponse.json(events);
}
