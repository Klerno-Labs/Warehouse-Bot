"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TrendingDown, ClipboardCheck, MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/inventory/metrics"],
  });

  const { data: cycleCount} = useQuery({
    queryKey: ["/api/cycle-counts", { status: "SCHEDULED" }],
  });

  const { data: lowStock } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor stock levels, cycle counts, and warehouse operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receiving Queue</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.receivingQueue || 0}</div>
            <p className="text-xs text-muted-foreground">Inbound shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Picking Tasks</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pickingTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStock?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cycle Counts Due</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycleCount?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {!lowStock || lowStock.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">All stock levels are healthy</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((item: any) => (
                  <div key={item.itemId} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-muted-foreground">{item.sku}</div>
                    </div>
                    <Badge variant="outline">{item.totalQty} {item.uom}</Badge>
                  </div>
                ))}
                <Button className="w-full mt-2" asChild>
                  <Link href="/modules/inventory/alerts">View All Alerts</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest inventory transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Location Accuracy</span>
                <span className="font-medium">98.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Putaway Efficiency</span>
                <span className="font-medium">92%</span>
              </div>
              <Button className="w-full mt-4" asChild>
                <Link href="/modules/inventory/events">View All Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
