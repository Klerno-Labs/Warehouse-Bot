import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createItemSchema } from "@shared/inventory";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const category = searchParams.get("category") || "";
  const lowStock = searchParams.get("lowStock") === "true";
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let items = await storage.getItemsByTenant(session.user.tenantId);

  // If low stock filter is enabled, fetch balances and filter items
  if (lowStock) {
    const balances = await storage.getInventoryBalancesBySite(session.user.siteIds[0] || "");
    const lowStockItemIds = new Set(
      balances
        .filter((b) => {
          const item = items.find((i) => i.id === b.itemId);
          return item?.reorderPointBase !== null && b.qtyBase <= (item?.reorderPointBase || 0);
        })
        .map((b) => b.itemId)
    );
    items = items.filter((item) => lowStockItemIds.has(item.id));
  }

  // Apply filters
  if (search) {
    items = items.filter(
      (item) =>
        item.sku.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );
  }
  if (category) {
    items = items.filter((item) => item.category === category);
  }
  
  const total = items.length;
  
  // Apply pagination if limit is specified
  if (limit > 0) {
    items = items.slice(offset, offset + limit);
  }
  
  return NextResponse.json({
    items,
    total,
    limit: limit || total,
    offset,
    hasMore: limit > 0 && offset + items.length < total,
  });
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
    const payload = createItemSchema.parse(await req.json());
    const existing = await storage.getItemBySku(session.user.tenantId, payload.sku);
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    const item = await storage.createItem({
      tenantId: session.user.tenantId,
      ...payload,
      description: payload.description || null,
      minQtyBase: payload.minQtyBase ?? null,
      maxQtyBase: payload.maxQtyBase ?? null,
      reorderPointBase: payload.reorderPointBase ?? null,
      leadTimeDays: payload.leadTimeDays ?? null,
      barcode: null,
      barcodeType: null,
      alternateBarcode: null,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
