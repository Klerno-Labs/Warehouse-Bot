import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import type { InventoryBalance } from "@shared/inventory";

export async function GET() {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const siteIds = session.user.siteIds;

    // Parallel data fetching for performance
    const [items, balances, allEvents, productionOrders] = await Promise.all([
      storage.getItemsByTenant(tenantId),
      Promise.all(siteIds.map((siteId: string) => storage.getInventoryBalancesBySite(siteId))).then(results => results.flat()),
      storage.getInventoryEventsByTenant(tenantId),
      storage.getProductionOrdersByTenant(tenantId),
    ]);

    // Take last 100 events for performance
    const events = allEvents.slice(0, 100);

    // Calculate total inventory
    const totalItems = items.length;
    const totalSkus = items.length;

    // Calculate stock levels (qtyBase is the only field we have)
    const totalStock = balances.reduce((sum: number, b: InventoryBalance) => sum + b.qtyBase, 0);

    // Low stock items
    const lowStockItems = items.filter((item) => {
      if (!item.reorderPointBase) return false;
      const itemBalance = balances
        .filter((b) => b.itemId === item.id)
        .reduce((sum: number, b: InventoryBalance) => sum + b.qtyBase, 0);
      return itemBalance <= item.reorderPointBase;
    });

    // Out of stock items
    const outOfStockItems = items.filter((item) => {
      const itemBalance = balances
        .filter((b) => b.itemId === item.id)
        .reduce((sum: number, b: InventoryBalance) => sum + b.qtyBase, 0);
      return itemBalance === 0;
    });

    // Calculate recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter((e) => new Date(e.timestamp) > oneDayAgo);
    const recentTransactions = recentEvents.length;

    // Production stats
    const activeProduction = productionOrders.filter(
      (po) => po.status === 'IN_PROGRESS' || po.status === 'RELEASED'
    ).length;
    const plannedProduction = productionOrders.filter(
      (po) => po.status === 'PLANNED'
    ).length;
    const completedProduction = productionOrders.filter(
      (po) => po.status === 'COMPLETED'
    ).length;

    // Top moving items (most transactions in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEventsByItem = events
      .filter((e) => new Date(e.timestamp) > sevenDaysAgo)
      .reduce((acc, event) => {
        if (!acc[event.itemId]) {
          acc[event.itemId] = 0;
        }
        acc[event.itemId]++;
        return acc;
      }, {} as Record<string, number>);

    const topMovingItems = Object.entries(recentEventsByItem)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([itemId, count]) => {
        const item = items.find((i) => i.id === itemId);
        return {
          itemId,
          sku: item?.sku || 'Unknown',
          name: item?.name || 'Unknown',
          transactionCount: count as number,
        };
      });

    // Recent activity feed (last 20 events)
    const recentActivity = events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((event) => {
        const item = items.find((i) => i.id === event.itemId);
        return {
          id: event.id,
          timestamp: event.timestamp,
          eventType: event.eventType,
          sku: item?.sku || 'Unknown',
          itemName: item?.name || 'Unknown',
          quantity: event.qtyEntered,
          uom: event.uomEntered,
        };
      });

    // Calculate inventory health score (0-100)
    const healthScore = totalItems > 0
      ? Math.round(((totalItems - outOfStockItems.length) / totalItems) * 100)
      : 100;

    // Stock turnover rate (simplified)
    const turnoverRate = totalItems > 0 ? recentTransactions / totalItems : 0;

    return NextResponse.json({
      overview: {
        totalItems,
        totalSkus,
        totalStock,
        totalReserved,
        totalAvailable,
        healthScore,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
      },
      alerts: {
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        lowStockItems: lowStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          currentStock: balances
            .filter(b => b.itemId === item.id)
            .reduce((sum, b) => sum + b.qtyAvailable, 0),
          reorderPoint: item.reorderPointBase,
        })),
        outOfStockItems: outOfStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
        })),
      },
      activity: {
        recentTransactions,
        topMovingItems,
        recentActivity,
      },
      production: {
        active: activeProduction,
        planned: plannedProduction,
        completed: completedProduction,
        total: productionOrders.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
