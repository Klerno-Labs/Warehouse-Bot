import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import type { InventoryBalance } from "@shared/inventory";

export async function GET() {
  try {
    // Use new middleware for authentication
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const tenantId = context.user.tenantId;
    const siteIds = context.user.siteIds;

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
    const recentEvents = events.filter((e) => new Date(e.createdAt) > oneDayAgo);
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
      .filter((e) => new Date(e.createdAt) > sevenDaysAgo)
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((event) => {
        const item = items.find((i) => i.id === event.itemId);
        return {
          id: event.id,
          timestamp: event.createdAt,
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

    // Transactions by day (last 7 days)
    const transactionsByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayEvents = events.filter((e: any) => {
        const eventDate = new Date(e.createdAt);
        return eventDate >= date && eventDate < nextDay;
      });

      const receives = dayEvents.filter((e: any) => e.eventType === 'RECEIVE').length;
      const moves = dayEvents.filter((e: any) => e.eventType === 'MOVE').length;
      const adjustments = dayEvents.filter((e: any) => e.eventType === 'ADJUST' || e.eventType === 'COUNT').length;

      transactionsByDay.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        receives,
        moves,
        adjustments,
        total: dayEvents.length,
      });
    }

    // ============ PHASE 1.3: Advanced Analytics ============

    // Inventory Aging Analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const inventoryAging = {
      current: 0,      // 0-30 days
      aging30: 0,      // 31-60 days
      aging60: 0,      // 61-90 days
      aging90Plus: 0,  // 90+ days
    };

    items.forEach((item) => {
      const itemBalance = balances.find((b) => b.itemId === item.id);
      if (!itemBalance || itemBalance.qtyBase === 0) return;

      // Find most recent RECEIVE event for this item
      const lastReceive = allEvents
        .filter((e) => e.itemId === item.id && e.eventType === 'RECEIVE')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!lastReceive) {
        inventoryAging.aging90Plus += itemBalance.qtyBase;
        return;
      }

      const receiveDate = new Date(lastReceive.createdAt);
      if (receiveDate > thirtyDaysAgo) {
        inventoryAging.current += itemBalance.qtyBase;
      } else if (receiveDate > sixtyDaysAgo) {
        inventoryAging.aging30 += itemBalance.qtyBase;
      } else if (receiveDate > ninetyDaysAgo) {
        inventoryAging.aging60 += itemBalance.qtyBase;
      } else {
        inventoryAging.aging90Plus += itemBalance.qtyBase;
      }
    });

    // ABC Analysis (based on transaction frequency in last 90 days)
    const ninetyDaysEvents = allEvents.filter((e) => new Date(e.createdAt) > ninetyDaysAgo);
    const itemActivityMap = ninetyDaysEvents.reduce((acc, event) => {
      if (!acc[event.itemId]) {
        acc[event.itemId] = { count: 0, value: 0 };
      }
      acc[event.itemId].count++;
      // Estimate value: quantity * default $10 (no cost field in schema yet)
      const estimatedCost = 10;
      acc[event.itemId].value += Math.abs(event.qtyBase) * estimatedCost;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Sort by value and categorize
    const sortedItems = Object.entries(itemActivityMap)
      .sort(([, a], [, b]) => b.value - a.value);

    const totalValue = sortedItems.reduce((sum, [, data]) => sum + data.value, 0);
    let cumulativeValue = 0;

    const abcAnalysis = {
      A: 0, // Top 20% by value (80% of total value)
      B: 0, // Next 30% by value (15% of total value)
      C: 0, // Bottom 50% by value (5% of total value)
    };

    sortedItems.forEach(([itemId, data]) => {
      cumulativeValue += data.value;
      const percentageOfTotal = (cumulativeValue / totalValue) * 100;

      if (percentageOfTotal <= 80) {
        abcAnalysis.A++;
      } else if (percentageOfTotal <= 95) {
        abcAnalysis.B++;
      } else {
        abcAnalysis.C++;
      }
    });

    // Account for items with no activity
    const itemsWithNoActivity = totalItems - sortedItems.length;
    abcAnalysis.C += itemsWithNoActivity;

    // Stock Valuation (Weighted Average Cost)
    let totalStockValue = 0;
    const itemValuations: Array<{ itemId: string; sku: string; name: string; qty: number; value: number }> = [];

    items.forEach((item) => {
      const itemQty = balances
        .filter((b) => b.itemId === item.id)
        .reduce((sum, b) => sum + b.qtyBase, 0);

      if (itemQty > 0) {
        // TODO: Add cost field to Item schema - using $0 for now
        const estimatedCost = 0;
        const itemValue = itemQty * estimatedCost;
        totalStockValue += itemValue;

        if (itemValue > 0) {
          itemValuations.push({
            itemId: item.id,
            sku: item.sku || 'N/A',
            name: item.name,
            qty: itemQty,
            value: itemValue,
          });
        }
      }
    });

    // Top 10 most valuable items
    const topValueItems = itemValuations
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Dead Stock Identification (no movement in 90+ days)
    const deadStockItems = items.filter((item) => {
      const itemBalance = balances
        .filter((b) => b.itemId === item.id)
        .reduce((sum, b) => sum + b.qtyBase, 0);

      // Must have stock
      if (itemBalance === 0) return false;

      // Check if there's been any activity in last 90 days
      const recentActivity = allEvents.filter(
        (e) => e.itemId === item.id && new Date(e.createdAt) > ninetyDaysAgo
      );

      return recentActivity.length === 0;
    });

    const deadStockValue = deadStockItems.reduce((sum, item) => {
      const itemQty = balances
        .filter((b) => b.itemId === item.id)
        .reduce((s, b) => s + b.qtyBase, 0);
      // TODO: Add cost field to Item schema - using $0 for now
      return sum + (itemQty * 0);
    }, 0);

    return NextResponse.json({
      overview: {
        totalItems,
        totalSkus,
        totalStock,
        healthScore,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        totalStockValue: Math.round(totalStockValue * 100) / 100,
      },
      alerts: {
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        deadStock: deadStockItems.length,
        deadStockValue: Math.round(deadStockValue * 100) / 100,
        lowStockItems: lowStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          currentStock: balances
            .filter(b => b.itemId === item.id)
            .reduce((sum, b) => sum + b.qtyBase, 0),
          reorderPoint: item.reorderPointBase,
        })),
        outOfStockItems: outOfStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
        })),
        deadStockItems: deadStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku || 'N/A',
          name: item.name,
          currentStock: balances
            .filter(b => b.itemId === item.id)
            .reduce((sum, b) => sum + b.qtyBase, 0),
          daysIdle: 90,
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
      analytics: {
        inventoryAging,
        abcAnalysis,
        topValueItems,
      },
      transactionsByDay,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
