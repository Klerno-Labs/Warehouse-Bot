import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, requireSiteAccess, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { applyInventoryEvent, convertQuantity, InventoryError } from "@server/inventory";
import { createInventoryEventSchema } from "@shared/inventory";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const eventType = searchParams.get("eventType");
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (siteId) {
    const siteCheck = requireSiteAccess(context, siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;
  }

  let events = await storage.getInventoryEventsByTenant(context.user.tenantId);

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
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const payload = await validateBody(req, createInventoryEventSchema);
    if (payload instanceof NextResponse) return payload;

    const siteCheck = requireSiteAccess(context, payload.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    if (payload.eventType === "ADJUST") {
      const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
      if (roleCheck instanceof NextResponse) return roleCheck;
    }
    if (payload.eventType === "COUNT") {
      const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
      if (roleCheck instanceof NextResponse) return roleCheck;
    }

    const item = await storage.getItemById(payload.itemId);
    const itemCheck = await requireTenantResource(context, item, "Item");
    if (itemCheck instanceof NextResponse) return itemCheck;

    const validateLocation = async (locationId?: string | null) => {
      if (!locationId) return null;
      const location = await storage.getLocationById(locationId);
      if (!location || location.tenantId !== context.user.tenantId) {
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
      if (!reasonCode || reasonCode.tenantId !== context.user.tenantId) {
        return NextResponse.json({ error: "Reason code not found" }, { status: 404 });
      }
      const reasonMatch = reasonCode.type === payload.eventType;
      if (["SCRAP", "ADJUST", "HOLD"].includes(payload.eventType) && !reasonMatch) {
        return NextResponse.json({ error: "Reason code type mismatch" }, { status: 400 });
      }
    }

    const { qtyBase } = await convertQuantity(
      prisma,
      context.user.tenantId,
      payload.itemId,
      payload.qtyEntered,
      payload.uomEntered,
    );

    await applyInventoryEvent(prisma, context.user, {
      tenantId: context.user.tenantId,
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
      createdByUserId: context.user.id,
      deviceId: payload.deviceId || null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
