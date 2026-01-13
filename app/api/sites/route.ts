import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";

export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const sites = await storage.getSitesForUser(context.user.id);
    return NextResponse.json(sites);
  } catch (error) {
    return handleApiError(error);
  }
}
