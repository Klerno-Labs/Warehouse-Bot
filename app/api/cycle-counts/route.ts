import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createCycleCountSchema } from "@shared/cycle-counts";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");

  let cycleCounts = await storage.getCycleCountsByTenant(session.user.tenantId);

  // Filter by site
  if (siteId) {
    if (!session.user.siteIds.includes(siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }
    cycleCounts = cycleCounts.filter((c) => c.siteId === siteId);
  } else {
    // Only show counts for sites user has access to
    cycleCounts = cycleCounts.filter((c) => session.user.siteIds.includes(c.siteId));
  }

  // Filter by status
  if (status) {
    cycleCounts = cycleCounts.filter((c) => c.status === status);
  }

  return NextResponse.json(cycleCounts);
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = createCycleCountSchema.parse(await req.json());

    if (!session.user.siteIds.includes(payload.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    // Create the cycle count
    const cycleCount = await storage.createCycleCount({
      tenantId: session.user.tenantId,
      siteId: payload.siteId,
      name: payload.name,
      type: payload.type,
      status: "SCHEDULED",
      scheduledDate: payload.scheduledDate,
      assignedToUserId: payload.assignedToUserId || null,
      notes: payload.notes || null,
      createdByUserId: session.user.id,
      startedAt: null,
      completedAt: null,
    });

    // Generate lines based on type
    const balances = await storage.getInventoryBalancesBySite(payload.siteId);
    let linesToCreate = balances;

    // Filter by location IDs if provided
    if (payload.locationIds && payload.locationIds.length > 0) {
      linesToCreate = linesToCreate.filter((b) =>
        payload.locationIds!.includes(b.locationId)
      );
    }

    // Filter by item IDs if provided
    if (payload.itemIds && payload.itemIds.length > 0) {
      linesToCreate = linesToCreate.filter((b) =>
        payload.itemIds!.includes(b.itemId)
      );
    }

    // Create lines for each balance
    for (const balance of linesToCreate) {
      await storage.createCycleCountLine({
        cycleCountId: cycleCount.id,
        tenantId: session.user.tenantId,
        siteId: payload.siteId,
        itemId: balance.itemId,
        locationId: balance.locationId,
        expectedQtyBase: balance.qtyBase,
        countedQtyBase: null,
        varianceQtyBase: null,
        status: "PENDING",
        countedByUserId: null,
        countedAt: null,
        approvedByUserId: null,
        approvedAt: null,
        notes: null,
      });
    }

    return NextResponse.json(cycleCount, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating cycle count:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
