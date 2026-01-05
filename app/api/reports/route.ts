/**
 * Reports API - Comprehensive reporting endpoints
 * 
 * Available reports:
 * - inventory-summary: Current stock levels, valuations, aging
 * - inventory-movements: Transaction history with filtering
 * - low-stock: Items below reorder point
 * - dead-stock: Items with no movement in 90+ days
 * - abc-analysis: Items classified by value/velocity
 * - purchasing-summary: PO statistics and supplier performance
 * - production-summary: Job completion rates and cycle times
 */

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";
import type { InventoryBalance, Item } from "@prisma/client";

export const dynamic = "force-dynamic";

type ReportType = 
  | "inventory-summary"
  | "inventory-movements"
  | "low-stock"
  | "dead-stock"
  | "abc-analysis"
  | "purchasing-summary"
  | "production-summary"
  | "cycle-count-variance";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { tenantId, siteIds } = context.user;
    const url = new URL(req.url);
    
    const reportType = url.searchParams.get("type") as ReportType;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const siteId = url.searchParams.get("siteId");
    const format = url.searchParams.get("format") || "json"; // json | csv

    if (!reportType) {
      return NextResponse.json(
        { error: "Report type required", availableTypes: [
          "inventory-summary",
          "inventory-movements", 
          "low-stock",
          "dead-stock",
          "abc-analysis",
          "purchasing-summary",
          "production-summary",
          "cycle-count-variance"
        ]},
        { status: 400 }
      );
    }

    // Generate report based on type
    let reportData: unknown;

    switch (reportType) {
      case "inventory-summary":
        reportData = await generateInventorySummary(tenantId, siteIds, siteId);
        break;
      case "inventory-movements":
        reportData = await generateMovementsReport(tenantId, siteIds, startDate, endDate, siteId);
        break;
      case "low-stock":
        reportData = await generateLowStockReport(tenantId, siteIds);
        break;
      case "dead-stock":
        reportData = await generateDeadStockReport(tenantId, siteIds);
        break;
      case "abc-analysis":
        reportData = await generateABCReport(tenantId, siteIds);
        break;
      case "purchasing-summary":
        reportData = await generatePurchasingReport(tenantId, startDate, endDate);
        break;
      case "production-summary":
        reportData = await generateProductionReport(tenantId, startDate, endDate);
        break;
      case "cycle-count-variance":
        reportData = await generateCycleCountReport(tenantId, siteIds);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Return CSV if requested
    if (format === "csv") {
      const csv = convertToCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${reportType}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      report: reportType,
      generatedAt: new Date().toISOString(),
      parameters: { startDate, endDate, siteId },
      data: reportData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// REPORT GENERATORS
// ============================================================================

async function generateInventorySummary(tenantId: string, siteIds: string[], siteId?: string | null) {
  const targetSiteIds = siteId ? [siteId] : siteIds;
  
  const [items, balances] = await Promise.all([
    storage.getItemsByTenant(tenantId),
    Promise.all(targetSiteIds.map(sid => storage.getInventoryBalancesBySite(sid))).then(r => r.flat()),
  ]);

  // Index balances by item
  const balancesByItem = new Map<string, InventoryBalance[]>();
  balances.forEach((b: InventoryBalance) => {
    if (!balancesByItem.has(b.itemId)) balancesByItem.set(b.itemId, []);
    balancesByItem.get(b.itemId)!.push(b);
  });

  const summary = items.map((item: Item) => {
    const itemBalances = balancesByItem.get(item.id) || [];
    const totalQty = itemBalances.reduce((sum: number, b: InventoryBalance) => sum + b.qtyBase, 0);
    const cost = item.avgCostBase || item.costBase || 0;
    const value = totalQty * cost;

    return {
      sku: item.sku,
      name: item.name,
      category: item.category,
      baseUom: item.baseUom,
      qtyOnHand: totalQty,
      unitCost: cost,
      totalValue: Math.round(value * 100) / 100,
      reorderPoint: item.reorderPointBase,
      belowReorder: item.reorderPointBase ? totalQty <= item.reorderPointBase : false,
      locationCount: itemBalances.length,
    };
  });

  const totals = {
    totalItems: items.length,
    totalSKUs: items.length,
    totalValue: summary.reduce((sum, i) => sum + i.totalValue, 0),
    itemsBelowReorder: summary.filter(i => i.belowReorder).length,
    itemsOutOfStock: summary.filter(i => i.qtyOnHand === 0).length,
  };

  return { items: summary, totals };
}

async function generateMovementsReport(
  tenantId: string,
  siteIds: string[],
  startDate?: string | null,
  endDate?: string | null,
  siteId?: string | null
) {
  const events = await storage.getInventoryEventsByTenant(tenantId);
  const items = await storage.getItemsByTenant(tenantId);
  
  const itemMap = new Map(items.map(i => [i.id, i]));

  let filtered = events;
  
  if (startDate) {
    filtered = filtered.filter(e => new Date(e.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.createdAt) <= new Date(endDate));
  }
  if (siteId) {
    filtered = filtered.filter(e => e.siteId === siteId);
  }

  const movements = filtered.slice(0, 1000).map(e => {
    const item = itemMap.get(e.itemId);
    return {
      date: e.createdAt,
      eventType: e.eventType,
      sku: item?.sku || "Unknown",
      itemName: item?.name || "Unknown",
      quantity: e.qtyEntered,
      uom: e.uomEntered,
      reference: e.referenceId,
      notes: e.notes,
    };
  });

  const summary = {
    totalTransactions: filtered.length,
    byType: filtered.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    dateRange: {
      start: startDate || "All time",
      end: endDate || "Present",
    },
  };

  return { movements, summary };
}

async function generateLowStockReport(tenantId: string, siteIds: string[]) {
  const [items, balances] = await Promise.all([
    storage.getItemsByTenant(tenantId),
    Promise.all(siteIds.map(sid => storage.getInventoryBalancesBySite(sid))).then(r => r.flat()),
  ]);

  const balancesByItem = new Map<string, number>();
  balances.forEach(b => {
    balancesByItem.set(b.itemId, (balancesByItem.get(b.itemId) || 0) + b.qtyBase);
  });

  const lowStockItems = items
    .filter(item => {
      if (!item.reorderPointBase) return false;
      const qty = balancesByItem.get(item.id) || 0;
      return qty <= item.reorderPointBase && qty > 0;
    })
    .map(item => {
      const qty = balancesByItem.get(item.id) || 0;
      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        qtyOnHand: qty,
        reorderPoint: item.reorderPointBase,
        shortage: (item.reorderPointBase || 0) - qty,
        suggestedOrder: Math.max(0, (item.reorderPointBase || 0) * 2 - qty),
        leadTimeDays: item.leadTimeDays,
        estimatedCost: ((item.reorderPointBase || 0) * 2 - qty) * (item.lastCostBase || item.costBase || 0),
      };
    })
    .sort((a, b) => b.shortage - a.shortage);

  return {
    items: lowStockItems,
    summary: {
      totalLowStock: lowStockItems.length,
      totalShortage: lowStockItems.reduce((sum, i) => sum + i.shortage, 0),
      estimatedReplenishmentCost: lowStockItems.reduce((sum, i) => sum + i.estimatedCost, 0),
    },
  };
}

async function generateDeadStockReport(tenantId: string, siteIds: string[]) {
  const [items, balances, events] = await Promise.all([
    storage.getItemsByTenant(tenantId),
    Promise.all(siteIds.map(sid => storage.getInventoryBalancesBySite(sid))).then(r => r.flat()),
    storage.getInventoryEventsByTenant(tenantId),
  ]);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  const balancesByItem = new Map<string, number>();
  balances.forEach(b => {
    balancesByItem.set(b.itemId, (balancesByItem.get(b.itemId) || 0) + b.qtyBase);
  });

  const lastActivityByItem = new Map<string, Date>();
  events.forEach(e => {
    const existing = lastActivityByItem.get(e.itemId);
    const eventDate = new Date(e.createdAt);
    if (!existing || eventDate > existing) {
      lastActivityByItem.set(e.itemId, eventDate);
    }
  });

  const deadStockItems = items
    .filter(item => {
      const qty = balancesByItem.get(item.id) || 0;
      if (qty === 0) return false;
      
      const lastActivity = lastActivityByItem.get(item.id);
      return !lastActivity || lastActivity < ninetyDaysAgo;
    })
    .map(item => {
      const qty = balancesByItem.get(item.id) || 0;
      const lastActivity = lastActivityByItem.get(item.id);
      const cost = item.avgCostBase || item.costBase || 0;
      const daysSinceActivity = lastActivity 
        ? Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
        : 999;

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        qtyOnHand: qty,
        unitCost: cost,
        totalValue: qty * cost,
        daysSinceActivity,
        lastActivityDate: lastActivity?.toISOString() || "Never",
        recommendation: daysSinceActivity > 180 ? "Consider disposal" : "Review usage",
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  return {
    items: deadStockItems,
    summary: {
      totalDeadStockItems: deadStockItems.length,
      totalDeadStockValue: deadStockItems.reduce((sum, i) => sum + i.totalValue, 0),
      avgDaysSinceActivity: deadStockItems.length > 0 
        ? Math.round(deadStockItems.reduce((sum, i) => sum + i.daysSinceActivity, 0) / deadStockItems.length)
        : 0,
    },
  };
}

async function generateABCReport(tenantId: string, siteIds: string[]) {
  const [items, balances, events] = await Promise.all([
    storage.getItemsByTenant(tenantId),
    Promise.all(siteIds.map(sid => storage.getInventoryBalancesBySite(sid))).then(r => r.flat()),
    storage.getInventoryEventsByTenant(tenantId),
  ]);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => new Date(e.createdAt) > ninetyDaysAgo);

  const balancesByItem = new Map<string, number>();
  balances.forEach(b => {
    balancesByItem.set(b.itemId, (balancesByItem.get(b.itemId) || 0) + b.qtyBase);
  });

  const activityByItem = new Map<string, { count: number; value: number }>();
  recentEvents.forEach(e => {
    if (!activityByItem.has(e.itemId)) {
      activityByItem.set(e.itemId, { count: 0, value: 0 });
    }
    const item = items.find(i => i.id === e.itemId);
    const cost = item?.avgCostBase || item?.costBase || 10;
    const activity = activityByItem.get(e.itemId)!;
    activity.count++;
    activity.value += Math.abs(e.qtyBase) * cost;
  });

  // Sort by value and assign ABC classification
  const sortedItems = Array.from(activityByItem.entries())
    .sort(([, a], [, b]) => b.value - a.value);

  const totalValue = sortedItems.reduce((sum, [, data]) => sum + data.value, 0);
  let cumulativeValue = 0;

  const classifiedItems = sortedItems.map(([itemId, activity]) => {
    cumulativeValue += activity.value;
    const percentOfTotal = (cumulativeValue / totalValue) * 100;
    
    let classification: "A" | "B" | "C";
    if (percentOfTotal <= 80) classification = "A";
    else if (percentOfTotal <= 95) classification = "B";
    else classification = "C";

    const item = items.find(i => i.id === itemId);
    return {
      sku: item?.sku || "Unknown",
      name: item?.name || "Unknown",
      category: item?.category,
      classification,
      transactionCount: activity.count,
      totalValue: Math.round(activity.value * 100) / 100,
      percentOfTotal: Math.round((activity.value / totalValue) * 10000) / 100,
      qtyOnHand: balancesByItem.get(itemId) || 0,
    };
  });

  // Add C items with no activity
  const itemsWithActivity = new Set(sortedItems.map(([id]) => id));
  const noActivityItems = items
    .filter(i => !itemsWithActivity.has(i.id))
    .map(item => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      classification: "C" as const,
      transactionCount: 0,
      totalValue: 0,
      percentOfTotal: 0,
      qtyOnHand: balancesByItem.get(item.id) || 0,
    }));

  const allItems = [...classifiedItems, ...noActivityItems];

  return {
    items: allItems,
    summary: {
      classA: { count: allItems.filter(i => i.classification === "A").length, valuePercent: 80 },
      classB: { count: allItems.filter(i => i.classification === "B").length, valuePercent: 15 },
      classC: { count: allItems.filter(i => i.classification === "C").length, valuePercent: 5 },
      totalItems: allItems.length,
      analysisperiod: "Last 90 days",
    },
  };
}

async function generatePurchasingReport(tenantId: string, startDate?: string | null, endDate?: string | null) {
  const [purchaseOrders, suppliers] = await Promise.all([
    storage.getPurchaseOrdersByTenant(tenantId),
    storage.getSuppliersByTenant(tenantId),
  ]);

  let filtered = purchaseOrders;
  if (startDate) {
    filtered = filtered.filter(po => new Date(po.orderDate) >= new Date(startDate));
  }
  if (endDate) {
    filtered = filtered.filter(po => new Date(po.orderDate) <= new Date(endDate));
  }

  const supplierMap = new Map(suppliers.map(s => [s.id, s]));

  // Supplier performance
  const supplierStats = new Map<string, { 
    poCount: number; 
    totalSpend: number; 
    received: number;
    onTimeCount: number;
  }>();

  filtered.forEach(po => {
    if (!supplierStats.has(po.supplierId)) {
      supplierStats.set(po.supplierId, { poCount: 0, totalSpend: 0, received: 0, onTimeCount: 0 });
    }
    const stats = supplierStats.get(po.supplierId)!;
    stats.poCount++;
    stats.totalSpend += po.total;
    if (po.status === "RECEIVED") stats.received++;
  });

  const supplierPerformance = Array.from(supplierStats.entries())
    .map(([supplierId, stats]) => {
      const supplier = supplierMap.get(supplierId);
      return {
        supplierCode: supplier?.code || "Unknown",
        supplierName: supplier?.name || "Unknown",
        poCount: stats.poCount,
        totalSpend: Math.round(stats.totalSpend * 100) / 100,
        receivedCount: stats.received,
        fulfillmentRate: stats.poCount > 0 ? Math.round((stats.received / stats.poCount) * 100) : 0,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const byStatus = filtered.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    purchaseOrders: filtered.slice(0, 100).map(po => ({
      poNumber: po.poNumber,
      supplier: supplierMap.get(po.supplierId)?.name || "Unknown",
      status: po.status,
      orderDate: po.orderDate,
      total: po.total,
    })),
    supplierPerformance,
    summary: {
      totalPOs: filtered.length,
      totalSpend: filtered.reduce((sum, po) => sum + po.total, 0),
      avgPOValue: filtered.length > 0 ? filtered.reduce((sum, po) => sum + po.total, 0) / filtered.length : 0,
      byStatus,
      dateRange: { start: startDate || "All time", end: endDate || "Present" },
    },
  };
}

async function generateProductionReport(tenantId: string, startDate?: string | null, endDate?: string | null) {
  const productionOrders = await storage.getProductionOrdersByTenant(tenantId);

  let filtered = productionOrders;
  if (startDate) {
    filtered = filtered.filter(po => new Date(po.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    filtered = filtered.filter(po => new Date(po.createdAt) <= new Date(endDate));
  }

  const byStatus = filtered.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completed = filtered.filter(po => po.status === "COMPLETED");
  const avgCompletionTime = completed.length > 0 && completed[0].actualEnd
    ? completed.reduce((sum, po) => {
        if (po.actualEnd && po.actualStart) {
          return sum + (new Date(po.actualEnd).getTime() - new Date(po.actualStart).getTime());
        }
        return sum;
      }, 0) / completed.length / (1000 * 60 * 60) // Convert to hours
    : 0;

  return {
    productionOrders: filtered.slice(0, 100).map(po => ({
      orderNumber: po.orderNumber,
      status: po.status,
      qtyOrdered: po.qtyOrdered,
      qtyCompleted: po.qtyCompleted,
      startDate: po.actualStart,
      completedDate: po.actualEnd,
    })),
    summary: {
      totalOrders: filtered.length,
      byStatus,
      completionRate: filtered.length > 0 ? Math.round((completed.length / filtered.length) * 100) : 0,
      avgCompletionTimeHours: Math.round(avgCompletionTime * 10) / 10,
      dateRange: { start: startDate || "All time", end: endDate || "Present" },
    },
  };
}

async function generateCycleCountReport(tenantId: string, siteIds: string[]) {
  const cycleCounts = await storage.getCycleCountsByTenant(tenantId);

  const completed = cycleCounts.filter(cc => cc.status === "COMPLETED");
  
  // Get lines for completed counts
  const countData = await Promise.all(
    completed.slice(0, 20).map(async cc => {
      const lines = await storage.getCycleCountLinesByCycleCount(cc.id);
      return { count: cc, lines };
    })
  );

  const variances = countData.flatMap(({ count, lines }) => 
    lines
      .filter((line: { varianceQtyBase: number | null }) => line.varianceQtyBase && line.varianceQtyBase !== 0)
      .map((line: { itemId: string; expectedQtyBase: number; countedQtyBase: number | null; varianceQtyBase: number | null; status: string }) => ({
        countName: count.name,
        countDate: count.completedAt || count.scheduledDate,
        itemId: line.itemId,
        expectedQty: line.expectedQtyBase,
        countedQty: line.countedQtyBase,
        variance: line.varianceQtyBase,
        status: line.status,
      }))
  );

  return {
    variances: variances.slice(0, 100),
    summary: {
      totalCycleCounts: cycleCounts.length,
      completedCounts: completed.length,
      totalVariances: variances.length,
      avgVariance: variances.length > 0 
        ? variances.reduce((sum, v) => sum + Math.abs(v.variance || 0), 0) / variances.length
        : 0,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function convertToCSV(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  
  const obj = data as Record<string, unknown>;
  const items = obj.items || obj.movements || obj.purchaseOrders || obj.productionOrders || obj.variances;
  
  if (!Array.isArray(items) || items.length === 0) {
    return "No data";
  }

  const headers = Object.keys(items[0]);
  const rows = items.map(item => 
    headers.map(h => {
      const val = (item as Record<string, unknown>)[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && val.includes(",")) return `"${val}"`;
      return String(val);
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
