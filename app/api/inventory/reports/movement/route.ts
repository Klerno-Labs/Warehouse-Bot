import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const itemId = searchParams.get("itemId");
  const eventType = searchParams.get("eventType");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Get all events for tenant
  let events = await storage.getInventoryEventsByTenant(session.user.tenantId);

  // Filter by site access
  events = events.filter((e) => session.user.siteIds.includes(e.siteId));

  // Apply filters
  if (siteId) {
    if (!session.user.siteIds.includes(siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }
    events = events.filter((e) => e.siteId === siteId);
  }

  if (itemId) {
    events = events.filter((e) => e.itemId === itemId);
  }

  if (eventType) {
    events = events.filter((e) => e.eventType === eventType);
  }

  if (startDate) {
    const start = new Date(startDate);
    events = events.filter((e) => new Date(e.createdAt) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    events = events.filter((e) => new Date(e.createdAt) <= end);
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Get items and locations for enrichment
  const items = await storage.getItemsByTenant(session.user.tenantId);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  
  const locationPromises = session.user.siteIds.map((sid) => storage.getLocationsBySite(sid));
  const locationArrays = await Promise.all(locationPromises);
  const locations = locationArrays.flat();
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Enrich events
  const enrichedEvents = events.map((e) => {
    const item = itemMap.get(e.itemId);
    const fromLocation = e.fromLocationId ? locationMap.get(e.fromLocationId) : null;
    const toLocation = e.toLocationId ? locationMap.get(e.toLocationId) : null;
    return {
      ...e,
      itemSku: item?.sku || "",
      itemName: item?.name || "",
      fromLocationLabel: fromLocation?.label || null,
      toLocationLabel: toLocation?.label || null,
    };
  });

  // Calculate summary by event type
  const summary = events.reduce(
    (acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Paginate
  const total = enrichedEvents.length;
  const paginatedEvents = enrichedEvents.slice(offset, offset + limit);

  return NextResponse.json({
    events: paginatedEvents,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    summary,
  });
}
