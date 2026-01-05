"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, Truck, Package, TrendingUp, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SalesPage() {
  // Fetch quick stats
  const { data: ordersData } = useQuery({
    queryKey: ["sales-orders-stats"],
    queryFn: async () => {
      const res = await fetch("/api/sales/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-stats"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers?active=true");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ["shipments-stats"],
    queryFn: async () => {
      const res = await fetch("/api/sales/shipments");
      if (!res.ok) throw new Error("Failed to fetch shipments");
      return res.json();
    },
  });

  const orders = ordersData?.salesOrders || [];
  const customers = customersData?.customers || [];
  const shipments = shipmentsData?.shipments || [];

  // Calculate stats
  const pendingOrders = orders.filter((o: { status: string }) =>
    ["DRAFT", "CONFIRMED", "ALLOCATED", "PICKING"].includes(o.status)
  ).length;
  const shippedOrders = orders.filter((o: { status: string }) => o.status === "SHIPPED").length;
  const pendingShipments = shipments.filter(
    (s: { status: string }) => s.status === "DRAFT" || s.status === "READY_TO_SHIP"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Sales</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready to Ship
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingShipments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shipped This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{shippedOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/sales/customers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Customers</CardTitle>
              </div>
              <CardDescription>
                Manage customer accounts, contacts, and credit terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Manage Customers
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <CardTitle>Sales Orders</CardTitle>
              </div>
              <CardDescription>
                Create, manage, and fulfill sales orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Orders
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales/shipments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle>Shipments</CardTitle>
              </div>
              <CardDescription>
                Track shipments, add tracking info, and manage delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Shipments
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>
                Sales performance, trends, and customer insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/sales/orders">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sales orders yet. Create your first order to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Order #</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order: {
                    id: string;
                    orderNumber: string;
                    customer: { name: string };
                    orderDate: string;
                    status: string;
                    total: number;
                    currency: string;
                  }) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">
                        <Link
                          href={`/sales/orders/${order.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3">{order.customer.name}</td>
                      <td className="py-3">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 text-right font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: order.currency || "USD",
                        }).format(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    ALLOCATED: "bg-purple-100 text-purple-800",
    PICKING: "bg-yellow-100 text-yellow-800",
    PACKED: "bg-orange-100 text-orange-800",
    SHIPPED: "bg-green-100 text-green-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
