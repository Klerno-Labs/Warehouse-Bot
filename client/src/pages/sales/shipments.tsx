"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Search,
  Eye,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  FileText,
  Printer,
  ExternalLink,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ShipmentLine {
  id: string;
  salesOrderLineId: string;
  itemId: string;
  item: { sku: string; name: string };
  qtyShipped: number;
  lotNumber?: string;
  serialNumbers?: string[];
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  salesOrder: {
    orderNumber: string;
    customer: { code: string; name: string };
  };
  shipDate: string;
  carrier?: string;
  trackingNumber?: string;
  status: string;
  weight?: number;
  shipToName?: string;
  shipToAddress1?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;
  notes?: string;
  lines: ShipmentLine[];
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: { name: string };
  status: string;
  lines: { id: string; itemId: string; item: { sku: string; name: string }; qtyOrdered: number; qtyShipped: number }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  PACKED: { label: "Packed", color: "bg-blue-500", icon: Package },
  SHIPPED: { label: "Shipped", color: "bg-green-500", icon: Truck },
  DELIVERED: { label: "Delivered", color: "bg-green-700", icon: CheckCircle2 },
};

const CARRIERS = [
  { value: "FEDEX", label: "FedEx" },
  { value: "UPS", label: "UPS" },
  { value: "USPS", label: "USPS" },
  { value: "DHL", label: "DHL" },
  { value: "OTHER", label: "Other" },
];

export default function ShipmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [formData, setFormData] = useState({
    carrier: "",
    trackingNumber: "",
    weight: 0,
    notes: "",
    lines: [] as { salesOrderLineId: string; qtyShipped: number }[],
  });

  // Fetch shipments
  const { data: shipmentsData, isLoading } = useQuery<{ shipments: Shipment[] }>({
    queryKey: ["/api/sales/shipments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/sales/shipments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shipments");
      return res.json();
    },
  });

  // Fetch orders that can be shipped
  const { data: ordersData } = useQuery<{ orders: SalesOrder[] }>({
    queryKey: ["/api/sales/orders", "shippable"],
    queryFn: async () => {
      const res = await fetch("/api/sales/orders?status=ALLOCATED&status=PICKING");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { salesOrderId: string } & typeof formData) =>
      apiRequest("POST", "/api/sales/shipments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      toast({ title: "Success", description: "Shipment created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shipment",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, trackingNumber }: { id: string; status: string; trackingNumber?: string }) =>
      apiRequest("PUT", `/api/sales/shipments/${id}`, { status, trackingNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/shipments"] });
      toast({ title: "Success", description: "Shipment updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipment",
        variant: "destructive",
      });
    },
  });

  const shipments = shipmentsData?.shipments || [];
  const orders = ordersData?.orders || [];

  const filteredShipments = shipments.filter(
    (shipment) =>
      shipment.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.salesOrder.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.salesOrder.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      carrier: "",
      trackingNumber: "",
      weight: 0,
      notes: "",
      lines: [],
    });
    setSelectedOrderId("");
    setSelectedShipment(null);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setFormData({
        ...formData,
        lines: order.lines
          .filter((line) => line.qtyOrdered > line.qtyShipped)
          .map((line) => ({
            salesOrderLineId: line.id,
            qtyShipped: line.qtyOrdered - line.qtyShipped,
          })),
      });
    }
  };

  const updateLineQty = (lineId: string, qty: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.map((line) =>
        line.salesOrderLineId === lineId ? { ...line, qtyShipped: qty } : line
      ),
    });
  };

  const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
    if (!carrier || !trackingNumber) return null;
    const urls: Record<string, string> = {
      FEDEX: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    };
    return urls[carrier];
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Shipments</h1>
            <p className="text-muted-foreground">
              Track and manage order shipments
            </p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {shipments.filter((s) => s.status === "PENDING").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {shipments.filter((s) => s.status === "PACKED").length}
            </div>
            <p className="text-sm text-muted-foreground">Packed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {shipments.filter((s) => s.status === "SHIPPED").length}
            </div>
            <p className="text-sm text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {shipments.filter((s) => s.status === "DELIVERED").length}
            </div>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shipments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <CardDescription>
            {filteredShipments.length} shipment{filteredShipments.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shipments found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Ship Date</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => {
                  const status = statusConfig[shipment.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  const trackingUrl = getTrackingUrl(shipment.carrier, shipment.trackingNumber);
                  return (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">
                        {shipment.shipmentNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {shipment.salesOrder.orderNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>{shipment.salesOrder.customer.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(shipment.shipDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{shipment.carrier || "—"}</TableCell>
                      <TableCell>
                        {shipment.trackingNumber ? (
                          trackingUrl ? (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              {shipment.trackingNumber}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            shipment.trackingNumber
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {shipment.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: shipment.id,
                                  status: "PACKED",
                                })
                              }
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
                          {shipment.status === "PACKED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: shipment.id,
                                  status: "SHIPPED",
                                })
                              }
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Shipment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shipment</DialogTitle>
            <DialogDescription>Ship items from a sales order</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Selection */}
            <div className="space-y-2">
              <Label>Select Order *</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order to ship" />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No orders ready for shipping
                    </SelectItem>
                  ) : (
                    orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customer.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Carrier & Tracking */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(value) =>
                    setFormData({ ...formData, carrier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={formData.trackingNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, trackingNumber: e.target.value })
                  }
                  placeholder="1Z999AA..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Weight (lbs)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight || ""}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.0"
              />
            </div>

            {/* Line Items */}
            {selectedOrder && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Items to Ship</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Already Shipped</TableHead>
                      <TableHead className="text-right">Qty to Ship</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.lines
                      .filter((line) => line.qtyOrdered > line.qtyShipped)
                      .map((line) => {
                        const formLine = formData.lines.find(
                          (l) => l.salesOrderLineId === line.id
                        );
                        const remaining = line.qtyOrdered - line.qtyShipped;
                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                              {line.item.sku} - {line.item.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.qtyOrdered}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.qtyShipped}
                            </TableCell>
                            <TableCell className="text-right w-[120px]">
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                value={formLine?.qtyShipped || 0}
                                onChange={(e) =>
                                  updateLineQty(
                                    line.id,
                                    Math.min(parseInt(e.target.value) || 0, remaining)
                                  )
                                }
                                className="w-20 text-right"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Shipping notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({ salesOrderId: selectedOrderId, ...formData })
              }
              disabled={
                createMutation.isPending ||
                !selectedOrderId ||
                formData.lines.every((l) => l.qtyShipped === 0)
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shipment {selectedShipment?.shipmentNumber}</DialogTitle>
            <DialogDescription>
              Order: {selectedShipment?.salesOrder.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ship Date</p>
                  <p className="font-medium">
                    {new Date(selectedShipment.shipDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carrier</p>
                  <p className="font-medium">{selectedShipment.carrier || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedShipment.status]?.color}>
                    {statusConfig[selectedShipment.status]?.label}
                  </Badge>
                </div>
                {selectedShipment.trackingNumber && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-medium">{selectedShipment.trackingNumber}</p>
                  </div>
                )}
                {selectedShipment.weight && (
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{selectedShipment.weight} lbs</p>
                  </div>
                )}
              </div>

              {/* Ship To Address */}
              {selectedShipment.shipToName && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ship To
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <p>{selectedShipment.shipToName}</p>
                    <p>{selectedShipment.shipToAddress1}</p>
                    <p>
                      {selectedShipment.shipToCity}, {selectedShipment.shipToState}{" "}
                      {selectedShipment.shipToZip}
                    </p>
                  </div>
                </div>
              )}

              {/* Shipped Items */}
              <div>
                <h4 className="font-semibold mb-2">Shipped Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Shipped</TableHead>
                      <TableHead>Lot #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedShipment.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          {line.item.sku} - {line.item.name}
                        </TableCell>
                        <TableCell className="text-right">{line.qtyShipped}</TableCell>
                        <TableCell>{line.lotNumber || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedShipment.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedShipment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print Packing Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
