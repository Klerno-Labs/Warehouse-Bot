import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  try {
    // Fetch data in parallel for performance
    const [
      productionOrders,
      sales,
      inventory,
      expenses,
      departments,
      qualityRecords,
    ] = await Promise.all([
      storage.getProductionOrdersByTenant(tenantId),
      storage.getSalesByTenant(tenantId),
      storage.getInventoryByTenant(tenantId),
      storage.getExpensesByTenant(tenantId),
      storage.getDepartmentsByTenant(tenantId),
      storage.getQualityRecordsByTenant(tenantId),
    ]);

    // Calculate date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Financial Metrics - TODO: Implement when sales/expense schema is finalized
    const currentMonthSales = sales.filter(s => new Date(s.createdAt) >= startOfMonth);
    const lastMonthSales = sales.filter(
      s => new Date(s.createdAt) >= startOfLastMonth && new Date(s.createdAt) <= endOfLastMonth
    );

    // Placeholder revenue calculations
    const totalRevenue = currentMonthSales.length * 1000;
    const lastMonthRevenue = lastMonthSales.length * 1000;
    const revenueTrend = lastMonthRevenue > 0
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Placeholder expense calculations
    const cogs = totalRevenue * 0.4; // 40% placeholder
    const operatingCosts = totalRevenue * 0.2; // 20% placeholder

    const grossMargin = totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue) * 100 : 0;
    const netProfit = totalRevenue - cogs - operatingCosts;
    const lastMonthProfit = lastMonthRevenue * 0.4; // Placeholder
    const profitTrend = lastMonthProfit > 0
      ? ((netProfit - lastMonthProfit) / lastMonthProfit) * 100
      : 0;

    // Operations Metrics
    const completedOrders = productionOrders.filter(o => o.status === "COMPLETED");
    const todayCompletedOrders = completedOrders.filter(
      o => o.actualEnd && new Date(o.actualEnd) >= startOfToday
    );

    // Calculate OEE (Overall Equipment Effectiveness) - TODO: Implement downtime tracking
    const availability = 85; // Placeholder
    const performance = 85; // Simplified - would need cycle time data
    // TODO: Determine passed/failed from quality records status
    const quality = qualityRecords.length > 0
      ? (qualityRecords.filter(r => r.status === "PASSED").length / qualityRecords.length) * 100
      : 100;
    const oee = (availability * performance * quality) / 10000;
    const oeeTrend = 2.3; // Would need historical data

    const throughput = todayCompletedOrders.reduce((sum, o) => sum + o.qtyCompleted, 0);
    const throughputTrend = 5.2; // Would need historical data

    const onTimeOrders = completedOrders.filter(
      o => o.actualEnd && o.scheduledEnd && new Date(o.actualEnd) <= new Date(o.scheduledEnd)
    );
    const onTimeDelivery = completedOrders.length > 0
      ? (onTimeOrders.length / completedOrders.length) * 100
      : 100;

    const qualityRate = quality;

    // TODO: Calculate actual inventory value when cost tracking is implemented
    const totalInventoryValue = inventory.length * 100; // Placeholder
    const inventoryTurnover = totalInventoryValue > 0 ? (cogs / totalInventoryValue) * 12 : 0;

    // Workforce Metrics
    const allUsers = await storage.getUsersByTenant(tenantId);
    const activeUsers = allUsers.filter(u => u.isActive);
    const totalHeadcount = activeUsers.length;
    // TODO: Track user activity/last active timestamp
    const activeToday = Math.floor(totalHeadcount * 0.75); // Placeholder: 75% utilization
    const utilizationRate = totalHeadcount > 0 ? (activeToday / totalHeadcount) * 100 : 0;

    // TODO: Track labor costs in expense system
    const totalLaborCost = 0; // Placeholder
    const revenuePerEmployee = totalHeadcount > 0 ? totalRevenue / totalHeadcount : 0;

    // Inventory Metrics - TODO: Implement reorder points and movement tracking
    // Placeholder - would need to sum balances per item
    const lowStockItems: any[] = [];
    const stockoutItems: any[] = [];

    const fastMovingItems: any[] = []; // Placeholder
    const slowMovingItems: any[] = []; // Placeholder

    const avgDaysInStock = 30; // Placeholder

    return NextResponse.json({
      financials: {
        totalRevenue,
        revenueTrend,
        cogs,
        grossMargin,
        operatingCosts,
        netProfit,
        profitTrend,
      },
      operations: {
        oee,
        oeeTrend,
        throughput,
        throughputTrend,
        onTimeDelivery,
        qualityRate,
        inventoryTurnover,
      },
      workforce: {
        totalHeadcount,
        activeToday,
        utilizationRate,
        totalLaborCost,
        revenuePerEmployee,
      },
      inventory: {
        totalValue: totalInventoryValue,
        lowStockCount: lowStockItems.length,
        stockoutCount: stockoutItems.length,
        avgDaysInStock,
        turnoverRate: inventoryTurnover,
      },
      alerts: [
        ...(stockoutItems.length > 0 ? [{
          type: "critical" as const,
          message: `${stockoutItems.length} items are out of stock`,
        }] : []),
        ...(lowStockItems.length > 5 ? [{
          type: "warning" as const,
          message: `${lowStockItems.length} items are below reorder point`,
        }] : []),
        ...(oee < 70 ? [{
          type: "warning" as const,
          message: `OEE is below target at ${oee.toFixed(1)}%`,
        }] : []),
      ],
    });
  } catch (error) {
    console.error("Executive metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executive metrics" },
      { status: 500 }
    );
  }
}
