/**
 * Dashboard Stats API - Optimized
 *
 * PERFORMANCE IMPROVEMENTS:
 * - Pre-indexes data to avoid N+1 queries (O(n*m) → O(n+m))
 * - Uses Map for O(1) lookups instead of Array.find() O(n)
 * - Single pass for multiple calculations
 * - Reduces 10M+ comparisons to <100K for 1000 items + 10K events
 */
import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import type { InventoryBalance } from "@shared/inventory";
import type { InventoryEvent } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
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

    // =========================================================================
    // OPTIMIZATION: Create indexes for O(1) lookups
    // =========================================================================
    
    // Index items by ID for O(1) lookup
    const itemMap = new Map(items.map((item) => [item.id, item]));
    
    // Index balances by itemId for O(1) lookup
    const balancesByItem = new Map<string, typeof balances>();
    balances.forEach((balance) => {
      if (!balancesByItem.has(balance.itemId)) {
        balancesByItem.set(balance.itemId, []);
      }
      balancesByItem.get(balance.itemId)!.push(balance);
    });
    
    // Index last RECEIVE event by itemId (single pass through events)
    const lastReceiveByItem = new Map<string, InventoryEvent>();
    allEvents.forEach((event) => {
      if (event.eventType === "RECEIVE") {
        const existing = lastReceiveByItem.get(event.itemId);
        if (!existing || new Date(event.createdAt) > new Date(existing.createdAt)) {
          lastReceiveByItem.set(event.itemId, event);
        }
      }
    });

    // Take last 100 events for recent activity display
    const events = allEvents.slice(0, 100);

    // Calculate total inventory
    const totalItems = items.length;
    const totalSkus = items.length;

    // =========================================================================
    // OPTIMIZATION: Single-pass calculations using indexed data
    // =========================================================================
    
    let totalStock = 0;
    const lowStockItems: typeof items = [];
    const outOfStockItems: typeof items = [];
    
    // Single pass through items using indexed data
    items.forEach((item) => {
      const itemBalances = balancesByItem.get(item.id) || [];
      const itemBalance = itemBalances.reduce((sum: number, b: InventoryBalance) => sum + b.qtyBase, 0);
      totalStock += itemBalance;
      
      if (itemBalance === 0) {
        outOfStockItems.push(item);
      } else if (item.reorderPointBase && itemBalance <= item.reorderPointBase) {
        lowStockItems.push(item);
      }
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

    // Top moving items (most transactions in last 7 days) - Using indexed data
    const recentEventsByItem = new Map<string, number>();
    events
      .filter((e) => new Date(e.createdAt) > sevenDaysAgo)
      .forEach((event) => {
        recentEventsByItem.set(event.itemId, (recentEventsByItem.get(event.itemId) || 0) + 1);
      });

    const topMovingItems = Array.from(recentEventsByItem.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([itemId, count]) => {
        const item = itemMap.get(itemId); // O(1) lookup
        return {
          itemId,
          sku: item?.sku || 'Unknown',
          name: item?.name || 'Unknown',
          transactionCount: count,
        };
      });

    // Recent activity feed (last 20 events) - Using indexed data
    const recentActivity = events
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((event) => {
        const item = itemMap.get(event.itemId); // O(1) lookup
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

    // Inventory Aging Analysis - OPTIMIZED: Using indexed lastReceiveByItem
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const inventoryAging = {
      current: 0,      // 0-30 days
      aging30: 0,      // 31-60 days
      aging60: 0,      // 61-90 days
      aging90Plus: 0,  // 90+ days
    };

    // Single pass through items using indexed data
    items.forEach((item) => {
      const itemBalances = balancesByItem.get(item.id) || [];
      const itemBalance = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);
      if (itemBalance === 0) return;

      // O(1) lookup for last receive event
      const lastReceive = lastReceiveByItem.get(item.id);

      if (!lastReceive) {
        inventoryAging.aging90Plus += itemBalance;
        return;
      }

      const receiveDate = new Date(lastReceive.createdAt);
      if (receiveDate > thirtyDaysAgo) {
        inventoryAging.current += itemBalance;
      } else if (receiveDate > sixtyDaysAgo) {
        inventoryAging.aging30 += itemBalance;
      } else if (receiveDate > ninetyDaysAgo) {
        inventoryAging.aging60 += itemBalance;
      } else {
        inventoryAging.aging90Plus += itemBalance;
      }
    });

    // ABC Analysis (based on transaction frequency in last 90 days) - OPTIMIZED
    const ninetyDaysEvents = allEvents.filter((e) => new Date(e.createdAt) > ninetyDaysAgo);
    
    // Single pass through events to calculate activity value
    const itemActivityMap: Record<string, { count: number; value: number }> = {};
    ninetyDaysEvents.forEach((event) => {
      if (!itemActivityMap[event.itemId]) {
        itemActivityMap[event.itemId] = { count: 0, value: 0 };
      }
      itemActivityMap[event.itemId].count++;
      // O(1) lookup for item cost
      const item = itemMap.get(event.itemId);
      const itemCost = item?.avgCostBase || item?.costBase || item?.lastCostBase || 10;
      itemActivityMap[event.itemId].value += Math.abs(event.qtyBase) * itemCost;
    });

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

    // Stock Valuation (Weighted Average Cost) - OPTIMIZED with indexed data
    let totalStockValue = 0;
    const itemValuations: Array<{ itemId: string; sku: string; name: string; qty: number; value: number }> = [];

    items.forEach((item) => {
      const itemBalances = balancesByItem.get(item.id) || [];
      const itemQty = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);

      if (itemQty > 0) {
        // Use average cost, fallback to standard cost, then last cost
        const itemCost = item.avgCostBase || item.costBase || item.lastCostBase || 0;
        const itemValue = itemQty * itemCost;
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

    // Dead Stock Identification (no movement in 90+ days) - OPTIMIZED
    // Build set of items with recent activity for O(1) lookup
    const itemsWithRecentActivity = new Set(ninetyDaysEvents.map(e => e.itemId));
    
    const deadStockItems = items.filter((item) => {
      const itemBalances = balancesByItem.get(item.id) || [];
      const itemBalance = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);

      // Must have stock and no recent activity
      return itemBalance > 0 && !itemsWithRecentActivity.has(item.id);
    });

    const deadStockValue = deadStockItems.reduce((sum, item) => {
      const itemBalances = balancesByItem.get(item.id) || [];
      const itemQty = itemBalances.reduce((s, b) => s + b.qtyBase, 0);
      const itemCost = item.avgCostBase || item.costBase || item.lastCostBase || 0;
      return sum + (itemQty * itemCost);
    }, 0);

    // Performance metrics
    const responseTime = Date.now() - startTime;

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
        lowStockItems: lowStockItems.slice(0, 10).map(item => {
          const itemBalances = balancesByItem.get(item.id) || [];
          return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            currentStock: itemBalances.reduce((sum, b) => sum + b.qtyBase, 0),
            reorderPoint: item.reorderPointBase,
          };
        }),
        outOfStockItems: outOfStockItems.slice(0, 10).map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
        })),
        deadStockItems: deadStockItems.slice(0, 10).map(item => {
          const itemBalances = balancesByItem.get(item.id) || [];
          return {
            id: item.id,
            sku: item.sku || 'N/A',
            name: item.name,
            currentStock: itemBalances.reduce((sum, b) => sum + b.qtyBase, 0),
            daysIdle: 90,
          };
        }),
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
      _performance: {
        responseTimeMs: responseTime,
        itemsProcessed: totalItems,
        eventsProcessed: allEvents.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
