import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Package, TrendingDown, AlertCircle, ExternalLink } from "lucide-react";
import type { Item } from "@shared/inventory";
import type { InventoryBalance } from "@shared/inventory";

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
      reorderPoint: number;
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
};

export default function AlertsPage() {
  const [alertType, setAlertType] = useState<"all" | "lowStock" | "outOfStock" | "deadStock">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const lowStockItems = data?.alerts?.lowStockItems || [];
  const outOfStockItems = data?.alerts?.outOfStockItems || [];
  const deadStockItems = data?.alerts?.deadStockItems || [];

  const allAlerts = [
    ...lowStockItems.map(item => ({ ...item, type: "lowStock" as const, severity: "warning" as const })),
    ...outOfStockItems.map(item => ({ ...item, type: "outOfStock" as const, severity: "error" as const, currentStock: 0, reorderPoint: 0 })),
    ...deadStockItems.map(item => ({ ...item, type: "deadStock" as const, severity: "info" as const, reorderPoint: 0 })),
  ];

  const filteredAlerts = allAlerts.filter(alert => {
    if (alertType !== "all" && alert.type !== alertType) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return alert.sku.toLowerCase().includes(search) || alert.name.toLowerCase().includes(search);
    }
    return true;
  });

  const getAlertBadge = (type: "lowStock" | "outOfStock" | "deadStock") => {
    switch (type) {
      case "lowStock":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">Low Stock</Badge>;
      case "outOfStock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "deadStock":
        return <Badge variant="outline" className="text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400">Dead Stock</Badge>;
    }
  };

  const getSeverityColor = (severity: "warning" | "error" | "info") => {
    switch (severity) {
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage items requiring attention
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Items requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">At or below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Zero inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{deadStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ${(data?.alerts?.deadStockValue || 0).toLocaleString()} at risk
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Details</CardTitle>
          <CardDescription>
            View and filter inventory alerts. Click an item to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="lowStock">Low Stock Only</SelectItem>
                <SelectItem value="outOfStock">Out of Stock Only</SelectItem>
                <SelectItem value="deadStock">Dead Stock Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                {searchTerm || alertType !== "all"
                  ? "No alerts match your filters"
                  : "No alerts at this time"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const shortage = alert.type === "lowStock" || alert.type === "outOfStock"
                      ? Math.max(0, alert.reorderPoint - alert.currentStock)
                      : 0;

                    return (
                      <TableRow key={`${alert.type}-${alert.id}`}>
                        <TableCell>{getAlertBadge(alert.type)}</TableCell>
                        <TableCell className="font-mono text-sm">{alert.sku}</TableCell>
                        <TableCell>{alert.name}</TableCell>
                        <TableCell className={`text-right font-semibold ${getSeverityColor(alert.severity)}`}>
                          {alert.currentStock}
                        </TableCell>
                        <TableCell className="text-right">
                          {alert.reorderPoint > 0 ? alert.reorderPoint : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {shortage > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              -{shortage}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href="/modules/inventory/items" className="inline-flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredAlerts.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Action Required: Low Stock Items
            </CardTitle>
            <CardDescription>
              These items are at or below their reorder point and should be reordered soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Consider creating purchase orders for these items to maintain optimal stock levels.
            </p>
            <div className="flex gap-2">
              <Button variant="default" size="sm" asChild>
                <a href="/modules/purchasing/purchase-orders">Create Purchase Order</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/modules/inventory/items">Edit Reorder Points</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
