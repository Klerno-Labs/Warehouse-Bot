import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sites = await storage.getSitesForUser(session.user.id);
  return NextResponse.json(sites);
}
