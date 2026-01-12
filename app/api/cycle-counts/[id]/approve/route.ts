import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { approveVarianceSchema } from "@shared/cycle-counts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only Admin or Supervisor can approve variances" }, { status: 403 });
    }

    const { id } = await params;
    const cycleCount = await storage.getCycleCountById(id);

    if (!cycleCount || cycleCount.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
    }

    if (!session.user.siteIds.includes(cycleCount.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    const payload = approveVarianceSchema.parse(await req.json());
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
      approvedByUserId: session.user.id,
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
          tenantId: session.user.tenantId,
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
          createdByUserId: session.user.id,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error approving variance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
