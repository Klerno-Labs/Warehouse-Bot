import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createItemSchema } from "@shared/inventory";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const category = searchParams.get("category") || "";
  const lowStock = searchParams.get("lowStock") === "true";
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let items = await storage.getItemsByTenant(context.user.tenantId);

  // If low stock filter is enabled, fetch balances and filter items
  if (lowStock) {
    const balances = await storage.getInventoryBalancesBySite(context.user.siteIds[0] || "");

    // OPTIMIZATION: Create item map for O(1) lookups instead of O(n) find() in loop
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const lowStockItemIds = new Set(
      balances
        .filter((b) => {
          const item = itemMap.get(b.itemId); // O(1) instead of O(n)
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
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const payload = await validateBody(req, createItemSchema);
    if (payload instanceof NextResponse) return payload;

    const existing = await storage.getItemBySku(context.user.tenantId, payload.sku);
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }

    const item = await storage.createItem({
      tenantId: context.user.tenantId,
      ...payload,
      description: payload.description || null,
      minQtyBase: payload.minQtyBase ?? null,
      maxQtyBase: payload.maxQtyBase ?? null,
      reorderPointBase: payload.reorderPointBase ?? null,
      leadTimeDays: payload.leadTimeDays ?? null,
      barcode: null,
      barcodeType: null,
      alternateBarcode: null,
      costBase: null,
      avgCostBase: null,
      lastCostBase: null,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
