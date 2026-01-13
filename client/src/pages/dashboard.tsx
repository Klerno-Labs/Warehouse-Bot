"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Play,
  ArrowRightLeft,
  RefreshCw,
  ClipboardCheck,
  ScanLine,
  Truck,
  Target,
  XCircle,
  Timer,
  CheckCircle2,
  Zap,
  Keyboard,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { SuggestedActions } from "@/components/dashboard/suggested-actions";
import { useSetupChecklist } from "@/lib/hooks/use-setup-checklist";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { CardEmptyState } from "@/components/ui/empty-state";
import { InteractiveTour } from "@/components/onboarding/interactive-tour";
import { getTourSteps } from "@/lib/tour-definitions";

// Role-specific dashboards
import PurchasingDashboard from "@/pages/dashboards/PurchasingDashboard";
import ProductionDashboard from "@/pages/dashboards/ProductionDashboard";
import InventoryDashboard from "@/pages/dashboards/InventoryDashboard";
import QualityDashboard from "@/pages/dashboards/QualityDashboard";
import SalesDashboard from "@/pages/dashboards/SalesDashboard";
import ExecutiveDashboard from "@/pages/dashboards/ExecutiveDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import ManagerDashboard from "@/pages/dashboards/ManagerDashboard";

// Metric tooltips content
const METRIC_TOOLTIPS = {
  inventoryHealth: {
    title: "Inventory Health Score",
    description: "Overall health of your inventory based on stock levels, turnover, and accuracy",
    goodRange: "90-100%: Excellent | 70-89%: Good | <70%: Needs Attention",
  },
  turnoverRate: {
    title: "Turnover Rate",
    description: "How many times inventory is sold and replaced over a period",
    formula: "Cost of Goods Sold ÷ Average Inventory",
    goodRange: "4-6 turns per year for most industries",
  },
  abcAnalysis: {
    title: "ABC Classification",
    description: "A: High-value items (top 20%), B: Medium-value (next 30%), C: Low-value (remaining 50%)",
  },
  inventoryAging: {
    title: "Stock Aging",
    description: "How long inventory has been in stock",
  },
};

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
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: "issue",
    title: "Issue / Ship",
    description: "Release inventory to production or shipping",
    icon: ArrowUpFromLine,
    href: "/modules/inventory?action=issue",
    color: "bg-blue-600 hover:bg-blue-700",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "job",
    title: "Start Production",
    description: "Begin a new production job",
    icon: Play,
    href: "/mobile/job-scanner",
    color: "bg-purple-600 hover:bg-purple-700",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
];

// Task-focused quick actions (high-frequency workflows) with keyboard shortcuts
const QUICK_TASKS = [
  { icon: ArrowRightLeft, title: "Move Stock", href: "/modules/inventory?action=move", description: "Transfer between locations", shortcut: "M" },
  { icon: RefreshCw, title: "Adjust Stock", href: "/modules/inventory?action=adjust", description: "Correct inventory counts", shortcut: "A" },
  { icon: ClipboardCheck, title: "Cycle Count", href: "/modules/cycle-counts", description: "Verify inventory accuracy", shortcut: "C" },
  { icon: ScanLine, title: "Scan Job", href: "/mobile/job-scanner", description: "Track production progress", shortcut: "J" },
  { icon: Truck, title: "Purchase Order", href: "/purchasing/purchase-orders/new", description: "Order from suppliers", shortcut: "P" },
  { icon: Target, title: "Sales ATP", href: "/modules/inventory?view=atp", description: "Check availability", shortcut: "S" },
];

// Role-based dashboard router
export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-32 w-full max-w-md" />
      </div>
    );
  }

  // Route to role-specific dashboards based on 5-tier system
  switch (user.role) {
    case "Executive":
    case "Admin":
    case "SuperAdmin":
      // Executive tier - Analytics-heavy dashboard
      return <ExecutiveDashboard />;
    case "Supervisor":
      // Supervisor tier - Team oversight dashboard
      return <ManagerDashboard />;
    case "Operator":
      // Operator tier - Single-job focus dashboard
      return <OperatorDashboard />;
    case "Inventory":
      // Inventory tier - Bin lookup and stock management
      return <InventoryDashboard />;
    case "Sales":
      // Sales tier - Quote pipeline and customer management
      return <SalesDashboard />;
    case "Purchasing":
      return <PurchasingDashboard />;
    case "QC":
      return <QualityDashboard />;
    default:
      // Fallback to executive dashboard for unknown roles
      return <ExecutiveDashboard />;
  }
}

// Rename the original dashboard component
function DefaultDashboardContent() {
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

  // Helper for relative time
  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const recentActivity =
    data?.activity.recentActivity.map((event) => ({
      id: event.id,
      action: event.eventType,
      item: event.itemName,
      quantity: `${event.quantity} ${event.uom}`,
      time: getRelativeTime(event.timestamp),
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
      {/* Compact Header - Site name + Status + Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {currentSite?.name || "All Sites"}
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "now"}
        </span>
      </div>

      {/* Alert Banner - Most Prominent */}
      {totalAlerts > 0 && (
        <Link href="/modules/inventory?filter=alerts">
          <div className="flex items-center justify-between rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-amber-600">
                  {totalAlerts} item{totalAlerts !== 1 ? "s" : ""} need{totalAlerts === 1 ? "s" : ""} attention
                </p>
                <p className="text-sm text-muted-foreground">
                  {(data?.alerts.outOfStock || 0) > 0 && `${data?.alerts.outOfStock} out of stock`}
                  {(data?.alerts.outOfStock || 0) > 0 && (data?.alerts.lowStock || 0) > 0 && " · "}
                  {(data?.alerts.lowStock || 0) > 0 && `${data?.alerts.lowStock} low stock`}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-500" />
          </div>
        </Link>
      )}

      {/* Setup Checklist for New Users */}
      {showChecklist && (
        <SetupChecklist
          steps={setupSteps}
          onDismiss={dismissChecklist}
        />
      )}

      {/* AI-Powered Suggested Actions - Most Prominent */}
      <div data-tour="suggested-actions">
        <SuggestedActions />
      </div>

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

      {/* Key Metrics - Large numbers, trend indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="metrics">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Stock Value"
              value={data?.overview.totalStockValue ? `$${data.overview.totalStockValue.toLocaleString()}` : "$0"}
              subtitle={`${data?.overview.totalItems || 0} SKUs tracked`}
              icon={Package}
              status="neutral"
              trend={{ direction: "up", value: 2.4, label: "vs last month" }}
              isEmpty={!data?.overview.totalStockValue}
              emptyMessage="No valued items yet"
              emptyAction={{ label: "Import Items", href: "/admin/dba-import" }}
            />
            <MetricCard
              title="Health Score"
              value={`${data?.overview.healthScore || 0}%`}
              subtitle={`${(data?.overview.totalStock || 0).toLocaleString()} units on hand`}
              icon={TrendingUp}
              status={
                (data?.overview.healthScore || 0) >= 90
                  ? "good"
                  : (data?.overview.healthScore || 0) >= 70
                  ? "warning"
                  : "critical"
              }
              tooltip={METRIC_TOOLTIPS.inventoryHealth}
              trend={{ direction: (data?.overview.healthScore || 0) >= 90 ? "up" : "down", value: 5, label: "vs target 95%" }}
            />
            <MetricCard
              title="Turnover Rate"
              value={(data?.overview.turnoverRate || 0).toFixed(1)}
              subtitle={`${data?.activity.recentTransactions || 0} txns today`}
              icon={BarChart3}
              status="neutral"
              tooltip={METRIC_TOOLTIPS.turnoverRate}
              trend={{ direction: "neutral", value: 0, label: "Industry avg: 4-6" }}
              isEmpty={!data?.activity.recentTransactions}
              emptyMessage="No transactions in 24h"
              emptyAction={{ label: "Receive Stock", href: "/purchasing/receipts/new" }}
            />
            <MetricCard
              title="Items at Risk"
              value={String(totalAlerts)}
              subtitle={
                totalAlerts > 0
                  ? `${data?.alerts.outOfStock || 0} out, ${data?.alerts.lowStock || 0} low`
                  : "All items healthy"
              }
              icon={AlertTriangle}
              status={totalAlerts === 0 ? "good" : totalAlerts <= 5 ? "warning" : "critical"}
              href="/modules/inventory?filter=alerts"
            />
          </>
        )}
      </div>

      {/* Quick Tasks - Elevated position, with keyboard shortcuts */}
      <div className="sticky top-20 z-40" data-tour="quick-tasks">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Quick Tasks</CardTitle>
                <Badge variant="secondary" className="text-xs gap-1 hidden sm:flex">
                  <Keyboard className="h-3 w-3" />
                  Press key to launch
                </Badge>
              </div>
              <Link href="/manufacturing/analytics" className="text-xs text-muted-foreground hover:text-primary">
                View Analytics →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {QUICK_TASKS.map((task) => (
                <Link
                  key={task.title}
                  href={task.href}
                  className="group flex flex-col items-center gap-2 rounded-lg border p-3 transition-all hover:bg-accent hover:border-primary/30 hover:shadow-sm relative"
                  title={`Press ${task.shortcut} to open`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <task.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-center">{task.title}</span>
                  <kbd className="absolute top-1 right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-mono text-muted-foreground">
                    {task.shortcut}
                  </kbd>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
              <div className="space-y-2">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === "success"
                          ? "bg-green-100"
                          : activity.type === "warning"
                          ? "bg-amber-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {activity.type === "success" ? (
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                      ) : activity.type === "warning" ? (
                        <RefreshCw className="h-4 w-4 text-amber-600" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {activity.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm font-medium truncate mt-0.5">{activity.item}</p>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{activity.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Issues */}
        <Card data-tour="alerts">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-600">All Clear!</p>
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

      {/* Analytics Summary - Compact view with link to full analytics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Inventory Snapshot</CardTitle>
              <CardDescription>Key classification and aging metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Full Analytics
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* ABC Summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">ABC Classification</span>
                <MetricTooltip {...METRIC_TOOLTIPS.abcAnalysis} />
              </div>
              {data?.analytics ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted flex">
                    <div className="bg-green-500 h-full" style={{ width: `${(data.analytics.abcAnalysis.A / (data.overview.totalItems || 1)) * 100}%` }} />
                    <div className="bg-yellow-500 h-full" style={{ width: `${(data.analytics.abcAnalysis.B / (data.overview.totalItems || 1)) * 100}%` }} />
                    <div className="bg-gray-500 h-full" style={{ width: `${(data.analytics.abcAnalysis.C / (data.overview.totalItems || 1)) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <div className="h-2 rounded-full bg-muted" />
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>A: {data?.analytics?.abcAnalysis.A || 0}</span>
                <span>B: {data?.analytics?.abcAnalysis.B || 0}</span>
                <span>C: {data?.analytics?.abcAnalysis.C || 0}</span>
              </div>
            </div>
            
            {/* Aging Summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Stock Aging</span>
                <MetricTooltip {...METRIC_TOOLTIPS.inventoryAging} />
              </div>
              {data?.analytics ? (
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-2 rounded-full bg-green-500" style={{ width: `${data.analytics.inventoryAging.current}%` }} title="0-30 days" />
                  <div className="flex-1 h-2 rounded-full bg-yellow-500" style={{ width: `${data.analytics.inventoryAging.aging30}%` }} title="31-60 days" />
                  <div className="flex-1 h-2 rounded-full bg-orange-500" style={{ width: `${data.analytics.inventoryAging.aging60}%` }} title="61-90 days" />
                  <div className="flex-1 h-2 rounded-full bg-red-500" style={{ width: `${data.analytics.inventoryAging.aging90Plus}%` }} title="90+ days" />
                </div>
              ) : (
                <div className="h-2 rounded-full bg-muted" />
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span className="text-green-600">Fresh</span>
                <span className="text-red-600">{data?.analytics?.inventoryAging.aging90Plus || 0} aged</span>
              </div>
            </div>
            
            {/* Top Value */}
            <div>
              <span className="text-sm font-medium">Top Value Item</span>
              {data?.analytics?.topValueItems?.[0] ? (
                <div className="mt-2">
                  <p className="text-lg font-bold">${data.analytics.topValueItems[0].value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground truncate">{data.analytics.topValueItems[0].name}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">No data</p>
              )}
            </div>
          </div>
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
                    <p className="text-sm font-semibold text-amber-600">
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

      {/* Interactive Tour for new users */}
      <InteractiveTour
        steps={getTourSteps("dashboard") || []}
        tourId="dashboard-tour"
      />
    </div>
  );
}

// Helper Components

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

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
  trend,
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
  trend?: { direction: "up" | "down" | "neutral"; value: number; label: string };
}) {
  const statusColors = {
    good: "text-green-600",
    warning: "text-amber-600",
    critical: "text-red-600",
    neutral: "text-muted-foreground",
  };

  const trendIcon = trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : Minus;
  const trendColor = trend?.direction === "up" ? "text-green-500" : trend?.direction === "down" ? "text-red-500" : "text-muted-foreground";

  const content = (
    <Card className={`${href ? "cursor-pointer hover:border-primary/50" : ""} transition-all hover:shadow-sm`}>
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
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className={`flex items-center text-xs ${trendColor}`}>
                  {React.createElement(trendIcon, { className: "h-3 w-3" })}
                  {trend.value > 0 && `${trend.value}%`}
                </span>
              )}
            </div>
            <p className={`mt-1 text-xs ${statusColors[status]}`}>{subtitle}</p>
            {trend && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{trend.label}</p>
            )}
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
    critical: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-gray-50 border-gray-200",
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
    good: "text-green-600",
    ok: "text-foreground",
    warning: "text-amber-600",
    critical: "text-red-600",
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
