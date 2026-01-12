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
import { ShoppingCart, Plus, Trash2, FileText, Check, Send, Package } from "lucide-react";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";

type POStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
type UOM = "EA" | "FT" | "YD" | "ROLL";

type Supplier = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type Item = {
  id: string;
  code: string;
  description: string;
  baseUom: UOM;
};

type POLine = {
  id?: string;
  itemId: string;
  lineNumber: number;
  description?: string;
  qtyOrdered: number;
  uom: UOM;
  unitPrice: number;
  lineTotal: number;
  qtyReceived?: number;
  status?: string;
  item?: Item;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: POStatus;
  orderDate: string;
  expectedDelivery: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  supplier: Supplier;
  lines: POLine[];
  createdAt: string;
};

type PurchaseOrdersResponse = {
  purchaseOrders: PurchaseOrder[];
};

type SuppliersResponse = {
  suppliers: Supplier[];
};

type ItemsResponse = {
  items: Item[];
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type LocationsResponse = {
  locations: Location[];
};

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<POStatus | "ALL">("ALL");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);

  // Receive form state
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  // Create PO form state
  const [supplierId, setSupplierId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
  if (supplierFilter !== "ALL") queryParams.set("supplierId", supplierFilter);

  const { data: poData, isLoading: poLoading } = useQuery<PurchaseOrdersResponse>({
    queryKey: ["/api/purchasing/purchase-orders", { status: statusFilter, supplier: supplierFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/purchasing/purchase-orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      return res.json();
    },
  });

  const { data: suppliersData } = useQuery<SuppliersResponse>({
    queryKey: ["/api/purchasing/suppliers", { activeOnly: true }],
    queryFn: async () => {
      const res = await fetch("/api/purchasing/suppliers?activeOnly=true");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  const { data: itemsData } = useQuery<ItemsResponse>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const { data: locationsData } = useQuery<LocationsResponse>({
    queryKey: ["/api/inventory/locations"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  const purchaseOrders = poData?.purchaseOrders || [];
  const suppliers = suppliersData?.suppliers || [];
  const items = itemsData?.items || [];
  const locations = locationsData?.locations || [];

  const resetForm = () => {
    setSupplierId("");
    setPoNumber("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setExpectedDelivery("");
    setNotes("");
    setLines([]);
  };

  const addLine = () => {
    const newLineNumber = lines.length > 0 ? Math.max(...lines.map(l => l.lineNumber)) + 1 : 1;
    setLines([
      ...lines,
      {
        itemId: "",
        lineNumber: newLineNumber,
        description: "",
        qtyOrdered: 1,
        uom: "EA" as UOM,
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  };

  const updateLine = (index: number, updates: Partial<POLine>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };

    // Auto-calculate line total
    if (updates.qtyOrdered !== undefined || updates.unitPrice !== undefined) {
      newLines[index].lineTotal = newLines[index].qtyOrdered * newLines[index].unitPrice;
    }

    // Auto-fill description from item if item changes
    if (updates.itemId) {
      const item = items.find(i => i.id === updates.itemId);
      if (item && !newLines[index].description) {
        newLines[index].description = item.description;
        newLines[index].uom = item.baseUom;
      }
    }

    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0);
  };

  const handleCreate = async () => {
    if (!supplierId || !poNumber || lines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and add at least one line",
        variant: "destructive",
      });
      return;
    }

    // Validate all lines have items
    if (lines.some(l => !l.itemId)) {
      toast({
        title: "Validation Error",
        description: "All lines must have an item selected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/purchasing/purchase-orders", {
        supplierId,
        poNumber: poNumber.trim(),
        orderDate,
        expectedDelivery: expectedDelivery || undefined,
        notes: notes || undefined,
        lines: lines.map(line => ({
          itemId: line.itemId,
          lineNumber: line.lineNumber,
          description: line.description || undefined,
          qtyOrdered: line.qtyOrdered,
          uom: line.uom,
          unitPrice: line.unitPrice,
          expectedDelivery: undefined,
          notes: undefined,
        })),
      });

      toast({
        title: "Success",
        description: `Purchase order ${poNumber} created successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/purchasing/purchase-orders"] });
      setIsCreateOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (po: PurchaseOrder, newStatus: POStatus) => {
    try {
      await apiRequest("PUT", `/api/purchasing/purchase-orders/${po.id}`, {
        status: newStatus,
      });

      toast({
        title: "Success",
        description: `PO ${po.poNumber} updated to ${newStatus}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/purchasing/purchase-orders"] });
      if (selectedPO?.id === po.id) {
        setSelectedPO({ ...po, status: newStatus });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (po: PurchaseOrder) => {
    if (po.status !== "DRAFT") {
      toast({
        title: "Error",
        description: "Can only delete draft purchase orders",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Delete PO ${po.poNumber}?`)) return;

    try {
      await apiRequest("DELETE", `/api/purchasing/purchase-orders/${po.id}`, undefined);

      toast({
        title: "Success",
        description: `PO ${po.poNumber} deleted`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/purchasing/purchase-orders"] });
      setIsDetailOpen(false);
      setSelectedPO(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive",
      });
    }
  };

  const openReceiveDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReceiptNumber(`RCV-${Date.now()}`);
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setLocationId("");
    setReceiveLines({});
    setReceiveNotes("");
    setIsReceiveOpen(true);
  };

  const handleReceive = async () => {
    if (!selectedPO || !receiptNumber || !locationId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const lines = Object.entries(receiveLines)
      .filter(([_, qty]) => qty > 0)
      .map(([lineId, qty]) => ({
        purchaseOrderLineId: lineId,
        qtyReceived: qty,
      }));

    if (lines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter quantities to receive",
        variant: "destructive",
      });
      return;
    }

    setIsReceiving(true);
    try {
      await apiRequest("POST", `/api/purchasing/purchase-orders/${selectedPO.id}/receive`, {
        receiptNumber: receiptNumber.trim(),
        receiptDate,
        locationId,
        notes: receiveNotes || undefined,
        lines,
      });

      toast({
        title: "Success",
        description: `Receipt ${receiptNumber} created successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/purchasing/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchasing/receipts"] });
      setIsReceiveOpen(false);
      setIsDetailOpen(false);
      setSelectedPO(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to receive items",
        variant: "destructive",
      });
    } finally {
      setIsReceiving(false);
    }
  };

  const getStatusBadge = (status: POStatus) => {
    const variants: Record<POStatus, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: "outline",
      PENDING_APPROVAL: "secondary",
      APPROVED: "default",
      SENT: "default",
      PARTIALLY_RECEIVED: "secondary",
      RECEIVED: "default",
      CANCELLED: "destructive",
    };

    return <Badge variant={variants[status]}>{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="poNumber">PO Number *</Label>
                  <Input
                    id="poNumber"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="PO-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items *</Label>
                  <Button onClick={addLine} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Line
                  </Button>
                </div>

                {lines.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No line items"
                    description="Click 'Add Line' to add items to this order."
                    compact
                  />
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Qty</TableHead>
                          <TableHead className="w-[80px]">UOM</TableHead>
                          <TableHead className="w-[120px]">Unit Price</TableHead>
                          <TableHead className="w-[120px]">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell>{line.lineNumber}</TableCell>
                            <TableCell>
                              <Select
                                value={line.itemId}
                                onValueChange={(value) => updateLine(index, { itemId: value })}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={line.description || ""}
                                onChange={(e) => updateLine(index, { description: e.target.value })}
                                placeholder="Description"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.qtyOrdered}
                                onChange={(e) => updateLine(index, { qtyOrdered: parseFloat(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={line.uom}
                                onValueChange={(value) => updateLine(index, { uom: value as UOM })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EA">EA</SelectItem>
                                  <SelectItem value="FT">FT</SelectItem>
                                  <SelectItem value="YD">YD</SelectItem>
                                  <SelectItem value="ROLL">ROLL</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell>${line.lineTotal.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {lines.length > 0 && (
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      Subtotal: ${calculateSubtotal().toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Purchase Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Purchase Orders</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as POStatus | "ALL")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {poLoading ? (
            <InlineLoading message="Loading purchase orders..." />
          ) : purchaseOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No purchase orders"
              description="Create a purchase order to start procuring inventory."
              actions={[{ label: "Create PO", onClick: () => setIsCreateDialogOpen(true), icon: Plus }]}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedPO(po);
                      setIsDetailOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.supplier.name}</TableCell>
                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.expectedDelivery
                        ? new Date(po.expectedDelivery).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">${po.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPO(po);
                          setIsDetailOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PO Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPO && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Purchase Order {selectedPO.poNumber}</DialogTitle>
                  {getStatusBadge(selectedPO.status)}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Supplier</Label>
                    <div className="font-medium">{selectedPO.supplier.name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PO Number</Label>
                    <div className="font-medium">{selectedPO.poNumber}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Order Date</Label>
                    <div>{new Date(selectedPO.orderDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expected Delivery</Label>
                    <div>
                      {selectedPO.expectedDelivery
                        ? new Date(selectedPO.expectedDelivery).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                </div>

                {selectedPO.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">{selectedPO.notes}</div>
                  </div>
                )}

                <div>
                  <Label className="text-lg font-semibold">Line Items</Label>
                  <div className="mt-2 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty Ordered</TableHead>
                          <TableHead>Qty Received</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.lineNumber}</TableCell>
                            <TableCell>{line.item?.code}</TableCell>
                            <TableCell>{line.description || line.item?.description}</TableCell>
                            <TableCell>{line.qtyOrdered}</TableCell>
                            <TableCell>{line.qtyReceived || 0}</TableCell>
                            <TableCell>{line.uom}</TableCell>
                            <TableCell className="text-right">${line.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${line.lineTotal.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="space-y-1 text-right">
                    <div>Subtotal: ${selectedPO.subtotal.toFixed(2)}</div>
                    <div>Tax: ${selectedPO.tax.toFixed(2)}</div>
                    <div>Shipping: ${selectedPO.shipping.toFixed(2)}</div>
                    <div className="text-lg font-bold">Total: ${selectedPO.total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    {selectedPO.status === "DRAFT" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange(selectedPO, "PENDING_APPROVAL")}
                        >
                          <Send className="mr-2 h-4 w-4" /> Submit for Approval
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(selectedPO)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </>
                    )}
                    {selectedPO.status === "PENDING_APPROVAL" && (
                      <Button
                        onClick={() => handleStatusChange(selectedPO, "APPROVED")}
                      >
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                    )}
                    {selectedPO.status === "APPROVED" && (
                      <Button
                        onClick={() => handleStatusChange(selectedPO, "SENT")}
                      >
                        <Send className="mr-2 h-4 w-4" /> Mark as Sent
                      </Button>
                    )}
                    {(selectedPO.status === "SENT" || selectedPO.status === "PARTIALLY_RECEIVED" || selectedPO.status === "APPROVED") && (
                      <Button onClick={() => openReceiveDialog(selectedPO)}>
                        <Package className="mr-2 h-4 w-4" /> Receive Items
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPO && (
            <>
              <DialogHeader>
                <DialogTitle>Receive Items - PO {selectedPO.poNumber}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="receiptNumber">Receipt Number *</Label>
                    <Input
                      id="receiptNumber"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="RCV-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="receiptDate">Receipt Date *</Label>
                    <Input
                      id="receiptDate"
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="location">Receiving Location *</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger id="location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.code} - {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Items to Receive</Label>
                  <div className="mt-2 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Ordered</TableHead>
                          <TableHead>Already Received</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Receive Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.lines.map((line) => {
                          const remaining = line.qtyOrdered - (line.qtyReceived || 0);
                          return (
                            <TableRow key={line.id}>
                              <TableCell>{line.item?.code}</TableCell>
                              <TableCell>{line.description || line.item?.description}</TableCell>
                              <TableCell>{line.qtyOrdered}</TableCell>
                              <TableCell>{line.qtyReceived || 0}</TableCell>
                              <TableCell>{remaining}</TableCell>
                              <TableCell>{line.uom}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  step="0.01"
                                  value={receiveLines[line.id!] || ""}
                                  onChange={(e) => {
                                    const qty = parseFloat(e.target.value) || 0;
                                    setReceiveLines({
                                      ...receiveLines,
                                      [line.id!]: qty,
                                    });
                                  }}
                                  placeholder="0"
                                  className="w-24"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <Label htmlFor="receiveNotes">Notes</Label>
                  <Textarea
                    id="receiveNotes"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleReceive} disabled={isReceiving}>
                    {isReceiving ? "Receiving..." : "Receive Items"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
