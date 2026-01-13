import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "50");
    const events = await storage.getAuditEvents(context.user.tenantId, limit);
    return NextResponse.json(events);
  } catch (error) {
    return handleApiError(error);
  }
}
