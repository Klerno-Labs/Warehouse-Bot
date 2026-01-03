import { Package, Briefcase, AlertTriangle, CheckCircle, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type DashboardStats = {
  overview: {
    totalItems: number;
    totalSkus: number;
    totalStock: number;
    healthScore: number;
    turnoverRate: number;
    totalStockValue: number;
  };
  alerts: {
    lowStock: number;
    outOfStock: number;
    deadStock: number;
    deadStockValue: number;
    lowStockItems: Array<{
      id: string;
      sku: string;
      name: string;
      currentStock: number;
      reorderPoint: number | null;
    }>;
    outOfStockItems: Array<{
      id: string;
      sku: string;
      name: string;
    }>;
    deadStockItems: Array<{
      id: string;
      sku: string;
      name: string;
      currentStock: number;
      daysIdle: number;
    }>;
  };
  activity: {
    recentTransactions: number;
    topMovingItems: Array<{
      itemId: string;
      sku: string;
      name: string;
      transactionCount: number;
    }>;
    recentActivity: Array<{
      id: string;
      timestamp: Date;
      eventType: string;
      sku: string;
      itemName: string;
      quantity: number;
      uom: string;
    }>;
  };
  production: {
    active: number;
    planned: number;
    completed: number;
    total: number;
  };
  analytics: {
    inventoryAging: {
      current: number;
      aging30: number;
      aging60: number;
      aging90Plus: number;
    };
    abcAnalysis: {
      A: number;
      B: number;
      C: number;
    };
    topValueItems: Array<{
      itemId: string;
      sku: string;
      name: string;
      qty: number;
      value: number;
    }>;
  };
  transactionsByDay: Array<{
    label: string;
    receives: number;
    moves: number;
    adjustments: number;
    total: number;
  }>;
  timestamp: string;
};

export default function DashboardPage() {
  const { user, currentSite } = useAuth();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = data
    ? [
        {
          title: "Total Stock Value",
          value: `$${data.overview.totalStockValue.toLocaleString()}`,
          change: `${data.overview.totalItems} items tracked`,
          changeType: "neutral" as const,
          icon: Package,
        },
        {
          title: "Inventory Health",
          value: `${data.overview.healthScore}%`,
          change: `${data.overview.totalStock} units on hand`,
          changeType: data.overview.healthScore >= 90 ? ("positive" as const) : data.overview.healthScore >= 70 ? ("neutral" as const) : ("warning" as const),
          icon: TrendingUp,
        },
        {
          title: "Alerts",
          value: String(data.alerts.lowStock + data.alerts.outOfStock),
          change: `${data.alerts.deadStock} dead stock items`,
          changeType: (data.alerts.lowStock + data.alerts.outOfStock) > 0 ? ("warning" as const) : ("positive" as const),
          icon: AlertTriangle,
        },
        {
          title: "Turnover Rate",
          value: data.overview.turnoverRate.toFixed(2),
          change: `${data.activity.recentTransactions} transactions (24h)`,
          changeType: "positive" as const,
          icon: BarChart3,
        },
      ]
    : [];

  const recentActivity = data?.activity.recentActivity.map((event) => ({
    id: event.id,
    action: `${event.eventType} - ${event.itemName}`,
    user: `${event.quantity} ${event.uom}`,
    time: new Date(event.timestamp).toLocaleString(),
    type: event.eventType === 'RECEIVE' ? 'success' : event.eventType === 'ADJUST' ? 'warning' : 'info',
  })) || [];

  const alerts = data?.alerts.lowStockItems.slice(0, 5).map((item) => ({
    title: `Low Stock: ${item.name}`,
    description: `SKU ${item.sku} - ${item.currentStock} units remaining (reorder at ${item.reorderPoint})`,
    severity: 'warning' as const,
  })) || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName}. Here's what's happening at{" "}
          <span className="font-medium">{currentSite?.name}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
                <p className={`mt-1 text-xs ${
                  stat.changeType === "positive"
                    ? "text-green-600 dark:text-green-400"
                    : stat.changeType === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QuickActionCard
                  icon={Package}
                  title="View Inventory"
                  description="Check stock levels"
                  href="/modules/inventory"
                />
                <QuickActionCard
                  icon={Briefcase}
                  title="Manage Jobs"
                  description="View active jobs"
                  href="/modules/jobs"
                />
                <QuickActionCard
                  icon={TrendingUp}
                  title="Sales ATP"
                  description="Available to promise"
                  href="/modules/sales-atp"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} · {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase 1.3: Advanced Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">ABC Analysis</CardTitle>
            <CardDescription>Inventory classification by value</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.analytics ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Class A (High Value)</span>
                  </div>
                  <span className="text-sm font-semibold">{data.analytics.abcAnalysis.A}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Class B (Medium Value)</span>
                  </div>
                  <span className="text-sm font-semibold">{data.analytics.abcAnalysis.B}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-500" />
                    <span className="text-sm">Class C (Low Value)</span>
                  </div>
                  <span className="text-sm font-semibold">{data.analytics.abcAnalysis.C}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inventory Aging</CardTitle>
            <CardDescription>Stock age distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.analytics ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">0-30 days</span>
                  <span className="text-sm font-semibold">{data.analytics.inventoryAging.current}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">31-60 days</span>
                  <span className="text-sm font-semibold">{data.analytics.inventoryAging.aging30}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">61-90 days</span>
                  <span className="text-sm font-semibold">{data.analytics.inventoryAging.aging60}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-600">90+ days</span>
                  <span className="text-sm font-semibold text-amber-600">{data.analytics.inventoryAging.aging90Plus}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Value Items</CardTitle>
            <CardDescription>Highest inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.analytics.topValueItems && data.analytics.topValueItems.length > 0 ? (
              <div className="space-y-2">
                {data.analytics.topValueItems.slice(0, 5).map((item) => (
                  <div key={item.itemId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold">${item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No valued items</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Transaction Activity
          </CardTitle>
          <CardDescription>Last 7 days inventory movements</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.transactionsByDay ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : data.transactionsByDay.every((d) => d.total === 0) ? (
            <div className="py-8 text-center text-muted-foreground">No transactions in the last 7 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.transactionsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="receives" fill="hsl(var(--chart-1))" name="Receives" />
                <Bar dataKey="moves" fill="hsl(var(--chart-2))" name="Moves" />
                <Bar dataKey="adjustments" fill="hsl(var(--chart-3))" name="Adjustments" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alerts & Notifications
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </div>
            {alerts.length > 0 && <Badge variant="secondary">{alerts.length} new</Badge>}
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No alerts at this time</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <AlertItem
                    key={idx}
                    title={alert.title}
                    description={alert.description}
                    severity={alert.severity as "warning" | "info" | "error"}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Low Stock Items
            </CardTitle>
            <CardDescription>Items at or below reorder point</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.alerts.lowStockItems || data.alerts.lowStockItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All items properly stocked</p>
            ) : (
              <div className="space-y-3">
                {data.alerts.lowStockItems.map((item) => (
                  <a
                    key={item.id}
                    href={`/modules/inventory/items`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {item.currentStock} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reorder: {item.reorderPoint}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dead Stock Alert - Phase 1.3 */}
      {data?.alerts?.deadStock && data.alerts.deadStock > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Dead Stock Alert
            </CardTitle>
            <CardDescription>
              {data.alerts.deadStock} items with no activity in 90+ days (${data.alerts.deadStockValue?.toLocaleString() || '0'} value at risk)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerts.deadStockItems && data.alerts.deadStockItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.alerts.deadStockItems.map((item) => (
                  <a
                    key={item.id}
                    href={`/modules/inventory/items`}
                    className="flex flex-col rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-amber-600">{item.currentStock} units</span>
                      <span className="text-xs text-muted-foreground">{item.daysIdle}+ days idle</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No dead stock detected</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate"
      data-testid={`link-quick-action-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}

function AlertItem({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: "warning" | "info" | "error";
}) {
  const colors = {
    warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
    error: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  };

  return (
    <div className={`rounded-r-md border-l-4 p-4 ${colors[severity]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
