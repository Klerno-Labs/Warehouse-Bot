"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Truck,
  CheckCircle2,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesMetrics {
  monthlyRevenue: number;
  revenueTrend: number;
  ordersShipped: number;
  readyToShip: number;
  inTransit: number;
  pickRate: number;
  activeQuotes: number;
  quotesConversionRate: number;
  topCustomers: number;
  avgOrderValue: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  customer: string;
  totalValue: number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED";
  createdAt: Date;
  expiresAt: Date;
  items: number;
}

interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate: Date;
  status: "ACTIVE" | "INACTIVE";
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  totalValue: number;
  status: "PENDING" | "PICKING" | "READY" | "SHIPPED";
  createdAt: Date;
  itemsCount: number;
}

export default function SalesDashboard() {
  const { data: metrics, isLoading } = useQuery<SalesMetrics>({
    queryKey: ["/api/dashboard/sales/metrics"],
    refetchInterval: 30000,
  });

  const { data: activeQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/sales/quotes?status=active"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/sales/customers/top"],
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/sales/orders/recent"],
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
      {/* Sales Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Manage quotes, orders, and customer relationships
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.monthlyRevenue || 0)}
              </span>
              {(metrics?.revenueTrend || 0) !== 0 && (
                <span className={`text-xs font-semibold ${(metrics?.revenueTrend || 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {(metrics?.revenueTrend || 0) > 0 ? "+" : ""}
                  {metrics?.revenueTrend}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.ordersShipped || 0} orders shipped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.activeQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.quotesConversionRate || 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics?.readyToShip || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.inTransit || 0} in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics?.pickRate || 0}%</div>
            <p className="text-xs text-muted-foreground">On-time delivery</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quotes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotes">Quote Pipeline</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Quote Pipeline Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Quotes</CardTitle>
                    <CardDescription>Quotes awaiting customer response</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/sales/quotes/new">New Quote</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!activeQuotes || activeQuotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No active quotes</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link href="/sales/quotes/new">Create Quote</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeQuotes.slice(0, 5).map((quote) => {
                      const statusColors = {
                        DRAFT: "bg-gray-100 text-gray-700",
                        SENT: "bg-blue-100 text-blue-700",
                        ACCEPTED: "bg-green-100 text-green-700",
                        EXPIRED: "bg-red-100 text-red-700",
                      };

                      const daysUntilExpiry = Math.ceil(
                        (new Date(quote.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <div key={quote.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{quote.quoteNumber}</span>
                                <Badge className={statusColors[quote.status]} variant="secondary">
                                  {quote.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{quote.customer}</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/sales/quotes/${quote.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formatCurrency(quote.totalValue)}</span>
                            <span className="text-muted-foreground">
                              {quote.items} items • Expires in {daysUntilExpiry}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Health</CardTitle>
                <CardDescription>Quote conversion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Quotes</p>
                      <p className="text-2xl font-bold">{metrics?.activeQuotes || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold">{metrics?.quotesConversionRate || 0}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(metrics?.avgOrderValue || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer List</CardTitle>
                  <CardDescription>Manage your customer relationships</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/sales/customers">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!customers || customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No customers yet</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/sales/customers/new">Add Customer</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.slice(0, 6).map((customer) => (
                    <div key={customer.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{customer.name}</span>
                          <Badge variant={customer.status === "ACTIVE" ? "default" : "secondary"}>
                            {customer.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(customer.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">{customer.totalOrders} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                {!orders || orders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No recent orders</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => {
                      const statusColors = {
                        PENDING: "bg-gray-100 text-gray-700",
                        PICKING: "bg-blue-100 text-blue-700",
                        READY: "bg-amber-100 text-amber-700",
                        SHIPPED: "bg-green-100 text-green-700",
                      };

                      return (
                        <div key={order.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{order.orderNumber}</span>
                                <Badge className={statusColors[order.status]} variant="secondary">
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{order.customer}</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/sales/orders/${order.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formatCurrency(order.totalValue)}</span>
                            <span className="text-muted-foreground">
                              {order.itemsCount} items • {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Status</CardTitle>
                <CardDescription>Order processing overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ready to Ship</span>
                      <span className="font-semibold">{metrics?.readyToShip || 0}</span>
                    </div>
                    <Progress value={((metrics?.readyToShip || 0) / ((metrics?.ordersShipped || 1))) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">In Transit</span>
                      <span className="font-semibold">{metrics?.inTransit || 0}</span>
                    </div>
                    <Progress value={((metrics?.inTransit || 0) / ((metrics?.ordersShipped || 1))) * 100} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm text-muted-foreground">On-Time Delivery Rate</p>
                      <p className="text-2xl font-bold text-green-600">{metrics?.pickRate || 0}%</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/sales/quotes/new">
                <FileText className="h-4 w-4 mr-2" />
                New Quote
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/sales/customers">
                <Users className="h-4 w-4 mr-2" />
                Manage Customers
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/modules/inventory?view=atp">
                <Package className="h-4 w-4 mr-2" />
                Check Stock (ATP)
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/sales/orders">
                <Truck className="h-4 w-4 mr-2" />
                Track Shipments
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
