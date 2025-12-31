import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId") || session.user.siteIds[0];
  if (!session.user.siteIds.includes(siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }
  const balances = await storage.getInventoryBalancesBySite(siteId);
  return NextResponse.json(balances.filter((b) => b.tenantId === session.user.tenantId));
}
