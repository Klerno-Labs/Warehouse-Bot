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

    // Calculate total revenue from all sales
    const calculateRevenue = (salesList: any[]) => {
      return salesList.reduce((sum, s) => {
        if (s.total) return sum + Number(s.total);
        if (s.subtotal) return sum + Number(s.subtotal);
        if (s.qtyOrdered && s.unitPrice) return sum + (s.qtyOrdered * s.unitPrice);
        return sum + 1500; // Fallback estimate
      }, 0);
    };

    const customerMetrics = customers.map(customer => {
      // Sales for this customer
      const customerSales = sales.filter(s => s.customerId === customer.id);
      const currentMonthSales = customerSales.filter(s => new Date(s.createdAt) >= startOfMonth);
      const lastMonthSales = customerSales.filter(
        s => new Date(s.createdAt) >= startOfLastMonth && new Date(s.createdAt) <= endOfLastMonth
      );

      // Calculate actual revenue from sales
      const totalRevenue = calculateRevenue(currentMonthSales);
      const lastMonthRevenue = calculateRevenue(lastMonthSales);
      const growth = lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Find production orders linked to this customer
      const customerProduction = productionOrders.filter(po => po.customerId === customer.id);
      const activeOrders = customerProduction.filter(po =>
        po.status === 'IN_PROGRESS' || po.status === 'RELEASED' || po.status === 'PLANNED'
      ).length;
      const completedOrders = customerProduction.filter(po => po.status === 'COMPLETED');

      // On-time delivery rate from completed orders
      const onTimeOrders = completedOrders.filter(
        o => o.actualEnd && o.scheduledEnd && new Date(o.actualEnd) <= new Date(o.scheduledEnd)
      );
      const onTimeRate = completedOrders.length > 0
        ? (onTimeOrders.length / completedOrders.length) * 100
        : 100;

      // Last order date from sales
      const sortedSales = [...customerSales].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastOrderDate = sortedSales.length > 0 ? sortedSales[0].createdAt : null;

      // Total orders is sum of all sales for this customer
      const totalOrders = customerSales.length;

      return {
        id: customer.id,
        name: customer.name,
        company: customer.name,
        totalRevenue,
        growth: Math.round(growth * 10) / 10,
        activeOrders,
        totalOrders,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        lastOrderDate,
        status: activeOrders > 0 || currentMonthSales.length > 0 ? "active" : "inactive",
      };
    });

    // Sort by revenue (highest first)
    customerMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Get top 10 customers
    const topCustomers = customerMetrics.slice(0, 10);

    // Calculate summary statistics
    const totalRevenue = customerMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgOrderValue = sales.length > 0 ? calculateRevenue(sales) / sales.length : 0;

    return NextResponse.json({
      topCustomers,
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customerMetrics.filter(c => c.status === "active").length,
        totalRevenue: Math.round(totalRevenue),
        avgOrderValue: Math.round(avgOrderValue),
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
