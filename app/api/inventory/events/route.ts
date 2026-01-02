import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { applyInventoryEvent, convertQuantity, InventoryError } from "@server/inventory";
import { createInventoryEventSchema } from "@shared/inventory";

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
  const eventType = searchParams.get("eventType");
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  
  if (siteId && !session.user.siteIds.includes(siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }
  
  let events = await storage.getInventoryEventsByTenant(session.user.tenantId);
  
  // Apply filters
  if (siteId) {
    events = events.filter((event) => event.siteId === siteId);
  }
  if (eventType) {
    events = events.filter((event) => event.eventType === eventType);
  }
  
  // Sort by most recent first
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const total = events.length;
  
  // Apply pagination if limit is specified
  if (limit > 0) {
    events = events.slice(offset, offset + limit);
  }
  
  return NextResponse.json({
    events,
    total,
    limit: limit || total,
    offset,
    hasMore: limit > 0 && offset + events.length < total,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = createInventoryEventSchema.parse(await req.json());
    if (!session.user.siteIds.includes(payload.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    if (payload.eventType === "ADJUST" && !["Admin", "Supervisor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    if (
      payload.eventType === "COUNT" &&
      !["Admin", "Supervisor", "Inventory"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const item = await storage.getItemById(payload.itemId);
    if (!item || item.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const validateLocation = async (locationId?: string | null) => {
      if (!locationId) return null;
      const location = await storage.getLocationById(locationId);
      if (!location || location.tenantId !== session.user.tenantId) {
        return { error: "Location not found" };
      }
      if (location.siteId !== payload.siteId) {
        return { error: "Location site mismatch" };
      }
      return null;
    };

    const fromLocationError = await validateLocation(payload.fromLocationId);
    if (fromLocationError) {
      return NextResponse.json({ error: fromLocationError.error }, { status: 400 });
    }

    const toLocationError = await validateLocation(payload.toLocationId);
    if (toLocationError) {
      return NextResponse.json({ error: toLocationError.error }, { status: 400 });
    }

    if (payload.reasonCodeId) {
      const reasonCode = await storage.getReasonCodeById(payload.reasonCodeId);
      if (!reasonCode || reasonCode.tenantId !== session.user.tenantId) {
        return NextResponse.json({ error: "Reason code not found" }, { status: 404 });
      }
      const reasonMatch = reasonCode.type === payload.eventType;
      if (["SCRAP", "ADJUST", "HOLD"].includes(payload.eventType) && !reasonMatch) {
        return NextResponse.json({ error: "Reason code type mismatch" }, { status: 400 });
      }
    }

    const { qtyBase } = await convertQuantity(
      prisma,
      session.user.tenantId,
      payload.itemId,
      payload.qtyEntered,
      payload.uomEntered,
    );

    await applyInventoryEvent(prisma, session.sessionUser, {
      tenantId: session.user.tenantId,
      siteId: payload.siteId,
      eventType: payload.eventType,
      itemId: payload.itemId,
      qtyEntered: payload.qtyEntered,
      uomEntered: payload.uomEntered,
      qtyBase,
      fromLocationId: payload.fromLocationId || null,
      toLocationId: payload.toLocationId || null,
      workcellId: payload.workcellId || null,
      referenceId: payload.referenceId || null,
      reasonCodeId: payload.reasonCodeId || null,
      notes: payload.notes || null,
      createdByUserId: session.user.id,
      deviceId: payload.deviceId || null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
