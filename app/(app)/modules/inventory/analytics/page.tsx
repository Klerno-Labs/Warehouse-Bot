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
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  BoxSelect,
  Archive,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899"];
const ABC_COLORS = { A: "#22c55e", B: "#f59e0b", C: "#ef4444" };

interface SummaryData {
  items: Array<{
    sku: string;
    name: string;
    category: string;
    qtyOnHand: number;
    unitCost: number;
    totalValue: number;
    belowReorder: boolean;
  }>;
  totals: {
    totalItems: number;
    totalSKUs: number;
    totalValue: number;
    itemsBelowReorder: number;
    itemsOutOfStock: number;
  };
}

interface LowStockData {
  items: Array<{
    sku: string;
    name: string;
    qtyOnHand: number;
    reorderPoint: number;
    shortage: number;
    suggestedOrder: number;
    estimatedCost: number;
  }>;
  summary: {
    totalLowStock: number;
    totalShortage: number;
    estimatedReplenishmentCost: number;
  };
}

interface DeadStockData {
  items: Array<{
    sku: string;
    name: string;
    qtyOnHand: number;
    totalValue: number;
    daysSinceActivity: number;
    recommendation: string;
  }>;
  summary: {
    totalDeadStockItems: number;
    totalDeadStockValue: number;
    avgDaysSinceActivity: number;
  };
}

interface ABCData {
  items: Array<{
    sku: string;
    name: string;
    classification: "A" | "B" | "C";
    transactionCount: number;
    totalValue: number;
    percentOfTotal: number;
    qtyOnHand: number;
  }>;
  summary: {
    classA: { count: number; valuePercent: number };
    classB: { count: number; valuePercent: number };
    classC: { count: number; valuePercent: number };
    totalItems: number;
    analysisperiod: string;
  };
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  description?: string;
  variant?: "default" | "warning" | "danger";
}) {
  return (
    <Card className={cn(
      variant === "warning" && "border-yellow-200 bg-yellow-50/50",
      variant === "danger" && "border-red-200 bg-red-50/50"
    )}>
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
          <div className={cn(
            "p-2 rounded-lg",
            variant === "warning" ? "bg-yellow-100" : variant === "danger" ? "bg-red-100" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              variant === "warning" ? "text-yellow-600" : variant === "danger" ? "text-red-600" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({ item, showValue = true }: { item: SummaryData["items"][0]; showValue?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{item.sku}</p>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">{item.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">{item.qtyOnHand.toLocaleString()} units</p>
        {showValue && (
          <p className="text-sm text-muted-foreground">
            ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function InventoryAnalyticsPage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=inventory-summary");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery<LowStockData>({
    queryKey: ["low-stock-report"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=low-stock");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: deadStockData, isLoading: deadStockLoading } = useQuery<DeadStockData>({
    queryKey: ["dead-stock-report"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=dead-stock");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: abcData, isLoading: abcLoading } = useQuery<ABCData>({
    queryKey: ["abc-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=abc-analysis");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const isLoading = summaryLoading || lowStockLoading || deadStockLoading || abcLoading;

  const handleExportCSV = async (type: string) => {
    const res = await fetch(`/api/reports?type=${type}&format=csv`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
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

  const totals = summaryData?.totals;
  const items = summaryData?.items || [];
  const lowStock = lowStockData?.items || [];
  const deadStock = deadStockData?.items || [];
  const abcItems = abcData?.items || [];

  // Prepare chart data
  const categoryData = items.reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = { name: cat, value: 0, count: 0 };
    acc[cat].value += item.totalValue;
    acc[cat].count++;
    return acc;
  }, {} as Record<string, { name: string; value: number; count: number }>);

  const categoryChartData = Object.values(categoryData)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const abcChartData = [
    { name: "A Items", value: abcData?.summary.classA.count || 0, fill: ABC_COLORS.A },
    { name: "B Items", value: abcData?.summary.classB.count || 0, fill: ABC_COLORS.B },
    { name: "C Items", value: abcData?.summary.classC.count || 0, fill: ABC_COLORS.C },
  ];

  // Top items by value
  const topByValue = [...items].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Inventory Analytics</h1>
            <p className="text-muted-foreground">
              Real-time inventory insights and analysis
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => handleExportCSV("inventory-summary")}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory Value"
          value={`$${(totals?.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          description="Current stock valuation"
        />
        <MetricCard
          title="Total SKUs"
          value={totals?.totalSKUs || 0}
          icon={BoxSelect}
          description="Active items"
        />
        <MetricCard
          title="Low Stock Items"
          value={totals?.itemsBelowReorder || 0}
          icon={AlertTriangle}
          variant={totals?.itemsBelowReorder && totals.itemsBelowReorder > 0 ? "warning" : "default"}
          description="Below reorder point"
        />
        <MetricCard
          title="Out of Stock"
          value={totals?.itemsOutOfStock || 0}
          icon={Archive}
          variant={totals?.itemsOutOfStock && totals.itemsOutOfStock > 0 ? "danger" : "default"}
          description="Zero quantity"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="abc">ABC Analysis</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
          <TabsTrigger value="deadstock">Dead Stock</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Value by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Value by Category</CardTitle>
                <CardDescription>Inventory value distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Items by Value */}
            <Card>
              <CardHeader>
                <CardTitle>Top Items by Value</CardTitle>
                <CardDescription>Highest value inventory items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByValue.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="sku" width={80} />
                      <Tooltip
                        formatter={(value: number) =>
                          `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                      />
                      <Bar dataKey="totalValue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABC Analysis Tab */}
        <TabsContent value="abc" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-green-500" />
                  <span className="font-semibold">A Items</span>
                </div>
                <p className="text-2xl font-bold">{abcData?.summary.classA.count || 0} items</p>
                <p className="text-sm text-muted-foreground">
                  ~80% of transaction value • High velocity
                </p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-yellow-500" />
                  <span className="font-semibold">B Items</span>
                </div>
                <p className="text-2xl font-bold">{abcData?.summary.classB.count || 0} items</p>
                <p className="text-sm text-muted-foreground">
                  ~15% of transaction value • Medium velocity
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-red-500" />
                  <span className="font-semibold">C Items</span>
                </div>
                <p className="text-2xl font-bold">{abcData?.summary.classC.count || 0} items</p>
                <p className="text-sm text-muted-foreground">
                  ~5% of transaction value • Low velocity
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ABC Distribution</CardTitle>
              <CardDescription>Items classified by transaction value (last 90 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={abcChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {abcChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="lowstock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Low Stock Items"
              value={lowStockData?.summary.totalLowStock || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <MetricCard
              title="Total Shortage"
              value={`${lowStockData?.summary.totalShortage || 0} units`}
              icon={Package}
            />
            <MetricCard
              title="Replenishment Cost"
              value={`$${(lowStockData?.summary.estimatedReplenishmentCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Items Below Reorder Point</CardTitle>
                <CardDescription>Consider placing purchase orders for these items</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV("low-stock")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStock.slice(0, 15).map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="font-medium">{item.sku}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-600">
                        {item.qtyOnHand} / {item.reorderPoint}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Suggest order: {item.suggestedOrder}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStock.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No items below reorder point
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead Stock Tab */}
        <TabsContent value="deadstock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Dead Stock Items"
              value={deadStockData?.summary.totalDeadStockItems || 0}
              icon={Archive}
              variant="danger"
            />
            <MetricCard
              title="Dead Stock Value"
              value={`$${(deadStockData?.summary.totalDeadStockValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              description="Potential write-off"
            />
            <MetricCard
              title="Avg Days Since Activity"
              value={`${deadStockData?.summary.avgDaysSinceActivity || 0} days`}
              icon={Eye}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Items with No Movement (90+ days)</CardTitle>
                <CardDescription>Consider disposition or promotion for these items</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV("dead-stock")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deadStock.slice(0, 15).map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Archive className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="font-medium">{item.sku}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">
                        ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.daysSinceActivity} days
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.recommendation}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {deadStock.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No dead stock items found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
