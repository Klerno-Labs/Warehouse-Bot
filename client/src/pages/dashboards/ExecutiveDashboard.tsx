"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ExecutiveMetrics {
  financials: {
    totalRevenue: number;
    revenueTrend: number;
    cogs: number;
    grossMargin: number;
    operatingCosts: number;
    netProfit: number;
    profitTrend: number;
  };
  operations: {
    oee: number; // Overall Equipment Effectiveness
    oeeTrend: number;
    throughput: number;
    throughputTrend: number;
    onTimeDelivery: number;
    qualityRate: number;
    inventoryTurnover: number;
  };
  workforce: {
    totalEmployees: number;
    activeToday: number;
    productivity: number;
    productivityTrend: number;
    avgCycleTime: number;
  };
  inventory: {
    totalValue: number;
    deadStockValue: number;
    daysOfSupply: number;
    stockoutRisk: number;
  };
  production: {
    activeJobs: number;
    completedToday: number;
    overdueJobs: number;
    bottleneckDept: string;
  };
}

interface DepartmentPerformance {
  department: string;
  revenue: number;
  efficiency: number;
  activeJobs: number;
  throughput: number;
  trend: number;
}

interface TopCustomer {
  name: string;
  revenue: number;
  orders: number;
  trend: number;
}

export default function ExecutiveDashboard() {
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery<ExecutiveMetrics>({
    queryKey: ["/api/dashboard/executive/metrics"],
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
  });

  const {
    data: deptData,
    isLoading: isDeptLoading,
    error: deptError,
    refetch: refetchDept,
  } = useQuery<{ departments: DepartmentPerformance[] }>({
    queryKey: ["/api/dashboard/executive/departments"],
    retry: 3,
  });

  const {
    data: customersData,
    isLoading: isCustomersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery<{ topCustomers: TopCustomer[] }>({
    queryKey: ["/api/dashboard/executive/customers"],
    retry: 3,
  });

  const deptPerformance = deptData?.departments;
  const topCustomers = customersData?.topCustomers;

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading executive dashboard..." fullScreen />;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Failed to load dashboard"
          message={error instanceof Error ? error.message : "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time analytics and performance metrics across all operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Full Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {(metrics?.production.overdueJobs || 0) > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-600">
                {metrics?.production.overdueJobs} overdue production jobs require attention
              </p>
              <p className="text-sm text-muted-foreground">
                Review production board for details
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/production-board?filter=overdue">View Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Key Financial & Operational Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(metrics?.financials.totalRevenue || 0)}
          trend={metrics?.financials.revenueTrend || 0}
          icon={DollarSign}
          subtitle={`${formatPercentage(metrics?.financials.grossMargin || 0)} gross margin`}
          trendLabel="vs last month"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics?.financials.netProfit || 0)}
          trend={metrics?.financials.profitTrend || 0}
          icon={TrendingUp}
          subtitle={`COGS: ${formatCurrency(metrics?.financials.cogs || 0)}`}
          trendLabel="vs last month"
        />
        <MetricCard
          title="Overall OEE"
          value={formatPercentage(metrics?.operations.oee || 0)}
          trend={metrics?.operations.oeeTrend || 0}
          icon={Zap}
          subtitle={`${metrics?.operations.throughput || 0} units/day throughput`}
          trendLabel="vs target 85%"
          status={
            (metrics?.operations.oee || 0) >= 85
              ? "good"
              : (metrics?.operations.oee || 0) >= 60
              ? "warning"
              : "critical"
          }
        />
        <MetricCard
          title="On-Time Delivery"
          value={formatPercentage(metrics?.operations.onTimeDelivery || 0)}
          trend={0}
          icon={CheckCircle2}
          subtitle={`${formatPercentage(metrics?.operations.qualityRate || 0)} quality rate`}
          trendLabel=""
          status={(metrics?.operations.onTimeDelivery || 0) >= 95 ? "good" : "warning"}
        />
      </div>

      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Production Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Jobs</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {metrics?.production.activeJobs || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed Today</span>
                    <span className="text-lg font-semibold text-green-600">
                      {metrics?.production.completedToday || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overdue</span>
                    <span className="text-lg font-semibold text-red-600">
                      {metrics?.production.overdueJobs || 0}
                    </span>
                  </div>
                  {metrics?.production.bottleneckDept && (
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Bottleneck: {metrics.production.bottleneckDept}
                      </Badge>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link href="/manufacturing/production-board">View Board</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Workforce
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Employees</span>
                    <span className="text-2xl font-bold">{metrics?.workforce.totalEmployees || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Today</span>
                    <span className="text-lg font-semibold text-green-600">
                      {metrics?.workforce.activeToday || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Productivity</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-semibold">
                        {formatPercentage(metrics?.workforce.productivity || 0)}
                      </span>
                      {(metrics?.workforce.productivityTrend || 0) !== 0 && (
                        <TrendIndicator value={metrics?.workforce.productivityTrend || 0} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Cycle Time</span>
                    <span className="text-sm font-medium">{metrics?.workforce.avgCycleTime || 0}m</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link href="/admin/users">Manage Team</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  Inventory Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(metrics?.inventory.totalValue || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dead Stock</span>
                    <span className="text-lg font-semibold text-amber-600">
                      {formatCurrency(metrics?.inventory.deadStockValue || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days of Supply</span>
                    <span className="text-lg font-semibold">{metrics?.inventory.daysOfSupply || 0}d</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Turnover Rate</span>
                    <span className="text-sm font-medium">
                      {(metrics?.operations.inventoryTurnover || 0).toFixed(1)}x
                    </span>
                  </div>
                  {(metrics?.inventory.stockoutRisk || 0) > 0 && (
                    <div className="pt-2 border-t">
                      <Badge variant="destructive">
                        {metrics?.inventory.stockoutRisk} items at risk
                      </Badge>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link href="/modules/inventory">View Inventory</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Profitability</CardTitle>
                <CardDescription>Monthly financial performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(metrics?.financials.totalRevenue || 0)}</p>
                    </div>
                    <TrendIndicator value={metrics?.financials.revenueTrend || 0} size="lg" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cost of Goods Sold</span>
                      <span className="font-semibold">{formatCurrency(metrics?.financials.cogs || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-green-600">
                      <span className="text-sm">Gross Margin</span>
                      <span className="font-semibold">{formatPercentage(metrics?.financials.grossMargin || 0)}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Operating Costs</span>
                      <span className="font-semibold">{formatCurrency(metrics?.financials.operatingCosts || 0)}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Net Profit</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(metrics?.financials.netProfit || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Breakdown of operational expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Labor</span>
                    <span className="font-semibold">
                      {formatCurrency((metrics?.financials.operatingCosts || 0) * 0.45)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: "45%" }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Materials</span>
                    <span className="font-semibold">
                      {formatCurrency((metrics?.financials.operatingCosts || 0) * 0.35)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: "35%" }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overhead</span>
                    <span className="font-semibold">
                      {formatCurrency((metrics?.financials.operatingCosts || 0) * 0.20)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: "20%" }} />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-6" asChild>
                  <Link href="/manufacturing/analytics/costs">View Details</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Revenue and efficiency by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deptPerformance && deptPerformance.length > 0 ? (
                  deptPerformance.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{dept.department}</span>
                          {dept.efficiency >= 90 && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              High Performer
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Revenue: </span>
                            <span className="font-medium">{formatCurrency(dept.revenue)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Efficiency: </span>
                            <span className="font-medium">{dept.efficiency}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Active: </span>
                            <span className="font-medium">{dept.activeJobs} jobs</span>
                          </div>
                        </div>
                      </div>
                      <TrendIndicator value={dept.trend} />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No department data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Revenue by customer this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers && topCustomers.length > 0 ? (
                  topCustomers.map((customer, index) => (
                    <div key={customer.name} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(customer.revenue)}</p>
                        <TrendIndicator value={customer.trend} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No customer data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  subtitle,
  trendLabel,
  status,
}: {
  title: string;
  value: string;
  trend: number;
  icon: typeof DollarSign;
  subtitle: string;
  trendLabel: string;
  status?: "good" | "warning" | "critical";
}) {
  const statusColors = {
    good: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${status ? statusColors[status] : ""}`}>{value}</span>
            {trend !== 0 && <TrendIndicator value={trend} />}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trendLabel && (
            <p className="text-[10px] text-muted-foreground">{trendLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";
  const bgClass = isPositive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30";
  const sizeClass = size === "lg" ? "h-8 w-8" : "h-5 w-5";
  const iconSize = size === "lg" ? "h-5 w-5" : "h-3 w-3";

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass} ${bgClass} rounded-full px-1.5`}>
      <Icon className={`${iconSize} ${colorClass}`} />
      <span className={`text-xs font-semibold ${colorClass}`}>
        {Math.abs(value).toFixed(1)}%
      </span>
    </div>
  );
}
