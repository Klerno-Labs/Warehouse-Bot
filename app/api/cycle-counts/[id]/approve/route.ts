import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireSiteAccess, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { approveVarianceSchema } from "@shared/cycle-counts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) {
      return NextResponse.json({ error: "Only Admin or Supervisor can approve variances" }, { status: 403 });
    }

    const { id } = await params;
    const cycleCount = await storage.getCycleCountById(id);

    const tenantCheck = await requireTenantResource(context, cycleCount, "Cycle count");
    if (tenantCheck instanceof NextResponse) return tenantCheck;

    const siteCheck = requireSiteAccess(context, cycleCount.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    const payload = await validateBody(req, approveVarianceSchema);
    if (payload instanceof NextResponse) return payload;

    const line = await storage.getCycleCountLineById(payload.cycleCountLineId);

    if (!line || line.cycleCountId !== id) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    if (line.status !== "COUNTED") {
      return NextResponse.json(
        { error: "Line must be counted before approving variance" },
        { status: 400 }
      );
    }

    // Update line status based on approval decision
    const newStatus = payload.approved ? "VARIANCE_APPROVED" : "VARIANCE_REJECTED";

    const updatedLine = await storage.updateCycleCountLine(payload.cycleCountLineId, {
      status: newStatus,
      approvedByUserId: context.user.id,
      approvedAt: new Date(),
      notes: payload.notes || line.notes,
    });

    // If approved and there's a variance, adjust the inventory balance
    if (payload.approved && line.varianceQtyBase !== undefined && line.varianceQtyBase !== 0 && line.varianceQtyBase !== null) {
      // Get the current balance
      const balances = await storage.getInventoryBalancesBySite(cycleCount.siteId);
      const balance = balances.find(
        (b) => b.itemId === line.itemId && b.locationId === line.locationId
      );

      if (balance) {
        // Create an adjustment event
        const item = await storage.getItemById(line.itemId);

        await storage.createInventoryEvent({
          tenantId: context.user.tenantId,
          siteId: cycleCount.siteId,
          eventType: "ADJUST",
          itemId: line.itemId,
          fromLocationId: null,
          toLocationId: line.locationId,
          qtyEntered: line.varianceQtyBase,
          uomEntered: item?.baseUom || "EA",
          qtyBase: line.varianceQtyBase,
          referenceId: cycleCount.id,
          reasonCodeId: null,
          notes: `Cycle count adjustment: ${cycleCount.name}`,
          createdByUserId: context.user.id,
          workcellId: null,
          deviceId: null,
        });

        // Update the balance via upsert
        await storage.upsertInventoryBalance({
          tenantId: balance.tenantId,
          siteId: balance.siteId,
          itemId: balance.itemId,
          locationId: balance.locationId,
          qtyBase: line.countedQtyBase || 0,
        });
      }
    }

    return NextResponse.json(updatedLine);
  } catch (error) {
    return handleApiError(error);
  }
}
