import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { recordCountSchema } from "@shared/cycle-counts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory", "Operator"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const cycleCount = await storage.getCycleCountById(id);

    if (!cycleCount || cycleCount.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
    }

    if (!session.user.siteIds.includes(cycleCount.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    if (cycleCount.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Cycle count must be in progress to record counts" },
        { status: 400 }
      );
    }

    const payload = recordCountSchema.parse(await req.json());
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
      countedByUserId: session.user.id,
      countedAt: new Date(),
      notes: payload.notes || line.notes,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error recording count:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
