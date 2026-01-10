"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ScanBarcode,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Lot {
  id: string;
  lotNumber: string;
  batchNumber?: string;
  item: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
  };
  qtyProduced: number;
  qtyAvailable: number;
  qtyAllocated: number;
  uom: string;
  status: string;
  qcStatus: string;
  productionDate: string;
  expirationDate?: string;
  supplier?: {
    id: string;
    name: string;
  };
  productionOrder?: {
    id: string;
    orderNumber: string;
  };
  _count: {
    serialNumbers: number;
    inspections: number;
  };
  createdAt: string;
}

export default function LotsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [qcStatusFilter, setQCStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    itemId: "",
    lotNumber: "",
    qtyProduced: "",
    uom: "EA",
    productionDate: new Date().toISOString().split("T")[0],
    expirationDate: "",
    supplierId: "",
    batchNumber: "",
    notes: "",
  });

  // Fetch lots
  const { data: lotsData, isLoading } = useQuery<{ lots: Lot[] }>({
    queryKey: ["/api/quality/lots", statusFilter, qcStatusFilter, searchQuery],
  });

  // Fetch items for dropdown
  const { data: itemsData } = useQuery<{ items: any[] }>({
    queryKey: ["/api/items"],
  });

  // Create lot mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/quality/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create lot");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality/lots"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Lot created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      itemId: "",
      lotNumber: "",
      qtyProduced: "",
      uom: "EA",
      productionDate: new Date().toISOString().split("T")[0],
      expirationDate: "",
      supplierId: "",
      batchNumber: "",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!formData.itemId || !formData.lotNumber || !formData.qtyProduced) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      ...formData,
      qtyProduced: parseFloat(formData.qtyProduced),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      AVAILABLE: { variant: "default", icon: CheckCircle2, color: "text-green-600" },
      QUARANTINE: { variant: "secondary", icon: AlertCircle, color: "text-yellow-600" },
      HOLD: { variant: "destructive", icon: XCircle, color: "text-red-600" },
      CONSUMED: { variant: "outline", icon: Package, color: "text-gray-600" },
      EXPIRED: { variant: "destructive", icon: XCircle, color: "text-red-600" },
    };

    const config = variants[status] || variants.AVAILABLE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getQCStatusBadge = (qcStatus: string) => {
    const variants: Record<string, any> = {
      PASSED: { variant: "default", color: "bg-green-100 text-green-800" },
      FAILED: { variant: "destructive", color: "bg-red-100 text-red-800" },
      PENDING: { variant: "secondary", color: "bg-yellow-100 text-yellow-800" },
      CONDITIONAL: { variant: "outline", color: "bg-blue-100 text-blue-800" },
    };

    const config = variants[qcStatus] || variants.PENDING;

    return (
      <Badge variant={config.variant} className={config.color}>
        {qcStatus}
      </Badge>
    );
  };

  const filteredLots = lotsData?.lots?.filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.item.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || lot.status === statusFilter;
    const matchesQC = qcStatusFilter === "all" || lot.qcStatus === qcStatusFilter;

    return matchesSearch && matchesStatus && matchesQC;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lot Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage inventory lots with full traceability
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Lot
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by lot number, SKU, or item name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                  <SelectItem value="HOLD">Hold</SelectItem>
                  <SelectItem value="CONSUMED">Consumed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="qcStatus">QC Status</Label>
              <Select value={qcStatusFilter} onValueChange={setQCStatusFilter}>
                <SelectTrigger id="qcStatus" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All QC Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lots Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Lots</CardTitle>
          <CardDescription>{filteredLots.length} lots found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QC Status</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No lots found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/quality/lots/${lot.id}`}
                          className="hover:underline flex items-center gap-2"
                        >
                          <ScanBarcode className="h-4 w-4 text-muted-foreground" />
                          {lot.lotNumber}
                        </Link>
                        {lot.batchNumber && (
                          <div className="text-xs text-muted-foreground">
                            Batch: {lot.batchNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{lot.item.sku}</div>
                        <div className="text-sm text-muted-foreground">{lot.item.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {lot.qtyAvailable} / {lot.qtyProduced} {lot.uom}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lot._count.serialNumbers} serial numbers
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(lot.status)}</TableCell>
                      <TableCell>{getQCStatusBadge(lot.qcStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(lot.productionDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lot.expirationDate ? (
                          <div className="text-sm">
                            {new Date(lot.expirationDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/quality/lots/${lot.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Lot Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Lot</DialogTitle>
            <DialogDescription>
              Create a new lot for tracking and traceability
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemId">Item*</Label>
              <Select value={formData.itemId} onValueChange={(value) => setFormData({ ...formData, itemId: value })}>
                <SelectTrigger id="itemId">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {itemsData?.items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lotNumber">Lot Number*</Label>
                <Input
                  id="lotNumber"
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  placeholder="LOT-12345"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="BATCH-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qtyProduced">Quantity Produced*</Label>
                <Input
                  id="qtyProduced"
                  type="number"
                  value={formData.qtyProduced}
                  onChange={(e) => setFormData({ ...formData, qtyProduced: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="uom">UOM*</Label>
                <Select value={formData.uom} onValueChange={(value) => setFormData({ ...formData, uom: value })}>
                  <SelectTrigger id="uom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">EA (Each)</SelectItem>
                    <SelectItem value="FT">FT (Feet)</SelectItem>
                    <SelectItem value="YD">YD (Yards)</SelectItem>
                    <SelectItem value="ROLL">ROLL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="productionDate">Production Date*</Label>
                <Input
                  id="productionDate"
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Create Lot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
