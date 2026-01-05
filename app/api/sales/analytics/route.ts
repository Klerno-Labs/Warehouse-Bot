import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";
import { subDays, startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { tenantId } = context.user;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let compareStartDate: Date;
    let compareEndDate: Date;

    switch (range) {
      case "7d":
        startDate = subDays(now, 7);
        compareStartDate = subDays(now, 14);
        compareEndDate = subDays(now, 7);
        break;
      case "90d":
        startDate = subDays(now, 90);
        compareStartDate = subDays(now, 180);
        compareEndDate = subDays(now, 90);
        break;
      case "12m":
        startDate = subDays(now, 365);
        compareStartDate = subDays(now, 730);
        compareEndDate = subDays(now, 365);
        break;
      default: // 30d
        startDate = subDays(now, 30);
        compareStartDate = subDays(now, 60);
        compareEndDate = subDays(now, 30);
    }

    // Fetch all data in parallel
    const [
      currentOrders,
      previousOrders,
      allCustomers,
      newCustomers,
      allOrders,
    ] = await Promise.all([
      // Current period orders
      prisma.salesOrder.findMany({
        where: {
          tenantId,
          orderDate: { gte: startDate },
        },
        include: {
          customer: true,
          lines: {
            include: {
              item: true,
            },
          },
          shipments: {
            orderBy: { shipDate: "asc" },
            take: 1,
          },
        },
      }),
      // Previous period orders (for comparison)
      prisma.salesOrder.findMany({
        where: {
          tenantId,
          orderDate: {
            gte: compareStartDate,
            lt: compareEndDate,
          },
        },
      }),
      // All active customers
      prisma.customer.count({
        where: {
          tenantId,
          isActive: true,
        },
      }),
      // New customers in period
      prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
      }),
      // All orders for status distribution
      prisma.salesOrder.findMany({
        where: { tenantId },
        select: { status: true },
      }),
    ]);

    // Calculate current period metrics
    const currentRevenue = currentOrders
      .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const previousRevenue = previousOrders
      .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const currentOrderCount = currentOrders.filter(o => o.status !== "CANCELLED").length;
    const previousOrderCount = previousOrders.filter(o => o.status !== "CANCELLED").length;
    const ordersChange = previousOrderCount > 0
      ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
      : 0;

    const averageOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    const previousAOV = previousOrderCount > 0 
      ? previousRevenue / previousOrderCount 
      : 0;
    const aovChange = previousAOV > 0 
      ? ((averageOrderValue - previousAOV) / previousAOV) * 100 
      : 0;

    // Order status distribution
    const ordersByStatus: Record<string, number> = {
      DRAFT: 0,
      CONFIRMED: 0,
      ALLOCATED: 0,
      PICKING: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    allOrders.forEach(o => {
      if (ordersByStatus[o.status] !== undefined) {
        ordersByStatus[o.status]++;
      }
    });

    // Revenue by month (last 4 months)
    const revenueByMonth = [];
    for (let i = 3; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthOrders = currentOrders.filter(o => {
        const orderDate = new Date(o.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd && !["DRAFT", "CANCELLED"].includes(o.status);
      });

      revenueByMonth.push({
        month: format(monthStart, "MMM"),
        revenue: monthOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: monthOrders.length,
      });
    }

    // Top customers by revenue
    const customerRevenue = new Map<string, { id: string; name: string; code: string; revenue: number; orders: number }>();
    currentOrders
      .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
      .forEach(o => {
        const existing = customerRevenue.get(o.customerId);
        if (existing) {
          existing.revenue += o.total || 0;
          existing.orders += 1;
        } else {
          customerRevenue.set(o.customerId, {
            id: o.customerId,
            name: o.customer.name,
            code: o.customer.code,
            revenue: o.total || 0,
            orders: 1,
          });
        }
      });
    
    const topCustomers = Array.from(customerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top products by revenue
    const productRevenue = new Map<string, { id: string; sku: string; name: string; quantitySold: number; revenue: number }>();
    currentOrders
      .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
      .forEach(o => {
        o.lines.forEach(line => {
          const existing = productRevenue.get(line.itemId);
          if (existing) {
            existing.revenue += line.lineTotal || 0;
            existing.quantitySold += line.qtyShipped || line.qtyOrdered;
          } else {
            productRevenue.set(line.itemId, {
              id: line.itemId,
              sku: line.item.sku,
              name: line.item.name,
              revenue: line.lineTotal || 0,
              quantitySold: line.qtyShipped || line.qtyOrdered,
            });
          }
        });
      });

    const topProducts = Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Fulfillment metrics
    const shippedOrders = currentOrders.filter(o => 
      ["SHIPPED", "DELIVERED"].includes(o.status) && o.shipments.length > 0
    );
    
    const avgFulfillmentDays = shippedOrders.length > 0
      ? shippedOrders.reduce((sum, o) => {
          const orderDate = new Date(o.orderDate);
          const firstShipment = o.shipments[0];
          const shipDate = firstShipment?.shipDate ? new Date(firstShipment.shipDate) : orderDate;
          return sum + (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / shippedOrders.length
      : 0;

    const onTimeOrders = shippedOrders.filter(o => {
      const firstShipment = o.shipments[0];
      if (!o.requestedDate || !firstShipment?.shipDate) return true;
      return new Date(firstShipment.shipDate) <= new Date(o.requestedDate);
    });
    const onTimeDelivery = shippedOrders.length > 0 
      ? (onTimeOrders.length / shippedOrders.length) * 100 
      : 100;

    const pendingOrders = currentOrders.filter(o => 
      !["SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status)
    ).length;

    const overdueOrders = currentOrders.filter(o => {
      if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status)) return false;
      if (!o.requestedDate) return false;
      return new Date(o.requestedDate) < now;
    }).length;

    // Recent activity (simplified - just recent orders)
    const recentActivity = currentOrders
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        type: "order",
        description: `${o.orderNumber} - ${o.status.toLowerCase()} (${o.customer.name})`,
        timestamp: o.updatedAt.toISOString(),
      }));

    return NextResponse.json({
      summary: {
        totalRevenue: currentRevenue,
        revenueChange,
        totalOrders: currentOrderCount,
        ordersChange,
        averageOrderValue,
        aovChange,
        totalCustomers: allCustomers,
        newCustomers,
      },
      ordersByStatus,
      revenueByMonth,
      topCustomers,
      topProducts,
      fulfillmentMetrics: {
        avgFulfillmentDays: Math.round(avgFulfillmentDays * 10) / 10,
        onTimeDelivery: Math.round(onTimeDelivery * 10) / 10,
        pendingOrders,
        overdueOrders,
      },
      recentActivity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
