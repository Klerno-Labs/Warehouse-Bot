import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Factory, Plus, Send, Play, CheckCircle, Package, BarChart3 } from "lucide-react";

type ProductionOrderStatus =
  | "PLANNED"
  | "RELEASED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED";
type UOM = "EA" | "FT" | "YD" | "ROLL";

type Item = {
  id: string;
  code: string;
  description: string;
  baseUom: UOM;
};

type BOM = {
  id: string;
  bomNumber: string;
  version: number;
  status: string;
  item: Item;
};

type Site = {
  id: string;
  code: string;
  name: string;
};

type Workcell = {
  id: string;
  code: string;
  name: string;
};

type Location = {
  id: string;
  code: string;
  name: string;
};

type ProductionOrder = {
  id: string;
  orderNumber: string;
  status: ProductionOrderStatus;
  item: Item;
  bom: BOM;
  site: Site;
  workcell?: Workcell;
  qtyOrdered: number;
  qtyCompleted: number;
  qtyRejected: number;
  uom: UOM;
  scheduledStart: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  lotNumber?: string;
  batchNumber?: string;
  priority: number;
  notes?: string;
  _count?: {
    consumptions: number;
    outputs: number;
  };
  createdAt: string;
};

type ProductionOrdersResponse = {
  orders: ProductionOrder[];
};

type BOMsResponse = {
  boms: BOM[];
};

type SitesResponse = {
  sites: Site[];
};

type WorkcellsResponse = {
  workcells: Workcell[];
};

type LocationsResponse = {
  locations: Location[];
};

export default function ProductionOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | "ALL">("ALL");
  const [siteFilter, setSiteFilter] = useState<string>("ALL");

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    siteId: "",
    bomId: "",
    orderNumber: "",
    itemId: "",
    qtyOrdered: 1,
    uom: "EA" as UOM,
    scheduledStart: new Date().toISOString().split("T")[0],
    scheduledEnd: "",
    workcellId: "",
    lotNumber: "",
    batchNumber: "",
    priority: 5,
    notes: "",
  });

  // Execution form state
  const [consumptionData, setConsumptionData] = useState({
    itemId: "",
    qtyConsumed: 0,
    uom: "EA" as UOM,
    fromLocationId: "",
    lotNumber: "",
    serialNumber: "",
    isScrap: false,
    notes: "",
  });

  const [outputData, setOutputData] = useState({
    qtyProduced: 0,
    qtyRejected: 0,
    toLocationId: "",
    lotNumber: "",
    batchNumber: "",
    expirationDate: "",
    notes: "",
  });

  // Fetch production orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery<ProductionOrdersResponse>({
    queryKey: ["production-orders"],
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/production-orders");
      if (!res.ok) throw new Error("Failed to fetch production orders");
      return res.json();
    },
  });

  // Fetch BOMs (active only)
  const { data: bomsData } = useQuery<BOMsResponse>({
    queryKey: ["boms", "ACTIVE"],
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/boms?status=ACTIVE");
      if (!res.ok) throw new Error("Failed to fetch BOMs");
      return res.json();
    },
  });

  // Fetch sites
  const { data: sitesData } = useQuery<SitesResponse>({
    queryKey: ["sites"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sites");
      if (!res.ok) throw new Error("Failed to fetch sites");
      return res.json();
    },
  });

  // Fetch workcells
  const { data: workcellsData } = useQuery<WorkcellsResponse>({
    queryKey: ["workcells"],
    queryFn: async () => {
      const res = await fetch("/api/admin/workcells");
      if (!res.ok) throw new Error("Failed to fetch workcells");
      return res.json();
    },
  });

  // Fetch locations
  const { data: locationsData } = useQuery<LocationsResponse>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  const orders = ordersData?.orders || [];
  const boms = bomsData?.boms || [];
  const sites = sitesData?.sites || [];
  const workcells = workcellsData?.workcells || [];
  const locations = locationsData?.locations || [];

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
    if (siteFilter !== "ALL" && order.site.id !== siteFilter) return false;
    return true;
  });

  const handleBOMChange = (bomId: string) => {
    const selectedBOM = boms.find((b) => b.id === bomId);
    if (selectedBOM) {
      setFormData({
        ...formData,
        bomId,
        itemId: selectedBOM.item.id,
        uom: selectedBOM.item.baseUom,
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!formData.siteId || !formData.bomId || !formData.orderNumber) {
      toast({
        title: "Validation Error",
        description: "Site, BOM, and order number are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/manufacturing/production-orders", formData);

      toast({
        title: "Success",
        description: "Production order created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create production order",
        variant: "destructive",
      });
    }
  };

  const handleReleaseOrder = async (orderId: string) => {
    try {
      await apiRequest("POST", `/api/manufacturing/production-orders/${orderId}/release`);

      toast({
        title: "Success",
        description: "Production order released for execution",
      });

      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to release production order",
        variant: "destructive",
      });
    }
  };

  const handleBackflush = async (orderId: string, qtyProduced: number, fromLocationId: string) => {
    try {
      await apiRequest("POST", `/api/manufacturing/production-orders/${orderId}/backflush`, {
        qtyProduced,
        fromLocationId,
      });

      toast({
        title: "Success",
        description: "Components backflushed successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to backflush components",
        variant: "destructive",
      });
    }
  };

  const handleManualConsume = async () => {
    if (!selectedOrder || !consumptionData.itemId || !consumptionData.fromLocationId) {
      toast({
        title: "Validation Error",
        description: "Item and location are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", `/api/manufacturing/production-orders/${selectedOrder.id}/consume`, consumptionData);

      toast({
        title: "Success",
        description: "Component consumed successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      setIsExecuteDialogOpen(false);
      setConsumptionData({
        itemId: "",
        qtyConsumed: 0,
        uom: "EA" as UOM,
        fromLocationId: "",
        lotNumber: "",
        serialNumber: "",
        isScrap: false,
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to consume component",
        variant: "destructive",
      });
    }
  };

  const handleRecordOutput = async () => {
    if (!selectedOrder || !outputData.toLocationId) {
      toast({
        title: "Validation Error",
        description: "Location is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", `/api/manufacturing/production-orders/${selectedOrder.id}/output`, outputData);

      toast({
        title: "Success",
        description: "Production output recorded successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      setIsOutputDialogOpen(false);
      setOutputData({
        qtyProduced: 0,
        qtyRejected: 0,
        toLocationId: "",
        lotNumber: "",
        batchNumber: "",
        expirationDate: "",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record output",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      siteId: "",
      bomId: "",
      orderNumber: "",
      itemId: "",
      qtyOrdered: 1,
      uom: "EA" as UOM,
      scheduledStart: new Date().toISOString().split("T")[0],
      scheduledEnd: "",
      workcellId: "",
      lotNumber: "",
      batchNumber: "",
      priority: 5,
      notes: "",
    });
  };

  const getStatusBadgeVariant = (status: ProductionOrderStatus) => {
    switch (status) {
      case "PLANNED":
        return "secondary";
      case "RELEASED":
        return "outline";
      case "IN_PROGRESS":
        return "default";
      case "COMPLETED":
        return "default";
      case "CLOSED":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getProgressPercentage = (order: ProductionOrder) => {
    if (order.qtyOrdered === 0) return 0;
    return Math.round(((order.qtyCompleted + order.qtyRejected) / order.qtyOrdered) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Orders</h1>
          <p className="text-muted-foreground">
            Manage manufacturing execution and production tracking
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Production Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Production Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site *</Label>
                  <Select
                    value={formData.siteId}
                    onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.code} - {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>BOM *</Label>
                  <Select value={formData.bomId} onValueChange={handleBOMChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map((bom) => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.bomNumber} v{bom.version} - {bom.item.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Order Number *</Label>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="PO-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity Ordered *</Label>
                  <Input
                    type="number"
                    value={formData.qtyOrdered}
                    onChange={(e) =>
                      setFormData({ ...formData, qtyOrdered: parseFloat(e.target.value) })
                    }
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority (1-10)</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) })
                    }
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled Start *</Label>
                  <Input
                    type="date"
                    value={formData.scheduledStart}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled End</Label>
                  <Input
                    type="date"
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workcell</Label>
                  <Select
                    value={formData.workcellId}
                    onValueChange={(value) => setFormData({ ...formData, workcellId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workcell (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {workcells.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id}>
                          {wc.code} - {wc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number</Label>
                  <Input
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrder}>Create Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ProductionOrderStatus | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="RELEASED">Released</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.code} - {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No production orders found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>BOM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Qty Ordered</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Scheduled Start</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      {order.item.code} - {order.item.description}
                    </TableCell>
                    <TableCell>
                      {order.bom.bomNumber} v{order.bom.version}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getProgressPercentage(order)}%</TableCell>
                    <TableCell>
                      {order.qtyOrdered} {order.uom}
                    </TableCell>
                    <TableCell>{order.qtyCompleted}</TableCell>
                    <TableCell>{order.qtyRejected}</TableCell>
                    <TableCell>
                      {new Date(order.scheduledStart).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.priority}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.status === "PLANNED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReleaseOrder(order.id)}
                            title="Release for execution"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {["RELEASED", "IN_PROGRESS"].includes(order.status) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsExecuteDialogOpen(true);
                              }}
                              title="Execute - consume materials"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setOutputData({
                                  ...outputData,
                                  lotNumber: order.lotNumber || "",
                                  batchNumber: order.batchNumber || "",
                                });
                                setIsOutputDialogOpen(true);
                              }}
                              title="Record output"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execute Dialog - Consume Materials */}
      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Execute Order {selectedOrder?.orderNumber} - Consume Materials
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Item:</strong> {selectedOrder?.item.code} -{" "}
                {selectedOrder?.item.description}
              </p>
              <p className="text-sm">
                <strong>Qty Ordered:</strong> {selectedOrder?.qtyOrdered}{" "}
                {selectedOrder?.uom}
              </p>
              <p className="text-sm">
                <strong>Completed:</strong> {selectedOrder?.qtyCompleted} |{" "}
                <strong>Rejected:</strong> {selectedOrder?.qtyRejected}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Manual Component Consumption</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Component Item *</Label>
                  <Select
                    value={consumptionData.itemId}
                    onValueChange={(value) =>
                      setConsumptionData({ ...consumptionData, itemId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrder?.bom.item && (
                        <SelectItem value={selectedOrder.bom.item.id}>
                          {selectedOrder.bom.item.code} -{" "}
                          {selectedOrder.bom.item.description}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity Consumed *</Label>
                  <Input
                    type="number"
                    value={consumptionData.qtyConsumed}
                    onChange={(e) =>
                      setConsumptionData({
                        ...consumptionData,
                        qtyConsumed: parseFloat(e.target.value),
                      })
                    }
                    min={0.01}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Location *</Label>
                  <Select
                    value={consumptionData.fromLocationId}
                    onValueChange={(value) =>
                      setConsumptionData({ ...consumptionData, fromLocationId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.code} - {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lot Number</Label>
                  <Input
                    value={consumptionData.lotNumber}
                    onChange={(e) =>
                      setConsumptionData({ ...consumptionData, lotNumber: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsExecuteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualConsume}>Consume</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Output Dialog - Record Production */}
      <Dialog open={isOutputDialogOpen} onOpenChange={setIsOutputDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Record Output for Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Item:</strong> {selectedOrder?.item.code} -{" "}
                {selectedOrder?.item.description}
              </p>
              <p className="text-sm">
                <strong>Qty Ordered:</strong> {selectedOrder?.qtyOrdered}{" "}
                {selectedOrder?.uom}
              </p>
              <p className="text-sm">
                <strong>Already Completed:</strong> {selectedOrder?.qtyCompleted} |{" "}
                <strong>Already Rejected:</strong> {selectedOrder?.qtyRejected}
              </p>
              <p className="text-sm">
                <strong>Remaining:</strong>{" "}
                {selectedOrder
                  ? selectedOrder.qtyOrdered -
                    selectedOrder.qtyCompleted -
                    selectedOrder.qtyRejected
                  : 0}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Produced</Label>
                <Input
                  type="number"
                  value={outputData.qtyProduced}
                  onChange={(e) =>
                    setOutputData({
                      ...outputData,
                      qtyProduced: parseFloat(e.target.value),
                    })
                  }
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity Rejected</Label>
                <Input
                  type="number"
                  value={outputData.qtyRejected}
                  onChange={(e) =>
                    setOutputData({
                      ...outputData,
                      qtyRejected: parseFloat(e.target.value),
                    })
                  }
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>To Location *</Label>
              <Select
                value={outputData.toLocationId}
                onValueChange={(value) =>
                  setOutputData({ ...outputData, toLocationId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lot Number</Label>
                <Input
                  value={outputData.lotNumber}
                  onChange={(e) =>
                    setOutputData({ ...outputData, lotNumber: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={outputData.batchNumber}
                  onChange={(e) =>
                    setOutputData({ ...outputData, batchNumber: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={outputData.notes}
                onChange={(e) => setOutputData({ ...outputData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOutputDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordOutput}>Record Output</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
