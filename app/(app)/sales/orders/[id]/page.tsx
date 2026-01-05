"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  ClipboardList,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
  Ban,
  Play,
  Archive,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

type OrderStatus = "DRAFT" | "CONFIRMED" | "ALLOCATED" | "PICKING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type LineStatus = "OPEN" | "ALLOCATED" | "PICKING" | "PICKED" | "PACKED" | "SHIPPED" | "CANCELLED";

interface SalesOrderLine {
  id: string;
  lineNumber: number;
  item: { id: string; sku: string; name: string };
  description: string;
  qtyOrdered: number;
  qtyAllocated: number;
  qtyPicked: number;
  qtyShipped: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  status: LineStatus;
}

interface PickTask {
  id: string;
  taskNumber: string;
  status: string;
  priority: number;
  assignedTo?: { firstName: string; lastName: string };
  startedAt?: string;
  completedAt?: string;
  lines: Array<{
    id: string;
    qtyToPick: number;
    qtyPicked: number;
    status: string;
  }>;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  status: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  requiredDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  customer: {
    id: string;
    code: string;
    name: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  notes?: string;
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  lines: SalesOrderLine[];
  pickTasks: PickTask[];
  shipments: Shipment[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: <FileText className="h-4 w-4" /> },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" /> },
  ALLOCATED: { label: "Allocated", color: "bg-indigo-100 text-indigo-800", icon: <Archive className="h-4 w-4" /> },
  PICKING: { label: "Picking", color: "bg-yellow-100 text-yellow-800", icon: <ClipboardList className="h-4 w-4" /> },
  PACKED: { label: "Packed", color: "bg-orange-100 text-orange-800", icon: <Package className="h-4 w-4" /> },
  SHIPPED: { label: "Shipped", color: "bg-green-100 text-green-800", icon: <Truck className="h-4 w-4" /> },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="h-4 w-4" /> },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: <Ban className="h-4 w-4" /> },
};

const lineStatusColors: Record<LineStatus, string> = {
  OPEN: "bg-gray-100 text-gray-800",
  ALLOCATED: "bg-indigo-100 text-indigo-800",
  PICKING: "bg-yellow-100 text-yellow-800",
  PICKED: "bg-orange-100 text-orange-800",
  PACKED: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orderId = params.id as string;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: order, isLoading, error, refetch } = useQuery<SalesOrder>({
    queryKey: ["sales-order", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/sales/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
  });

  const confirmOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to confirm order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Confirmed", description: "Order has been confirmed and is ready for allocation." });
      queryClient.invalidateQueries({ queryKey: ["sales-order", orderId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const allocateOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/orders/${orderId}/allocate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to allocate inventory");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Inventory Allocated", 
        description: `Allocated ${data.allocatedCount} line(s) from available inventory.` 
      });
      queryClient.invalidateQueries({ queryKey: ["sales-order", orderId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createPickTask = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/orders/${orderId}/pick`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pick task");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Pick Task Created", 
        description: `Pick task ${data.taskNumber} created with ${data.lineCount} line(s).` 
      });
      queryClient.invalidateQueries({ queryKey: ["sales-order", orderId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Cancelled", description: "Order has been cancelled." });
      router.push("/sales/orders");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Order not found</p>
        <Button onClick={() => router.push("/sales/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[order.status];
  
  // Calculate fulfillment progress
  const totalOrdered = order.lines.reduce((sum, l) => sum + l.qtyOrdered, 0);
  const totalShipped = order.lines.reduce((sum, l) => sum + l.qtyShipped, 0);
  const fulfillmentPercent = totalOrdered > 0 ? Math.round((totalShipped / totalOrdered) * 100) : 0;

  // Determine available actions
  const canConfirm = order.status === "DRAFT";
  const canAllocate = order.status === "CONFIRMED";
  const canCreatePick = order.status === "ALLOCATED" && order.pickTasks.length === 0;
  const canCancel = ["DRAFT", "CONFIRMED"].includes(order.status);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/sales/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge className={statusInfo.color}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel order {order.orderNumber}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelOrder.mutate()}>
                    Cancel Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Workflow Actions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            Order Workflow
          </CardTitle>
          <CardDescription>Progress this order through the fulfillment pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {canConfirm && (
              <Button 
                onClick={() => confirmOrder.mutate()} 
                disabled={confirmOrder.isPending}
              >
                {confirmOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
            )}
            {canAllocate && (
              <Button 
                onClick={() => allocateOrder.mutate()} 
                disabled={allocateOrder.isPending}
              >
                {allocateOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Archive className="h-4 w-4 mr-2" />
                Allocate Inventory
              </Button>
            )}
            {canCreatePick && (
              <Button 
                onClick={() => createPickTask.mutate()} 
                disabled={createPickTask.isPending}
              >
                {createPickTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Pick Task
              </Button>
            )}
            {order.status === "PICKING" && (
              <Button variant="outline" disabled>
                <Package className="h-4 w-4 mr-2" />
                Awaiting Pick Completion
              </Button>
            )}
            {order.status === "PACKED" && (
              <Button onClick={() => router.push(`/sales/shipments?orderId=${order.id}`)}>
                <Truck className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            )}
            {["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status) && (
              <Badge variant="outline" className="py-2 px-4">
                Order Complete - No further actions available
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Lines */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Lines</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {order.lines.length} item(s) • {fulfillmentPercent}% fulfilled
                </div>
              </div>
              <Progress value={fulfillmentPercent} className="h-2" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Picked</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.lineNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.item.sku}</p>
                          <p className="text-sm text-muted-foreground">{line.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qtyOrdered} {line.uom}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qtyAllocated} {line.uom}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qtyPicked} {line.uom}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qtyShipped} {line.uom}
                      </TableCell>
                      <TableCell className="text-right">
                        ${line.totalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={lineStatusColors[line.status]} variant="secondary">
                          {line.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pick Tasks */}
          {order.pickTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Pick Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.pickTasks.map((task) => {
                    const totalToPick = task.lines.reduce((s, l) => s + l.qtyToPick, 0);
                    const totalPicked = task.lines.reduce((s, l) => s + l.qtyPicked, 0);
                    const pickPercent = totalToPick > 0 ? Math.round((totalPicked / totalToPick) * 100) : 0;
                    
                    return (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold">{task.taskNumber}</span>
                            <Badge variant="outline" className="ml-2">{task.status}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {pickPercent}% complete
                          </span>
                        </div>
                        <Progress value={pickPercent} className="h-2 mb-2" />
                        <div className="text-sm text-muted-foreground">
                          {task.assignedTo 
                            ? `Assigned to ${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                            : "Unassigned"
                          }
                          {task.lines.length > 0 && ` • ${task.lines.length} line(s)`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipments */}
          {order.shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{shipment.shipmentNumber}</span>
                          <Badge variant="outline" className="ml-2">{shipment.status}</Badge>
                        </div>
                        {shipment.trackingNumber && (
                          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {shipment.trackingNumber}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {shipment.carrier && <span>{shipment.carrier} • </span>}
                        {shipment.shippedAt && (
                          <span>Shipped {format(new Date(shipment.shippedAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">{order.customer.name}</p>
                <p className="text-sm text-muted-foreground">{order.customer.code}</p>
              </div>
              {order.customer.contactName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {order.customer.contactName}
                </div>
              )}
              {order.customer.contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">✉</span>
                  <a href={`mailto:${order.customer.contactEmail}`} className="text-primary hover:underline">
                    {order.customer.contactEmail}
                  </a>
                </div>
              )}
              {order.customer.contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">☎</span>
                  {order.customer.contactPhone}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/sales/customers/${order.customer.id}`)}
              >
                View Customer
              </Button>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ship To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
              </p>
              <p>{order.shippingAddress.country}</p>
            </CardContent>
          </Card>

          {/* Order Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Date</span>
                <span>{format(new Date(order.orderDate), "MMM d, yyyy")}</span>
              </div>
              {order.requiredDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required By</span>
                  <span>{format(new Date(order.requiredDate), "MMM d, yyyy")}</span>
                </div>
              )}
              {order.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{format(new Date(order.approvedAt), "MMM d, yyyy")}</span>
                </div>
              )}
              {order.shippedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipped</span>
                  <span>{format(new Date(order.shippedDate), "MMM d, yyyy")}</span>
                </div>
              )}
              {order.deliveredDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivered</span>
                  <span>{format(new Date(order.deliveredDate), "MMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Total */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Order Total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>${order.shippingAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${order.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Info */}
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-1">
              {order.createdBy && (
                <p>Created by {order.createdBy.firstName} {order.createdBy.lastName}</p>
              )}
              {order.approvedBy && (
                <p>Approved by {order.approvedBy.firstName} {order.approvedBy.lastName}</p>
              )}
              <p>Last updated {format(new Date(order.updatedAt), "MMM d, yyyy h:mm a")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
