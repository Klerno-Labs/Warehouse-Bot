"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, TrendingDown, Package, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface PurchasingMetrics {
  pendingApprovals: number;
  overdueDeliveries: number;
  lowStockItems: number;
  monthlySpend: number;
  budgetRemaining: number;
  avgLeadTime: number;
  onTimeDeliveryRate: number;
}

interface PendingPO {
  id: string;
  poNumber: string;
  supplierName: string;
  total: number;
  orderDate: string;
}

interface OverdueDelivery {
  id: string;
  poNumber: string;
  supplierName: string;
  expectedDelivery: string;
  daysOverdue: number;
}

export default function PurchasingDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<PurchasingMetrics>({
    queryKey: ["/api/dashboard/purchasing/metrics"],
  });

  const { data: pendingPOs, isLoading: posLoading } = useQuery<PendingPO[]>({
    queryKey: ["/api/dashboard/purchasing/pending-approvals"],
  });

  const { data: overdueDeliveries, isLoading: overdueLoading } = useQuery<OverdueDelivery[]>({
    queryKey: ["/api/dashboard/purchasing/overdue-deliveries"],
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  if (metricsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchasing Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor purchase orders, supplier performance, and spending
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Deliveries</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.overdueDeliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Past expected delivery date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics?.lowStockItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(metrics?.monthlySpend || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(metrics?.budgetRemaining || 0).toLocaleString()} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>POs Awaiting Approval</CardTitle>
            <CardDescription>Purchase orders requiring your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {posLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !pendingPOs || pendingPOs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  All caught up! No pending approvals.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPOs.slice(0, 5).map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{po.poNumber}</div>
                      <div className="text-sm text-muted-foreground">{po.supplierName}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold">${po.total.toLocaleString()}</div>
                      <Button size="sm" asChild>
                        <Link href={`/purchasing/purchase-orders/${po.id}`}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Overdue Deliveries</CardTitle>
            <CardDescription>Follow up with suppliers on late orders</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !overdueDeliveries || overdueDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Great! All deliveries are on time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueDeliveries.slice(0, 5).map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3 border border-destructive/50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{delivery.poNumber}</div>
                      <div className="text-sm text-muted-foreground">{delivery.supplierName}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{delivery.daysOverdue} days late</Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expected: {new Date(delivery.expectedDelivery).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items Needing Reorder */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Low Stock - Action Required</CardTitle>
            <CardDescription>Items below reorder point that need purchasing</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !lowStock || lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  All inventory levels are healthy.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 8).map((item: any) => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Current: {item.totalQty} {item.uom}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Reorder at: {item.reorderPoint} {item.uom}
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/purchasing/purchase-orders/new?itemId=${item.itemId}`}>
                          Create PO
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Performance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance</CardTitle>
          <CardDescription>Key metrics for your top suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Avg Lead Time</div>
              <div className="text-2xl font-bold">{metrics?.avgLeadTime || 0} days</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">On-Time Delivery</div>
              <div className="text-2xl font-bold text-green-600">
                {metrics?.onTimeDeliveryRate || 0}%
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Button asChild>
                <Link href="/purchasing/analytics">View Detailed Analytics</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
