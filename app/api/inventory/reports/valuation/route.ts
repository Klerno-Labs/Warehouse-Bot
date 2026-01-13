import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth } from "@app/api/_utils/middleware";
import type { InventoryBalance } from "@shared/inventory";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const groupBy = searchParams.get("groupBy") || "item"; // item, location, category

  // Get balances for sites user has access to
  let allBalances: InventoryBalance[] = [];

  const sitesToQuery = siteId
    ? (context.user.siteIds.includes(siteId) ? [siteId] : [])
    : context.user.siteIds;

  for (const sid of sitesToQuery) {
    const siteBalances = await storage.getInventoryBalancesBySite(sid);
    allBalances = allBalances.concat(siteBalances);
  }

  // Get items and locations for enrichment
  const items = await storage.getItemsByTenant(context.user.tenantId);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const locationPromises = sitesToQuery.map((sid) => storage.getLocationsBySite(sid));
  const locationArrays = await Promise.all(locationPromises);
  const locations = locationArrays.flat();
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Build report data
  const enrichedBalances = allBalances.map((b) => {
    const item = itemMap.get(b.itemId);
    const location = locationMap.get(b.locationId);
    return {
      itemId: b.itemId,
      locationId: b.locationId,
      siteId: b.siteId,
      qtyBase: b.qtyBase,
      itemSku: item?.sku || "",
      itemName: item?.name || "",
      itemCategory: item?.category || "",
      locationLabel: location?.label || "",
      locationType: location?.type || "",
    };
  }).filter((b) => b.qtyBase > 0);

  // Group and aggregate
  let report: Array<{
    groupKey: string;
    groupLabel: string;
    totalQty: number;
    lineCount: number;
    details?: typeof enrichedBalances;
  }> = [];

  if (groupBy === "item") {
    const grouped = new Map<string, typeof enrichedBalances>();
    for (const b of enrichedBalances) {
      const key = b.itemId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    }

    report = Array.from(grouped.entries()).map(([key, balances]) => ({
      groupKey: key,
      groupLabel: `${balances[0].itemSku} - ${balances[0].itemName}`,
      totalQty: balances.reduce((sum, b) => sum + b.qtyBase, 0),
      lineCount: balances.length,
      details: balances,
    }));
  } else if (groupBy === "location") {
    const grouped = new Map<string, typeof enrichedBalances>();
    for (const b of enrichedBalances) {
      const key = b.locationId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    }

    report = Array.from(grouped.entries()).map(([key, balances]) => ({
      groupKey: key,
      groupLabel: balances[0].locationLabel,
      totalQty: balances.reduce((sum, b) => sum + b.qtyBase, 0),
      lineCount: balances.length,
      details: balances,
    }));
  } else if (groupBy === "category") {
    const grouped = new Map<string, typeof enrichedBalances>();
    for (const b of enrichedBalances) {
      const key = b.itemCategory || "Uncategorized";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    }

    report = Array.from(grouped.entries()).map(([key, balances]) => ({
      groupKey: key,
      groupLabel: key,
      totalQty: balances.reduce((sum, b) => sum + b.qtyBase, 0),
      lineCount: balances.length,
      details: balances,
    }));
  }

  // Sort by total quantity descending
  report.sort((a, b) => b.totalQty - a.totalQty);

  // Calculate totals
  const totals = {
    totalQty: report.reduce((sum, r) => sum + r.totalQty, 0),
    groupCount: report.length,
    lineCount: enrichedBalances.length,
  };

  return NextResponse.json({ report, totals });
}
