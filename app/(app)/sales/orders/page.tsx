"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ShoppingBag,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InlineLoading } from "@/components/LoadingSpinner";

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string };
  orderDate: string;
  requiredDate: string | null;
  status: string;
  total: number;
  currency: string;
  _count: { lines: number; shipments: number };
}

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  baseUom: string;
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ALLOCATED", label: "Allocated" },
  { value: "PICKING", label: "Picking" },
  { value: "PACKED", label: "Packed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function SalesOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [orderLines, setOrderLines] = useState<
    Array<{
      itemId: string;
      qtyOrdered: number;
      unitPrice: number;
    }>
  >([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch orders
  const { data, isLoading } = useQuery({
    queryKey: ["sales-orders", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const res = await fetch(`/api/sales/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers?active=true");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Fetch items for dropdown
  const { data: itemsData } = useQuery({
    queryKey: ["items-list"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const orderNumber = formData.get("orderNumber") as string;
      const customerId = formData.get("customerId") as string;
      const orderDate = formData.get("orderDate") as string;

      if (!orderLines.length) {
        throw new Error("At least one line item is required");
      }

      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerId,
          orderDate,
          requiredDate: formData.get("requiredDate") || undefined,
          notes: formData.get("notes") || undefined,
          lines: orderLines.map((line, idx) => ({
            lineNumber: idx + 1,
            itemId: line.itemId,
            qtyOrdered: line.qtyOrdered,
            unitPrice: line.unitPrice,
            uom: itemsData?.items?.find((i: Item) => i.id === line.itemId)
              ?.baseUom || "EA",
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setDialogOpen(false);
      setOrderLines([]);
      setSelectedCustomer("");
      toast({ title: "Success", description: "Sales order created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/orders/${id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to confirm order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Success", description: "Order confirmed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to confirm order", variant: "destructive" });
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/orders/${id}/allocate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to allocate inventory");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      if (data.allocation.fullyAllocated) {
        toast({ title: "Success", description: "Inventory fully allocated" });
      } else {
        toast({ title: "Warning", description: "Partial allocation - some items have shortfall" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to allocate inventory", variant: "destructive" });
    },
  });

  const pickMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/orders/${id}/pick`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create pick task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast({ title: "Success", description: "Pick task created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pick task", variant: "destructive" });
    },
  });

  const orders: SalesOrder[] = data?.salesOrders || [];
  const customers: Customer[] = customersData?.customers || [];
  const items: Item[] = itemsData?.items || [];

  const addLine = () => {
    setOrderLines([...orderLines, { itemId: "", qtyOrdered: 1, unitPrice: 0 }]);
  };

  const updateLine = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newLines = [...orderLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setOrderLines(newLines);
  };

  const removeLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Sales Orders</h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sales Order</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input id="orderNumber" name="orderNumber" required />
                </div>
                <div>
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select
                    name="customerId"
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    id="orderDate"
                    name="orderDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="requiredDate">Required Date</Label>
                <Input id="requiredDate" name="requiredDate" type="date" />
              </div>

              {/* Order Lines */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line
                  </Button>
                </div>

                {orderLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items added. Click &quot;Add Line&quot; to add items.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1">
                          <Select
                            value={line.itemId}
                            onValueChange={(v) => updateLine(idx, "itemId", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.sku} - {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={line.qtyOrdered}
                            onChange={(e) =>
                              updateLine(idx, "qtyOrdered", parseFloat(e.target.value) || 0)
                            }
                            min="0.01"
                            step="0.01"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(idx)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <div className="text-right text-sm font-medium pt-2 border-t">
                      Total: $
                      {orderLines
                        .reduce((sum, l) => sum + l.qtyOrdered * l.unitPrice, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <InlineLoading message="Loading orders..." />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search || statusFilter
                ? "No orders match your filters"
                : "No sales orders yet. Create your first order to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Order #</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Required</th>
                    <th className="text-left p-4 font-medium">Lines</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Total</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <Link
                          href={`/sales/orders/${order.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="p-4">{order.customer.name}</td>
                      <td className="p-4">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {order.requiredDate
                          ? new Date(order.requiredDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4">{order._count.lines}</td>
                      <td className="p-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="p-4 text-right font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: order.currency || "USD",
                        }).format(order.total)}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/orders/${order.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {order.status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => confirmMutation.mutate(order.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Order
                              </DropdownMenuItem>
                            )}
                            {order.status === "CONFIRMED" && (
                              <DropdownMenuItem
                                onClick={() => allocateMutation.mutate(order.id)}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Allocate Inventory
                              </DropdownMenuItem>
                            )}
                            {order.status === "ALLOCATED" && (
                              <DropdownMenuItem
                                onClick={() => pickMutation.mutate(order.id)}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Create Pick Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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
