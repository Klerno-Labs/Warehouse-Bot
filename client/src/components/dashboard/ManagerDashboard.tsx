import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  InventoryValueTrend,
  StockMovementChart,
  CategoryDistributionChart,
  ProductionStatusChart,
} from "./AdvancedCharts";

interface ManagerStats {
  totalInventoryValue: number;
  inventoryChange: number;
  activeJobs: number;
  jobsChange: number;
  lowStockItems: number;
  pendingApprovals: number;
  teamProductivity: number;
  productivityChange: number;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

/**
 * Manager Dashboard - Comprehensive view for supervisors and managers
 * Focus on analytics, team performance, and decision-making
 */
export function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ManagerStats>({
    totalInventoryValue: 0,
    inventoryChange: 0,
    activeJobs: 0,
    jobsChange: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
    teamProductivity: 0,
    productivityChange: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sample data for charts
  const [inventoryTrend] = useState([
    { date: "Day 1", value: 125000, quantity: 5200 },
    { date: "Day 7", value: 128000, quantity: 5350 },
    { date: "Day 14", value: 132000, quantity: 5500 },
    { date: "Day 21", value: 129000, quantity: 5400 },
    { date: "Day 30", value: 135000, quantity: 5600 },
  ]);

  const [stockMovement] = useState([
    { name: "Mon", receives: 45, moves: 32, adjustments: 5 },
    { name: "Tue", receives: 52, moves: 41, adjustments: 3 },
    { name: "Wed", receives: 38, moves: 47, adjustments: 7 },
    { name: "Thu", receives: 61, moves: 39, adjustments: 4 },
    { name: "Fri", receives: 48, moves: 55, adjustments: 6 },
  ]);

  const [categoryDistribution] = useState([
    { name: "Production", value: 68000, count: 245 },
    { name: "Packaging", value: 42000, count: 156 },
    { name: "Facility", value: 18000, count: 89 },
    { name: "Chemical/MRO", value: 7000, count: 67 },
  ]);

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();

      setStats({
        totalInventoryValue: data.totalInventoryValue || 135000,
        inventoryChange: 4.2,
        activeJobs: data.activeJobs || 23,
        jobsChange: 12.5,
        lowStockItems: data.lowStockItems || 8,
        pendingApprovals: data.pendingApprovals || 3,
        teamProductivity: 87.5,
        productivityChange: 5.3,
      });

      setAlerts([
        {
          id: "1",
          type: "critical",
          message: "8 items below reorder point - immediate action needed",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          type: "warning",
          message: "3 cycle count variances awaiting approval",
          timestamp: new Date().toISOString(),
        },
        {
          id: "3",
          type: "info",
          message: "Production efficiency up 5.3% this week",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch manager dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName}. Here's your facility overview.
          </p>
        </div>
        <Button>
          <BarChart3 className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Inventory Value</CardDescription>
            <CardTitle className="text-3xl">
              ${stats.totalInventoryValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">+{stats.inventoryChange}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats.activeJobs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">+{stats.jobsChange}%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Items Below Reorder Point</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.lowStockItems}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              View Reorder Suggestions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Team Productivity</CardDescription>
            <CardTitle className="text-3xl">{stats.teamProductivity}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">
                +{stats.productivityChange}%
              </span>
              <span className="text-muted-foreground">this week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Action Required
            </CardTitle>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 p-3 rounded ${
                  alert.type === "critical"
                    ? "border-red-500 bg-red-50"
                    : alert.type === "warning"
                    ? "border-orange-500 bg-orange-50"
                    : "border-blue-500 bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{alert.message}</p>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryValueTrend data={inventoryTrend} />
        <StockMovementChart data={stockMovement} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistributionChart data={categoryDistribution} />
        <ProductionStatusChart active={stats.activeJobs} planned={15} completed={42} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jobs Completed/Day</span>
                <span className="font-semibold">12.4</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg. Time per Job</span>
                <span className="font-semibold">3.2 hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Error Rate</span>
                <span className="font-semibold text-green-600">0.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Inventory Turnover</span>
                <span className="font-semibold">6.2x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Stock Accuracy</span>
                <span className="font-semibold text-green-600">98.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Days of Supply</span>
                <span className="font-semibold">24 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>First Pass Yield</span>
                <span className="font-semibold text-green-600">96.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Scrap Rate</span>
                <span className="font-semibold">1.4%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>On-Time Delivery</span>
                <span className="font-semibold text-green-600">94.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
