"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeftRight,
  Search,
  RefreshCw,
  Plus,
  Truck,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";

interface Transfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: string;
  priority: string;
  createdAt: string;
  requestedDeliveryDate?: string;
  lines: Array<{
    itemSku: string;
    itemName: string;
    quantity: number;
  }>;
  trackingNumber?: string;
}

interface InTransitItem {
  itemId: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  transferId: string;
  sourceWarehouse: string;
  destinationWarehouse: string;
  eta?: string;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [inTransit, setInTransit] = useState<InTransitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("transfers");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchTransfers();
    fetchInTransit();
  }, []);

  async function fetchTransfers() {
    setLoading(true);
    try {
      const res = await fetch("/api/transfers");
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
      }
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInTransit() {
    try {
      const res = await fetch("/api/transfers?view=in-transit");
      if (res.ok) {
        const data = await res.json();
        setInTransit(data.inventory || []);
      }
    } catch (error) {
      console.error("Failed to fetch in-transit:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="outline" className="border-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "IN_TRANSIT":
        return <Badge className="bg-purple-500"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case "RECEIVED":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500">High</Badge>;
      case "NORMAL":
        return <Badge variant="outline">Normal</Badge>;
      case "LOW":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  }

  const filteredTransfers = transfers.filter((t) => {
    const matchesSearch =
      t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sourceWarehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destinationWarehouseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Transfers</h1>
          <p className="text-muted-foreground">
            Inter-facility stock movements and in-transit tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTransfers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Active Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {transfers.filter((t) => !["COMPLETED", "CANCELLED"].includes(t.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {transfers.filter((t) => t.status === "IN_TRANSIT").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Units In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {inTransit.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {transfers.filter((t) => t.status === "PENDING_APPROVAL").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transfer Orders
          </TabsTrigger>
          <TabsTrigger value="in-transit">
            <Truck className="h-4 w-4 mr-2" />
            In-Transit Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transfers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length > 0 ? (
                    filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-mono font-medium">
                          {transfer.transferNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {transfer.sourceWarehouseName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {transfer.destinationWarehouseName}
                          </div>
                        </TableCell>
                        <TableCell>{transfer.lines?.length || 0} items</TableCell>
                        <TableCell>{getPriorityBadge(transfer.priority)}</TableCell>
                        <TableCell>
                          {format(new Date(transfer.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No transfers found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-transit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-Transit Inventory</CardTitle>
              <CardDescription>Track items currently being transferred between warehouses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inTransit.length > 0 ? (
                    inTransit.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{item.itemSku}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell>{item.sourceWarehouse}</TableCell>
                        <TableCell>{item.destinationWarehouse}</TableCell>
                        <TableCell className="font-mono">{item.transferId}</TableCell>
                        <TableCell>
                          {item.eta ? format(new Date(item.eta), "MMM d") : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No items in transit
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Transfer Order</DialogTitle>
            <DialogDescription>
              Initiate a new inter-warehouse transfer
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">
              Transfer creation form would go here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
