import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  try {
    const [customers, sales, productionOrders] = await Promise.all([
      storage.getCustomersByTenant(tenantId),
      storage.getSalesByTenant(tenantId),
      storage.getProductionOrdersByTenant(tenantId),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const customerMetrics = customers.map(customer => {
      // Sales for this customer
      const customerSales = sales.filter(s => s.customerId === customer.id);
      const currentMonthSales = customerSales.filter(s => new Date(s.createdAt) >= startOfMonth);
      const lastMonthSales = customerSales.filter(
        s => new Date(s.createdAt) >= startOfLastMonth && new Date(s.createdAt) <= endOfLastMonth
      );

      // TODO: Calculate actual revenue when sales order total is available
      const totalRevenue = currentMonthSales.length * 1000; // Placeholder
      const lastMonthRevenue = lastMonthSales.length * 1000; // Placeholder
      const growth = lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Orders for this customer - placeholder
      const activeOrders = 0; // TODO: Link production orders to customers
      const completedOrders: any[] = [];

      // On-time delivery rate
      const onTimeOrders = completedOrders.filter(
        o => o.completedAt && o.scheduledEnd && new Date(o.completedAt) <= new Date(o.scheduledEnd)
      );
      const onTimeRate = completedOrders.length > 0
        ? (onTimeOrders.length / completedOrders.length) * 100
        : 100;

      // Last order date - placeholder
      const lastOrderDate = null; // TODO: Track last order date

      return {
        id: customer.id,
        name: customer.name,
        company: customer.name, // Customer name is the company name
        totalRevenue,
        growth,
        activeOrders,
        totalOrders: 0, // TODO: Track total orders
        onTimeRate,
        lastOrderDate,
        status: activeOrders > 0 ? "active" : "inactive",
      };
    });

    // Sort by revenue (highest first)
    customerMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Get top 10 customers
    const topCustomers = customerMetrics.slice(0, 10);

    return NextResponse.json({
      topCustomers,
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customerMetrics.filter(c => c.status === "active").length,
        totalRevenue: customerMetrics.reduce((sum, c) => sum + c.totalRevenue, 0),
        avgOrderValue: sales.length > 0 ? 1000 : 0, // TODO: Calculate from actual sales data
      },
    });
  } catch (error) {
    console.error("Customer metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer metrics" },
      { status: 500 }
    );
  }
}
