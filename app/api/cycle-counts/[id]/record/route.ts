import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireSiteAccess, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { recordCountSchema } from "@shared/cycle-counts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const cycleCount = await storage.getCycleCountById(id);

    const tenantCheck = await requireTenantResource(context, cycleCount, "Cycle count");
    if (tenantCheck instanceof NextResponse) return tenantCheck;

    const siteCheck = requireSiteAccess(context, cycleCount.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    if (cycleCount.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Cycle count must be in progress to record counts" },
        { status: 400 }
      );
    }

    const payload = await validateBody(req, recordCountSchema);
    if (payload instanceof NextResponse) return payload;

    const line = await storage.getCycleCountLineById(payload.cycleCountLineId);

    if (!line || line.cycleCountId !== id) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    if (line.status !== "PENDING") {
      return NextResponse.json(
        { error: "Line has already been counted" },
        { status: 400 }
      );
    }

    // Calculate variance
    const variance = payload.countedQtyBase - (line.expectedQtyBase || 0);

    const updated = await storage.updateCycleCountLine(payload.cycleCountLineId, {
      countedQtyBase: payload.countedQtyBase,
      varianceQtyBase: variance,
      status: "COUNTED",
      countedByUserId: context.user.id,
      countedAt: new Date(),
      notes: payload.notes || line.notes,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
