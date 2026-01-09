"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  GitBranch,
  Activity,
  Database,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SystemOverview {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  departments: {
    total: number;
    active: number;
    mostUsed: Array<{ name: string; jobCount: number; color: string }>;
  };
  routings: {
    total: number;
    active: number;
    defaultCount: number;
  };
  production: {
    activeOrders: number;
    completedToday: number;
    pendingOrders: number;
    avgCompletionTime: number;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
  };
  purchasing: {
    openPOs: number;
    awaitingApproval: number;
    receivedToday: number;
  };
  sales: {
    openOrders: number;
    shippedToday: number;
    readyToShip: number;
  };
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    entity: string;
    timestamp: string;
  }>;
}

export default function SystemOverviewPage() {
  const { data: overview, isLoading } = useQuery<SystemOverview>({
    queryKey: ["/api/admin/system-overview"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          System Overview
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete view of all system activity and statistics
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.users.active || 0} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.departments.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.departments.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Routings</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.routings.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.routings.defaultCount || 0} default
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              Healthy
            </div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Production</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview?.production.activeOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.production.completedToday || 0} completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Database className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview?.inventory.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.inventory.lowStockItems || 0} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overview?.purchasing.openPOs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.purchasing.awaitingApproval || 0} awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {overview?.sales.openOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.sales.shippedToday || 0} shipped today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users by Role
          </CardTitle>
          <CardDescription>Distribution of user roles across the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {overview?.users.byRole &&
              Object.entries(overview.users.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{role}</div>
                    <div className="text-2xl font-bold text-primary">{count}</div>
                  </div>
                  <Badge variant="secondary">{count} users</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Most Used Departments */}
      {overview?.departments.mostUsed && overview.departments.mostUsed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Active Departments
            </CardTitle>
            <CardDescription>Departments with highest job volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.departments.mostUsed.map((dept, index) => (
                <div key={dept.name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div
                    className="h-10 w-10 rounded flex items-center justify-center text-lg"
                    style={{
                      backgroundColor: `${dept.color}20`,
                      borderColor: dept.color,
                      borderWidth: 2,
                    }}
                  >
                    📦
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{dept.name}</div>
                    <div className="text-sm text-muted-foreground">{dept.jobCount} jobs</div>
                  </div>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${dept.color}20`,
                      color: dept.color,
                    }}
                  >
                    {dept.jobCount} jobs
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Production Performance
            </CardTitle>
            <CardDescription>Today's production metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed Orders</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold">{overview?.production.completedToday || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Orders</span>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-bold">{overview?.production.activeOrders || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-lg font-bold">{overview?.production.pendingOrders || 0}</span>
              </div>
            </div>
            {overview?.production.avgCompletionTime && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Avg Completion Time</span>
                <span className="text-lg font-bold">
                  {overview.production.avgCompletionTime}h
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
            <CardDescription>Current inventory status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Items</span>
              <span className="text-lg font-bold">{overview?.inventory.totalItems || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Low Stock Items</span>
              <Badge variant="destructive">{overview?.inventory.lowStockItems || 0}</Badge>
            </div>
            {overview?.inventory.totalValue && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-lg font-bold">
                  ${overview.inventory.totalValue.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {overview?.recentActivity && overview.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent System Activity
            </CardTitle>
            <CardDescription>Latest actions across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.user}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.entity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
