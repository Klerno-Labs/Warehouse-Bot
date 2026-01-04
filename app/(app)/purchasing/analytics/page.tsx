"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Building2,
  Package,
  Calendar,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface ReportData {
  purchaseOrders: Array<{
    poNumber: string;
    supplier: string;
    status: string;
    orderDate: string;
    total: number;
  }>;
  supplierPerformance: Array<{
    supplierCode: string;
    supplierName: string;
    poCount: number;
    totalSpend: number;
    receivedCount: number;
    fulfillmentRate: number;
  }>;
  summary: {
    totalPOs: number;
    totalSpend: number;
    avgPOValue: number;
    byStatus: Record<string, number>;
    dateRange: { start: string; end: string };
  };
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                <span
                  className={`text-xs ${
                    trend === "up"
                      ? "text-green-600"
                      : trend === "down"
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {trendValue}
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierPerformanceCard({
  supplier,
}: {
  supplier: ReportData["supplierPerformance"][0];
}) {
  const performanceColor =
    supplier.fulfillmentRate >= 90
      ? "bg-green-500"
      : supplier.fulfillmentRate >= 70
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{supplier.supplierName}</h3>
            <p className="text-sm text-muted-foreground">{supplier.supplierCode}</p>
          </div>
          <Badge variant="outline">
            {supplier.poCount} POs
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Fulfillment Rate</span>
              <span className="font-medium">{supplier.fulfillmentRate}%</span>
            </div>
            <Progress value={supplier.fulfillmentRate} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Spend</span>
            <span className="font-medium">
              ${supplier.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Received</span>
            <span className="font-medium">
              {supplier.receivedCount} / {supplier.poCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "DRAFT":
      return <Clock className="h-4 w-4 text-gray-500" />;
    case "PENDING":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "APPROVED":
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case "ORDERED":
      return <ShoppingCart className="h-4 w-4 text-indigo-500" />;
    case "SHIPPED":
      return <Truck className="h-4 w-4 text-purple-500" />;
    case "RECEIVED":
      return <Package className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

export default function PurchasingAnalyticsPage() {
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["purchasing-report", thirtyDaysAgo, today],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports?type=purchasing-summary&startDate=${thirtyDaysAgo}&endDate=${today}`
      );
      if (!res.ok) throw new Error("Failed to fetch report");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleExportCSV = async () => {
    const res = await fetch(
      `/api/reports?type=purchasing-summary&startDate=${thirtyDaysAgo}&endDate=${today}&format=csv`
    );
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchasing-report-${today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = reportData?.summary;
  const suppliers = reportData?.supplierPerformance || [];
  const orders = reportData?.purchaseOrders || [];

  // Prepare chart data
  const statusData = Object.entries(summary?.byStatus || {}).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const spendBySupplier = suppliers.slice(0, 6).map((s) => ({
    name: s.supplierName.length > 15 ? s.supplierName.slice(0, 15) + "..." : s.supplierName,
    spend: s.totalSpend,
  }));

  // Group orders by date for trend chart
  const ordersByDate = orders.reduce((acc, order) => {
    const date = format(new Date(order.orderDate), "MM/dd");
    if (!acc[date]) acc[date] = { date, orders: 0, spend: 0 };
    acc[date].orders++;
    acc[date].spend += order.total;
    return acc;
  }, {} as Record<string, { date: string; orders: number; spend: number }>);

  const trendData = Object.values(ordersByDate).slice(-14);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Purchasing Analytics</h1>
            <p className="text-muted-foreground">
              Last 30 days • {format(new Date(thirtyDaysAgo), "MMM d")} -{" "}
              {format(new Date(), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spend"
          value={`$${(summary?.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="All POs in period"
        />
        <MetricCard
          title="Purchase Orders"
          value={summary?.totalPOs || 0}
          icon={ShoppingCart}
          description="Created this period"
        />
        <MetricCard
          title="Average PO Value"
          value={`$${(summary?.avgPOValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Package}
        />
        <MetricCard
          title="Active Suppliers"
          value={suppliers.length}
          icon={Building2}
          description="With orders this period"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PO Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
                <CardDescription>Breakdown of PO statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Spend by Supplier */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Supplier</CardTitle>
                <CardDescription>Top suppliers by total spend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendBySupplier} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                      />
                      <Bar dataKey="spend" fill="#0088FE" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <SupplierPerformanceCard key={supplier.supplierCode} supplier={supplier} />
            ))}
            {suppliers.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No supplier data for this period
              </div>
            )}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchasing Trends</CardTitle>
              <CardDescription>Order volume and spend over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "spend"
                          ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : value
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#0088FE"
                      name="Orders"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spend"
                      stroke="#00C49F"
                      name="Spend ($)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
              <CardDescription>Latest orders placed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orders.slice(0, 20).map((order) => (
                  <div
                    key={order.poNumber}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={order.status} />
                      <div>
                        <p className="font-medium">{order.poNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.supplier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.orderDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No orders found for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
