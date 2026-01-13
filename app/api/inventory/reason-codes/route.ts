import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createReasonCodeSchema } from "@shared/inventory";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const reasonCodes = await storage.getReasonCodesByTenant(context.user.tenantId);
  return NextResponse.json(reasonCodes);
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const payload = await validateBody(req, createReasonCodeSchema);
    if (payload instanceof NextResponse) return payload;

    const reasonCode = await storage.createReasonCode({
      tenantId: context.user.tenantId,
      ...payload,
      description: payload.description || null,
    });
    return NextResponse.json(reasonCode, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
