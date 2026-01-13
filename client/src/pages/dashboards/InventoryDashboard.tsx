"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Search,
  ClipboardCheck,
  MapPin,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ScanLine,
  BoxSelect,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryMetrics {
  totalValue: number;
  totalSkus: number;
  totalStock: number;
  receivingQueue: number;
  pickingTasks: number;
  lowStockCount: number;
  outOfStockCount: number;
  cycleCountsDue: number;
  locationAccuracy: number;
  putawayEfficiency: number;
  inventoryTurnover: number;
}

interface BinLocation {
  id: string;
  binCode: string;
  itemName: string;
  sku: string;
  quantity: number;
  uom: string;
  zone: string;
}

interface StockMovement {
  id: string;
  itemName: string;
  sku: string;
  quantity: number;
  uom: string;
  type: "RECEIVE" | "ISSUE" | "MOVE" | "ADJUST";
  timestamp: Date;
  location: string;
}

export default function InventoryDashboard() {
  const [binSearchQuery, setBinSearchQuery] = useState("");

  const { data: metrics, isLoading } = useQuery<InventoryMetrics>({
    queryKey: ["/api/dashboard/inventory/metrics"],
    refetchInterval: 30000,
  });

  const { data: lowStock } = useQuery<any[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: recentMovements } = useQuery<StockMovement[]>({
    queryKey: ["/api/inventory/movements/recent"],
  });

  const { data: binSearchResults } = useQuery<BinLocation[]>({
    queryKey: ["/api/inventory/bin-lookup", binSearchQuery],
    enabled: binSearchQuery.length >= 2,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
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
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Inventory Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
        <p className="text-muted-foreground">
          Quick bin lookup, stock management, and warehouse operations
        </p>
      </div>

      {/* Quick Bin Lookup - Most Prominent Feature */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Quick Bin Lookup
          </CardTitle>
          <CardDescription>Search by bin code, SKU, or item name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search bins, SKUs, or items..."
                value={binSearchQuery}
                onChange={(e) => setBinSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button size="lg" className="gap-2" asChild>
              <Link href="/mobile/job-scanner">
                <ScanLine className="h-5 w-5" />
                Scan
              </Link>
            </Button>
          </div>

          {/* Search Results */}
          {binSearchQuery.length >= 2 && (
            <div className="mt-4 space-y-2">
              {binSearchResults && binSearchResults.length > 0 ? (
                binSearchResults.slice(0, 5).map((bin) => (
                  <div key={bin.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{bin.binCode}</p>
                        <p className="text-sm text-muted-foreground">{bin.itemName}</p>
                        <p className="text-xs text-muted-foreground">SKU: {bin.sku} • Zone: {bin.zone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{bin.quantity}</p>
                      <p className="text-sm text-muted-foreground">{bin.uom}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">No results found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalSkus || 0} SKUs • {(metrics?.totalStock || 0).toLocaleString()} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receiving Queue</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.receivingQueue || 0}</div>
            <p className="text-xs text-muted-foreground">Inbound shipments pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {(metrics?.lowStockCount || 0) + (metrics?.outOfStockCount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.outOfStockCount || 0} out • {metrics?.lowStockCount || 0} low
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cycle Counts Due</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cycleCountsDue || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
          <TabsTrigger value="metrics">Performance</TabsTrigger>
        </TabsList>

        {/* Stock Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items at or below reorder point</CardDescription>
            </CardHeader>
            <CardContent>
              {!lowStock || lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BoxSelect className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 8).map((item: any) => (
                    <Link
                      key={item.itemId}
                      href={`/items/${item.itemId}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          {item.totalQty} {item.uom}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Reorder: {item.reorderPoint}</p>
                      </div>
                    </Link>
                  ))}
                  <Button className="w-full mt-4" asChild>
                    <Link href="/modules/inventory?filter=alerts">View All Alerts</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
              <CardDescription>Latest inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentMovements || recentMovements.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No recent movements</p>
              ) : (
                <div className="space-y-2">
                  {recentMovements.slice(0, 8).map((movement) => {
                    const icons = {
                      RECEIVE: ArrowDownToLine,
                      ISSUE: ArrowUpFromLine,
                      MOVE: ArrowRightLeft,
                      ADJUST: ClipboardCheck,
                    };
                    const colors = {
                      RECEIVE: "text-green-600 bg-green-100",
                      ISSUE: "text-blue-600 bg-blue-100",
                      MOVE: "text-purple-600 bg-purple-100",
                      ADJUST: "text-amber-600 bg-amber-100",
                    };
                    const Icon = icons[movement.type];

                    return (
                      <div key={movement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${colors[movement.type]}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{movement.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(movement.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="font-medium">{movement.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {movement.location} • SKU: {movement.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{movement.quantity}</p>
                          <p className="text-xs text-muted-foreground">{movement.uom}</p>
                        </div>
                      </div>
                    );
                  })}
                  <Button className="w-full mt-4" variant="outline" asChild>
                    <Link href="/modules/inventory/events">View All Movements</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Warehouse Performance</CardTitle>
                <CardDescription>Operational efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Location Accuracy</p>
                      <p className="text-2xl font-bold">{metrics?.locationAccuracy || 0}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Putaway Efficiency</p>
                      <p className="text-2xl font-bold">{metrics?.putawayEfficiency || 0}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Inventory Turnover</p>
                      <p className="text-2xl font-bold">{(metrics?.inventoryTurnover || 0).toFixed(1)}x</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common inventory tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Button variant="outline" className="justify-start h-12" asChild>
                    <Link href="/purchasing/receipts/new">
                      <ArrowDownToLine className="h-5 w-5 mr-2" />
                      Receive Inventory
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start h-12" asChild>
                    <Link href="/modules/inventory?action=issue">
                      <ArrowUpFromLine className="h-5 w-5 mr-2" />
                      Issue / Ship
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start h-12" asChild>
                    <Link href="/modules/inventory?action=move">
                      <ArrowRightLeft className="h-5 w-5 mr-2" />
                      Move Stock
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start h-12" asChild>
                    <Link href="/modules/cycle-counts">
                      <ClipboardCheck className="h-5 w-5 mr-2" />
                      Cycle Count
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
