import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KPI {
  name: string;
  value: number;
  unit: string;
  trend: number;
  target?: number;
  status: "good" | "warning" | "critical";
  description: string;
}

interface Analytics {
  period: {
    start: string;
    end: string;
    label: string;
  };
  kpis: {
    inventory: KPI[];
    operations: KPI[];
    quality: KPI[];
    financial: KPI[];
  };
  trends: {
    inventoryValue: Array<{ date: string; value: number }>;
    transactionVolume: Array<{ date: string; count: number }>;
    accuracy: Array<{ date: string; percentage: number }>;
  };
  insights: string[];
}

const STATUS_CONFIG = {
  good: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-500" },
  critical: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-500" },
};

function KPICard({ kpi }: { kpi: KPI }) {
  const config = STATUS_CONFIG[kpi.status];
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{kpi.name}</CardDescription>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {kpi.unit === "USD" || kpi.unit === "USD/month"
                ? `$${kpi.value.toLocaleString()}`
                : kpi.value.toFixed(kpi.unit === "%" ? 1 : 0)}
            </span>
            <span className="text-sm text-muted-foreground">{kpi.unit}</span>
          </div>

          {kpi.trend !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${kpi.trend > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {kpi.trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(kpi.trend).toFixed(1)}%</span>
            </div>
          )}

          {kpi.target && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              Target: {kpi.target}
              {kpi.unit}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{kpi.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export const KPIDashboard = memo(function KPIDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/kpis?period=${period}`);
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load analytics
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics & KPIs</h2>
          <p className="text-muted-foreground">{analytics.period.label}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-3 py-1 rounded ${period === 7 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-3 py-1 rounded ${period === 30 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-3 py-1 rounded ${period === 90 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="space-y-2">
          {analytics.insights.map((insight, index) => (
            <Alert key={index}>
              <Info className="h-4 w-4" />
              <AlertDescription>{insight}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.kpis.inventory.map((kpi, index) => (
              <KPICard key={index} kpi={kpi} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Value Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.inventoryValue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.kpis.operations.map((kpi, index) => (
              <KPICard key={index} kpi={kpi} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.transactionVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.kpis.quality.map((kpi, index) => (
              <KPICard key={index} kpi={kpi} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Accuracy Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.accuracy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} domain={[90, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                  <Line type="monotone" dataKey="percentage" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.kpis.financial.map((kpi, index) => (
              <KPICard key={index} kpi={kpi} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
});
