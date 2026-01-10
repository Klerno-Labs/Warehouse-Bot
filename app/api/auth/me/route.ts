import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth } from "@app/api/_utils/middleware";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const sites = await storage.getSitesForUser(context.user.id);
  return NextResponse.json({ user: context.user, sites });
}
