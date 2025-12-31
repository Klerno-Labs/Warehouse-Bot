import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUser } from "@app/api/_utils/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sites = await storage.getSitesForUser(sessionUser.id);
  return NextResponse.json({ user: sessionUser, sites });
}
