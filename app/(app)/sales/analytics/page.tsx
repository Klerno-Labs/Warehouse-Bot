"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Building2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    averageOrderValue: number;
    aovChange: number;
    totalCustomers: number;
    newCustomers: number;
  };
  ordersByStatus: Record<string, number>;
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  topCustomers: Array<{ 
    id: string; 
    name: string; 
    code: string;
    revenue: number; 
    orders: number 
  }>;
  topProducts: Array<{
    id: string;
    sku: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  fulfillmentMetrics: {
    avgFulfillmentDays: number;
    onTimeDelivery: number;
    pendingOrders: number;
    overdueOrders: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

type TimeRange = "7d" | "30d" | "90d" | "12m";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  CONFIRMED: "bg-blue-500",
  ALLOCATED: "bg-indigo-500",
  PICKING: "bg-yellow-500",
  PACKED: "bg-orange-500",
  SHIPPED: "bg-green-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

export default function SalesAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["sales-analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/sales/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Mock data for display while API is built
  const mockData: AnalyticsData = {
    summary: {
      totalRevenue: 125750,
      revenueChange: 12.5,
      totalOrders: 47,
      ordersChange: 8.3,
      averageOrderValue: 2676,
      aovChange: 3.8,
      totalCustomers: 15,
      newCustomers: 3,
    },
    ordersByStatus: {
      DRAFT: 2,
      CONFIRMED: 5,
      ALLOCATED: 8,
      PICKING: 4,
      PACKED: 3,
      SHIPPED: 15,
      DELIVERED: 8,
      CANCELLED: 2,
    },
    revenueByMonth: [
      { month: "Oct", revenue: 28500, orders: 12 },
      { month: "Nov", revenue: 35200, orders: 15 },
      { month: "Dec", revenue: 42800, orders: 18 },
      { month: "Jan", revenue: 19250, orders: 8 },
    ],
    topCustomers: [
      { id: "1", name: "Acme Manufacturing", code: "CUST-001", revenue: 45000, orders: 12 },
      { id: "2", name: "Global Filters Inc", code: "CUST-002", revenue: 38500, orders: 10 },
      { id: "3", name: "TechCorp Solutions", code: "CUST-003", revenue: 22750, orders: 8 },
      { id: "4", name: "Industrial Parts Co", code: "CUST-004", revenue: 12500, orders: 5 },
      { id: "5", name: "Quick Supply Ltd", code: "CUST-005", revenue: 7000, orders: 4 },
    ],
    topProducts: [
      { id: "1", sku: "PAPER-MEDIA-24", name: "Paper Media 24\"", quantitySold: 5200, revenue: 52000 },
      { id: "2", sku: "CAPS-BLACK", name: "End Caps (Black)", quantitySold: 3800, revenue: 38000 },
      { id: "3", sku: "CORE-STOCK-12", name: "Core Material 12\"", quantitySold: 1200, revenue: 18000 },
      { id: "4", sku: "FILTER-20X20", name: "Filter 20x20", quantitySold: 850, revenue: 12750 },
      { id: "5", sku: "GASKET-LG", name: "Large Gasket", quantitySold: 450, revenue: 4950 },
    ],
    fulfillmentMetrics: {
      avgFulfillmentDays: 3.2,
      onTimeDelivery: 94.5,
      pendingOrders: 22,
      overdueOrders: 2,
    },
    recentActivity: [
      { id: "1", type: "order", description: "SO-2026-0047 shipped to Acme Manufacturing", timestamp: "2026-01-04T10:30:00" },
      { id: "2", type: "customer", description: "New customer: Industrial Parts Co", timestamp: "2026-01-04T09:15:00" },
      { id: "3", type: "order", description: "SO-2026-0046 delivered", timestamp: "2026-01-03T16:45:00" },
      { id: "4", type: "payment", description: "Payment received for SO-2026-0042", timestamp: "2026-01-03T14:20:00" },
    ],
  };

  const data = analytics || mockData;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const ChangeIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center text-sm ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
      {value >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      {formatPercent(value)}
    </div>
  );

  // Calculate total orders for status distribution
  const totalStatusOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...data.revenueByMonth.map(m => m.revenue));

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            Sales Analytics
          </h1>
          <p className="text-muted-foreground">
            Insights into your sales performance and trends
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
                <ChangeIndicator value={data.summary.revenueChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{data.summary.totalOrders}</p>
                <ChangeIndicator value={data.summary.ordersChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.averageOrderValue)}</p>
                <ChangeIndicator value={data.summary.aovChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold">{data.summary.totalCustomers}</p>
                <p className="text-sm text-green-600">+{data.summary.newCustomers} new</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and order volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.revenueByMonth.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium w-12">{month.month}</span>
                      <span className="text-muted-foreground">{month.orders} orders</span>
                      <span className="font-medium">{formatCurrency(month.revenue)}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current status of all orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(data.ordersByStatus).map(([status, count]) => {
                  const percent = totalStatusOrders > 0 ? (count / totalStatusOrders) * 100 : 0;
                  return (
                    <div key={status} className="text-center">
                      <div 
                        className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${statusColors[status]}`}
                      >
                        {count}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{status}</p>
                      <p className="text-xs font-medium">{percent.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing items by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((product, idx) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{product.sku}</p>
                            <p className="text-sm text-muted-foreground">{product.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{product.quantitySold.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Fulfillment Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Fulfillment Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Fulfillment Time</p>
                    <p className="font-bold">{data.fulfillmentMetrics.avgFulfillmentDays} days</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                    <p className="font-bold">{data.fulfillmentMetrics.onTimeDelivery}%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Shipments</p>
                    <p className="font-bold">{data.fulfillmentMetrics.pendingOrders}</p>
                  </div>
                </div>
              </div>

              {data.fulfillmentMetrics.overdueOrders > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm text-red-600">Overdue Orders</p>
                      <p className="font-bold text-red-700">{data.fulfillmentMetrics.overdueOrders}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topCustomers.map((customer, idx) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {idx + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                      </div>
                    </div>
                    <span className="font-medium">{formatCurrency(customer.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "order" ? "bg-blue-500" :
                      activity.type === "customer" ? "bg-green-500" :
                      "bg-purple-500"
                    }`} />
                    <div>
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
