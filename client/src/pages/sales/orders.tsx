"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  FileText,
  Package,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Filter,
  Download,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";

interface SalesOrderLine {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  qtyOrdered: number;
  qtyAllocated: number;
  qtyShipped: number;
  unitPrice: number;
  lineTotal: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  requestedDate?: string;
  promisedDate?: string;
  status: string;
  customerId: string;
  customerPO?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  customer: {
    id: string;
    code: string;
    name: string;
    email?: string;
  };
  lines: SalesOrderLine[];
  shipToName?: string;
  shipToAddress1?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  sellPrice?: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500", icon: FileText },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-500", icon: CheckCircle },
  PICKING: { label: "Picking", color: "bg-yellow-500", icon: Package },
  ALLOCATED: { label: "Allocated", color: "bg-purple-500", icon: Clock },
  SHIPPED: { label: "Shipped", color: "bg-green-500", icon: Truck },
  DELIVERED: { label: "Delivered", color: "bg-green-700", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
};

export default function SalesOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Form state for new order
  const [customerId, setCustomerId] = useState("");
  const [customerPO, setCustomerPO] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderLines, setOrderLines] = useState<
    { itemId: string; qty: number; unitPrice: number }[]
  >([]);

  const { data: ordersData, isLoading } = useQuery<{ orders: SalesOrder[] }>({
    queryKey: ["/api/sales/orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/sales/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/sales/customers"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers?active=true");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sales/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      toast({ title: "Success", description: "Sales order created" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/sales/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      toast({ title: "Success", description: "Order status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const orders = ordersData?.orders || [];
  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPO?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setCustomerId("");
    setCustomerPO("");
    setRequestedDate("");
    setNotes("");
    setOrderLines([]);
  };

  const addLine = () => {
    setOrderLines([...orderLines, { itemId: "", qty: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const updateLine = (
    index: number,
    field: "itemId" | "qty" | "unitPrice",
    value: any
  ) => {
    const updated = [...orderLines];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill price if item selected
    if (field === "itemId") {
      const item = itemsData?.items.find((i) => i.id === value);
      if (item?.sellPrice) {
        updated[index].unitPrice = item.sellPrice;
      }
    }

    setOrderLines(updated);
  };

  const handleCreate = () => {
    const lines = orderLines
      .filter((l) => l.itemId && l.qty > 0)
      .map((l) => ({
        itemId: l.itemId,
        qtyOrdered: l.qty,
        unitPrice: l.unitPrice,
      }));

    if (lines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      customerId,
      customerPO: customerPO || undefined,
      requestedDate: requestedDate || undefined,
      notes: notes || undefined,
      lines,
    });
  };

  const downloadPDF = async (orderId: string) => {
    try {
      const res = await fetch(`/api/sales/orders/${orderId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const sendEmail = async (orderId: string) => {
    try {
      await apiRequest("POST", `/api/sales/orders/${orderId}/email`);
      toast({ title: "Success", description: "Order confirmation sent" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Sales Orders</h1>
            <p className="text-muted-foreground">
              Manage customer orders and shipments
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Open Orders",
            count: orders.filter((o) =>
              ["DRAFT", "CONFIRMED", "PICKING", "ALLOCATED"].includes(o.status)
            ).length,
            color: "text-blue-600",
          },
          {
            label: "Ready to Ship",
            count: orders.filter((o) => o.status === "ALLOCATED").length,
            color: "text-purple-600",
          },
          {
            label: "Shipped Today",
            count: orders.filter(
              (o) =>
                o.status === "SHIPPED" &&
                new Date(o.orderDate).toDateString() === new Date().toDateString()
            ).length,
            color: "text-green-600",
          },
          {
            label: "Total Value",
            count: `$${orders
              .filter((o) => !["CANCELLED"].includes(o.status))
              .reduce((sum, o) => sum + o.total, 0)
              .toLocaleString()}`,
            color: "text-gray-800",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-center">{stat.count}</div>
              <div className="text-sm text-muted-foreground text-center">
                {stat.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} order{filteredOrders.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoading message="Loading orders..." />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders found"
              description="Create your first order to get started."
              actions={[{ label: "Create Order", onClick: () => setShowCreateDialog(true), icon: Plus }]}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer PO</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.customer.name}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{order.customerPO || "—"}</TableCell>
                    <TableCell>{order.lines.length} items</TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPDF(order.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendEmail(order.id)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Order</DialogTitle>
            <DialogDescription>Create a new customer order</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer PO</Label>
                <Input
                  value={customerPO}
                  onChange={(e) => setCustomerPO(e.target.value)}
                  placeholder="Customer reference..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requested Ship Date</Label>
                <Input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {orderLines.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded">
                  No items added. Click &quot;Add Item&quot; to start.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[120px]">Unit Price</TableHead>
                      <TableHead className="w-[100px]">Line Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.itemId}
                            onValueChange={(v) => updateLine(index, "itemId", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {itemsData?.items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.sku} - {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(index, "qty", parseInt(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(line.qty * line.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !customerId}
            >
              {createMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.customer.name}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Order Date</div>
                  <div className="font-medium">
                    {format(new Date(selectedOrder.orderDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Customer PO</div>
                  <div className="font-medium">{selectedOrder.customerPO || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Requested Date</div>
                  <div className="font-medium">
                    {selectedOrder.requestedDate
                      ? format(new Date(selectedOrder.requestedDate), "MMM d, yyyy")
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Ship To */}
              {selectedOrder.shipToAddress1 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Ship To</div>
                  <div className="p-3 border rounded text-sm">
                    <div className="font-medium">{selectedOrder.shipToName}</div>
                    <div>{selectedOrder.shipToAddress1}</div>
                    <div>
                      {selectedOrder.shipToCity}, {selectedOrder.shipToState}{" "}
                      {selectedOrder.shipToZip}
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Line Items</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Shipped</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-medium">{line.itemSku}</div>
                          <div className="text-sm text-muted-foreground">
                            {line.itemName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{line.qtyOrdered}</TableCell>
                        <TableCell className="text-right">{line.qtyAllocated}</TableCell>
                        <TableCell className="text-right">{line.qtyShipped}</TableCell>
                        <TableCell className="text-right">
                          ${line.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${line.lineTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${selectedOrder.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedOrder.status === "DRAFT" && (
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedOrder.id,
                        status: "CONFIRMED",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Confirm Order
                  </Button>
                )}
                {selectedOrder.status === "CONFIRMED" && (
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedOrder.id,
                        status: "PICKING",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Start Picking
                  </Button>
                )}
                {selectedOrder.status === "ALLOCATED" && (
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedOrder.id,
                        status: "SHIPPED",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark Shipped
                  </Button>
                )}
                <Button variant="outline" onClick={() => downloadPDF(selectedOrder.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => sendEmail(selectedOrder.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send to Customer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
