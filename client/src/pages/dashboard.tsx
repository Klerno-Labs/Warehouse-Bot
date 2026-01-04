"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Clock,
  BarChart3,
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  ClipboardCheck,
  Play,
  Factory,
  Truck,
  Timer,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Target,
  RefreshCw,
  ScanLine,
  Plus,
  Upload,
  Settings,
  Users,
  Building2,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MetricTooltip, METRIC_TOOLTIPS } from "@/components/ui/metric-tooltip";
import { SetupChecklist, useSetupChecklist } from "@/components/onboarding/setup-checklist";
import { CardEmptyState } from "@/components/ui/empty-state";

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

const downloadCSV = (type: string) => {
  const url = `/api/dashboard/stats/export?type=${type}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Primary action buttons for different personas
const PRIMARY_ACTIONS = [
  {
    id: "receive",
    title: "Receive Inventory",
    description: "Record incoming shipments",
    icon: ArrowDownToLine,
    href: "/purchasing/receipts/new",
    color: "bg-green-600 hover:bg-green-700",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    id: "issue",
    title: "Issue / Ship",
    description: "Release inventory to production or shipping",
    icon: ArrowUpFromLine,
    href: "/modules/inventory?action=issue",
    color: "bg-blue-600 hover:bg-blue-700",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "job",
    title: "Start Production",
    description: "Begin a new production job",
    icon: Play,
    href: "/mobile/job-scanner",
    color: "bg-purple-600 hover:bg-purple-700",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
];

// Task-focused quick actions (high-frequency workflows)
const QUICK_TASKS = [
  { icon: ArrowRightLeft, title: "Move Stock", href: "/modules/inventory?action=move", description: "Transfer between locations" },
  { icon: RefreshCw, title: "Adjust Stock", href: "/modules/inventory?action=adjust", description: "Correct inventory counts" },
  { icon: ClipboardCheck, title: "Cycle Count", href: "/modules/cycle-counts", description: "Verify inventory accuracy" },
  { icon: ScanLine, title: "Scan Job", href: "/mobile/job-scanner", description: "Track production progress" },
  { icon: Truck, title: "Purchase Order", href: "/purchasing/purchase-orders/new", description: "Order from suppliers" },
  { icon: Target, title: "Sales ATP", href: "/modules/inventory?view=atp", description: "Check availability" },
];

export default function DashboardPage() {
  const { user, currentSite } = useAuth();
  const { isDismissed: isChecklistDismissed, dismiss: dismissChecklist } = useSetupChecklist();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Calculate what needs attention
  const needsAttention = data
    ? {
        lowStock: data.alerts.lowStock,
        outOfStock: data.alerts.outOfStock,
        deadStock: data.alerts.deadStock,
        overdueJobs: 0,
        pendingReceipts: 0,
      }
    : null;

  const totalAlerts = needsAttention
    ? needsAttention.lowStock + needsAttention.outOfStock + needsAttention.overdueJobs
    : 0;

  // Setup checklist steps
  const setupSteps = [
    {
      id: "facility",
      title: "Configure Facilities",
      description: "Set up your warehouse locations",
      href: "/admin/facilities",
      completed: true,
      required: true,
    },
    {
      id: "items",
      title: "Add Items",
      description: "Import or create your SKUs",
      href: "/items",
      completed: (data?.overview.totalItems || 0) > 0,
      required: true,
    },
    {
      id: "locations",
      title: "Define Locations",
      description: "Create bins, racks, and zones",
      href: "/admin/facilities",
      completed: true,
      required: true,
    },
    {
      id: "reorder",
      title: "Set Reorder Points",
      description: "Configure low stock alerts",
      href: "/modules/inventory",
      completed: (data?.alerts.lowStock || 0) >= 0,
      required: false,
    },
    {
      id: "users",
      title: "Invite Team Members",
      description: "Add operators and managers",
      href: "/admin/users",
      completed: true,
      required: false,
    },
  ];

  const isNewUser = !data?.overview.totalItems || data.overview.totalItems === 0;
  const showChecklist = !isChecklistDismissed && (isNewUser || setupSteps.filter(s => s.required && !s.completed).length > 0);

  const recentActivity =
    data?.activity.recentActivity.map((event) => ({
      id: event.id,
      action: `${event.eventType} - ${event.itemName}`,
      quantity: `${event.quantity} ${event.uom}`,
      time: new Date(event.timestamp).toLocaleString(),
      type:
        event.eventType === "RECEIVE"
          ? "success"
          : event.eventType === "ADJUST"
          ? "warning"
          : "info",
    })) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header with Context */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            {currentSite?.name && (
              <>
                <span className="font-medium">{currentSite.name}</span>
                {" · "}
              </>
            )}
            {totalAlerts > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {totalAlerts} item{totalAlerts !== 1 ? "s" : ""} need{totalAlerts === 1 ? "s" : ""} attention
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-400">All systems operational</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "now"}
          </span>
        </div>
      </div>

      {/* Setup Checklist for New Users */}
      {showChecklist && (
        <SetupChecklist
          steps={setupSteps}
          onDismiss={dismissChecklist}
        />
      )}

      {/* Primary Action Buttons - "What should I do next?" */}
      <div className="grid gap-4 md:grid-cols-3">
        {PRIMARY_ACTIONS.map((action) => (
          <Link key={action.id} href={action.href}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.iconBg}`}>
                  <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Key Metrics with Tooltips */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <MetricCard
              title="Total Stock Value"
              value={data?.overview.totalStockValue ? `$${data.overview.totalStockValue.toLocaleString()}` : "$0"}
              subtitle={`${data?.overview.totalItems || 0} items tracked`}
              icon={Package}
              status="neutral"
              isEmpty={!data?.overview.totalStockValue}
              emptyMessage="No valued items yet"
              emptyAction={{ label: "Import Items", href: "/admin/dba-import" }}
            />
            <MetricCard
              title="Inventory Health"
              value={`${data?.overview.healthScore || 0}%`}
              subtitle={`${data?.overview.totalStock || 0} units on hand`}
              icon={TrendingUp}
              status={
                (data?.overview.healthScore || 0) >= 90
                  ? "good"
                  : (data?.overview.healthScore || 0) >= 70
                  ? "warning"
                  : "critical"
              }
              tooltip={METRIC_TOOLTIPS.inventoryHealth}
            />
            <MetricCard
              title="Active Alerts"
              value={String(totalAlerts)}
              subtitle={
                totalAlerts > 0
                  ? `${data?.alerts.outOfStock || 0} out of stock`
                  : "All items stocked"
              }
              icon={AlertTriangle}
              status={totalAlerts === 0 ? "good" : totalAlerts <= 5 ? "warning" : "critical"}
              href="/modules/inventory?filter=alerts"
            />
            <MetricCard
              title="Turnover Rate"
              value={(data?.overview.turnoverRate || 0).toFixed(2)}
              subtitle={`${data?.activity.recentTransactions || 0} transactions (24h)`}
              icon={BarChart3}
              status="neutral"
              tooltip={METRIC_TOOLTIPS.turnoverRate}
              isEmpty={!data?.activity.recentTransactions}
              emptyMessage="No transactions in 24h"
              emptyAction={{ label: "Receive Stock", href: "/purchasing/receipts/new" }}
            />
          </>
        )}
      </div>

      {/* Quick Tasks Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Quick Tasks
              </CardTitle>
              <CardDescription>Common workflows at your fingertips</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_TASKS.map((task) => (
              <Link
                key={task.title}
                href={task.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-accent hover:border-primary/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <task.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Activity + Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest inventory movements</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/modules/inventory?view=events">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <CardEmptyState
                message="No transactions in the last 24 hours"
                actionLabel="Receive your first shipment"
                actionHref="/purchasing/receipts/new"
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        activity.type === "success"
                          ? "bg-green-500"
                          : activity.type === "warning"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.quantity} · {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Issues */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs Attention
                </CardTitle>
                <CardDescription>Issues requiring action</CardDescription>
              </div>
              {totalAlerts > 0 && (
                <Badge variant="destructive">{totalAlerts} issues</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">All Clear!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No issues require your attention
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.alerts.outOfStock || 0) > 0 && (
                  <AlertRow
                    icon={XCircle}
                    iconColor="text-red-500"
                    title="Out of Stock"
                    count={data?.alerts.outOfStock || 0}
                    href="/modules/inventory?filter=out-of-stock"
                    severity="critical"
                  />
                )}
                {(data?.alerts.lowStock || 0) > 0 && (
                  <AlertRow
                    icon={AlertTriangle}
                    iconColor="text-amber-500"
                    title="Low Stock Items"
                    count={data?.alerts.lowStock || 0}
                    href="/modules/inventory?filter=low-stock"
                    severity="warning"
                  />
                )}
                {(data?.alerts.deadStock || 0) > 0 && (
                  <AlertRow
                    icon={Timer}
                    iconColor="text-gray-500"
                    title="Dead Stock (90+ days)"
                    count={data?.alerts.deadStock || 0}
                    href="/modules/inventory?filter=dead-stock"
                    severity="info"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">ABC Analysis</CardTitle>
                <MetricTooltip {...METRIC_TOOLTIPS.abcAnalysis} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => downloadCSV("abc")} className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Inventory classification by value</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.analytics || (data.analytics.abcAnalysis.A === 0 && data.analytics.abcAnalysis.B === 0 && data.analytics.abcAnalysis.C === 0) ? (
              <CardEmptyState
                message="Add items with values to see classification"
                actionLabel="Add Items"
                actionHref="/items/new"
              />
            ) : (
              <div className="space-y-3">
                <ABCRow label="Class A (High Value)" count={data.analytics.abcAnalysis.A} color="green" total={data.overview.totalItems} />
                <ABCRow label="Class B (Medium Value)" count={data.analytics.abcAnalysis.B} color="yellow" total={data.overview.totalItems} />
                <ABCRow label="Class C (Low Value)" count={data.analytics.abcAnalysis.C} color="gray" total={data.overview.totalItems} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Inventory Aging</CardTitle>
                <MetricTooltip {...METRIC_TOOLTIPS.inventoryAging} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => downloadCSV("aging")} className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Stock age distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.analytics ? (
              <CardEmptyState message="No aging data available" />
            ) : (
              <div className="space-y-3">
                <AgingRow label="0-30 days" count={data.analytics.inventoryAging.current} status="good" />
                <AgingRow label="31-60 days" count={data.analytics.inventoryAging.aging30} status="ok" />
                <AgingRow label="61-90 days" count={data.analytics.inventoryAging.aging60} status="warning" />
                <AgingRow label="90+ days" count={data.analytics.inventoryAging.aging90Plus} status="critical" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Top Value Items</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => downloadCSV("valuation")} className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Highest inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.analytics.topValueItems || data.analytics.topValueItems.length === 0 ? (
              <CardEmptyState
                message="No valued items yet"
                actionLabel="Import inventory"
                actionHref="/admin/dba-import"
              />
            ) : (
              <div className="space-y-2">
                {data.analytics.topValueItems.slice(0, 5).map((item, idx) => (
                  <div key={item.itemId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Transaction Activity
          </CardTitle>
          <CardDescription>Last 7 days inventory movements</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.transactionsByDay ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : data.transactionsByDay.every((d) => d.total === 0) ? (
            <CardEmptyState
              message="No transactions in the last 7 days"
              actionLabel="Receive your first shipment"
              actionHref="/purchasing/receipts/new"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.transactionsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receives" fill="hsl(var(--chart-1))" name="Receives" radius={[4, 4, 0, 0]} />
                <Bar dataKey="moves" fill="hsl(var(--chart-2))" name="Moves" radius={[4, 4, 0, 0]} />
                <Bar dataKey="adjustments" fill="hsl(var(--chart-3))" name="Adjustments" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Detail */}
      {(data?.alerts.lowStockItems?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-amber-500" />
                  Low Stock Items
                </CardTitle>
                <CardDescription>Items at or below reorder point</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/modules/inventory?filter=low-stock">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.alerts.lowStockItems.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
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
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  tooltip,
  href,
  isEmpty,
  emptyMessage,
  emptyAction,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Package;
  status: "good" | "warning" | "critical" | "neutral";
  tooltip?: { title: string; description: string; formula?: string; goodRange?: string };
  href?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; href: string };
}) {
  const statusColors = {
    good: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  };

  const content = (
    <Card className={href ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
          {tooltip && <MetricTooltip {...tooltip} />}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="py-1">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {emptyAction && (
              <Button variant="ghost" size="sm" className="h-auto p-0 mt-1 text-primary hover:text-primary/80" asChild>
                <Link href={emptyAction.href}>{emptyAction.label} →</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className={`mt-1 text-xs ${statusColors[status]}`}>{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function AlertRow({
  icon: Icon,
  iconColor,
  title,
  count,
  href,
  severity,
}: {
  icon: typeof AlertTriangle;
  iconColor: string;
  title: string;
  count: number;
  href: string;
  severity: "critical" | "warning" | "info";
}) {
  const bgColors = {
    critical: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
    info: "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800",
  };

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:opacity-80 ${bgColors[severity]}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={severity === "critical" ? "destructive" : "secondary"}>
          {count}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function ABCRow({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: "green" | "yellow" | "gray";
  total: number;
}) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    gray: "bg-gray-500",
  };

  const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${colors[color]}`} />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{percentage}%</span>
        <span className="text-sm font-semibold tabular-nums w-8 text-right">{count}</span>
      </div>
    </div>
  );
}

function AgingRow({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: "good" | "ok" | "warning" | "critical";
}) {
  const statusColors = {
    good: "text-green-600 dark:text-green-400",
    ok: "text-foreground",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${status === "critical" ? statusColors.critical : ""}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${statusColors[status]}`}>
        {count}
      </span>
    </div>
  );
}
