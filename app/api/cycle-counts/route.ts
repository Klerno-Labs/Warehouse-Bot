import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, requireSiteAccess, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createCycleCountSchema } from "@shared/cycle-counts";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");

  let cycleCounts = await storage.getCycleCountsByTenant(context.user.tenantId);

  // Filter by site
  if (siteId) {
    const siteCheck = requireSiteAccess(context, siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;
    cycleCounts = cycleCounts.filter((c) => c.siteId === siteId);
  } else {
    // Only show counts for sites user has access to
    cycleCounts = cycleCounts.filter((c) => context.user.siteIds.includes(c.siteId));
  }

  // Filter by status
  if (status) {
    cycleCounts = cycleCounts.filter((c) => c.status === status);
  }

  return NextResponse.json(cycleCounts);
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const payload = await validateBody(req, createCycleCountSchema);
    if (payload instanceof NextResponse) return payload;

    const siteCheck = requireSiteAccess(context, payload.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    // Create the cycle count
    const cycleCount = await storage.createCycleCount({
      tenantId: context.user.tenantId,
      siteId: payload.siteId,
      name: payload.name,
      type: payload.type,
      status: "SCHEDULED",
      scheduledDate: payload.scheduledDate,
      assignedToUserId: payload.assignedToUserId || null,
      notes: payload.notes || null,
      createdByUserId: context.user.id,
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

    // Create all lines in a single batch operation (optimized from N queries to 1)
    if (linesToCreate.length > 0) {
      await prisma.cycleCountLine.createMany({
        data: linesToCreate.map((balance) => ({
          cycleCountId: cycleCount.id,
          tenantId: context.user.tenantId,
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
        })),
      });
    }

    return NextResponse.json(cycleCount, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
