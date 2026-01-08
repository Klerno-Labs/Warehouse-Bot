import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import type { InventoryBalance } from "@shared/inventory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") || "aging";

    const tenantId = context.user.tenantId;
    const siteIds = context.user.siteIds;

    // Fetch data (same as stats endpoint)
    const [items, balances, allEvents] = await Promise.all([
      storage.getItemsByTenant(tenantId),
      Promise.all(siteIds.map((siteId: string) => storage.getInventoryBalancesBySite(siteId))).then(results => results.flat()),
      storage.getInventoryEventsByTenant(tenantId),
    ]);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // OPTIMIZATION: Create indexes for O(1) lookups instead of O(n) find() in loops
    const itemMap = new Map(items.map((item) => [item.id, item]));
    
    // Index balances by itemId
    const balancesByItem = new Map<string, typeof balances>();
    balances.forEach((balance) => {
      if (!balancesByItem.has(balance.itemId)) {
        balancesByItem.set(balance.itemId, []);
      }
      balancesByItem.get(balance.itemId)!.push(balance);
    });
    
    // Index events by itemId
    const eventsByItem = new Map<string, typeof allEvents>();
    allEvents.forEach((event) => {
      if (!eventsByItem.has(event.itemId)) {
        eventsByItem.set(event.itemId, []);
      }
      eventsByItem.get(event.itemId)!.push(event);
    });

    let csvContent = "";
    let filename = "";

    switch (exportType) {
      case "aging": {
        // Inventory Aging Export
        filename = `inventory-aging-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = "SKU,Item Name,Quantity,Age Days,Age Category,Last Received\n";

        items.forEach((item) => {
          const itemBalances = balancesByItem.get(item.id) || [];
          const itemBalance = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);
          if (itemBalance === 0) return;

          const itemEvents = eventsByItem.get(item.id) || [];
          const lastReceive = itemEvents
            .filter((e) => e.eventType === 'RECEIVE')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

          const ageDays = lastReceive
            ? Math.floor((Date.now() - new Date(lastReceive.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          const ageCategory =
            ageDays <= 30 ? "0-30 days" :
            ageDays <= 60 ? "31-60 days" :
            ageDays <= 90 ? "61-90 days" : "90+ days";

          const lastReceivedDate = lastReceive ? new Date(lastReceive.createdAt).toLocaleDateString() : "Unknown";

          csvContent += `"${item.sku}","${item.name.replace(/"/g, '""')}",${itemBalance},${ageDays},"${ageCategory}","${lastReceivedDate}"\n`;
        });
        break;
      }

      case "abc": {
        // ABC Analysis Export
        filename = `abc-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = "SKU,Item Name,Transaction Count,Total Value,ABC Class\n";

        const ninetyDaysEvents = allEvents.filter((e) => new Date(e.createdAt) > ninetyDaysAgo);
        const itemActivityMap: Record<string, { count: number; value: number }> = {};
        
        ninetyDaysEvents.forEach((event) => {
          if (!itemActivityMap[event.itemId]) {
            itemActivityMap[event.itemId] = { count: 0, value: 0 };
          }
          itemActivityMap[event.itemId].count++;
          const item = itemMap.get(event.itemId); // O(1) lookup
          const itemCost = item?.avgCostBase || item?.costBase || item?.lastCostBase || 10;
          itemActivityMap[event.itemId].value += Math.abs(event.qtyBase) * itemCost;
        });

        const sortedItems = Object.entries(itemActivityMap)
          .sort(([, a], [, b]) => b.value - a.value);

        const totalValue = sortedItems.reduce((sum, [, data]) => sum + data.value, 0);
        let cumulativeValue = 0;

        sortedItems.forEach(([itemId, data]) => {
          cumulativeValue += data.value;
          const percentageOfTotal = (cumulativeValue / totalValue) * 100;

          const abcClass =
            percentageOfTotal <= 80 ? "A" :
            percentageOfTotal <= 95 ? "B" : "C";

          const item = itemMap.get(itemId); // O(1) lookup
          if (item) {
            csvContent += `"${item.sku}","${item.name.replace(/"/g, '""')}",${data.count},${data.value.toFixed(2)},"${abcClass}"\n`;
          }
        });

        // Add items with no activity as Class C
        items.forEach((item) => {
          if (!itemActivityMap[item.id]) {
            csvContent += `"${item.sku}","${item.name.replace(/"/g, '""')}",0,0.00,"C"\n`;
          }
        });
        break;
      }

      case "valuation": {
        // Stock Valuation Export
        filename = `stock-valuation-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = "SKU,Item Name,Quantity,Unit Cost,Total Value,Cost Method\n";

        items.forEach((item) => {
          const itemBalances = balancesByItem.get(item.id) || [];
          const itemQty = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);

          if (itemQty > 0) {
            const itemCost = item.avgCostBase || item.costBase || item.lastCostBase || 0;
            const itemValue = itemQty * itemCost;
            const costMethod =
              item.avgCostBase ? "Average" :
              item.costBase ? "Standard" :
              item.lastCostBase ? "Last" : "None";

            csvContent += `"${item.sku}","${item.name.replace(/"/g, '""')}",${itemQty},${itemCost.toFixed(2)},${itemValue.toFixed(2)},"${costMethod}"\n`;
          }
        });
        break;
      }

      case "deadstock": {
        // Dead Stock Export
        filename = `dead-stock-${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = "SKU,Item Name,Quantity,Unit Cost,Total Value,Days Idle,Last Activity\n";

        items.forEach((item) => {
          const itemBalances = balancesByItem.get(item.id) || [];
          const itemBalance = itemBalances.reduce((sum, b) => sum + b.qtyBase, 0);

          if (itemBalance === 0) return;

          const itemEvents = eventsByItem.get(item.id) || [];
          const recentActivity = itemEvents.filter(
            (e) => new Date(e.createdAt) > ninetyDaysAgo
          );

          if (recentActivity.length === 0) {
            const lastActivity = itemEvents
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            const daysIdle = lastActivity
              ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
              : 999;

            const lastActivityDate = lastActivity ? new Date(lastActivity.createdAt).toLocaleDateString() : "Unknown";
            const itemCost = item.avgCostBase || item.costBase || item.lastCostBase || 0;
            const itemValue = itemBalance * itemCost;

            csvContent += `"${item.sku}","${item.name.replace(/"/g, '""')}",${itemBalance},${itemCost.toFixed(2)},${itemValue.toFixed(2)},${daysIdle},"${lastActivityDate}"\n`;
          }
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
