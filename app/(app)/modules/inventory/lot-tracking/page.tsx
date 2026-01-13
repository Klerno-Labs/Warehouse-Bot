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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Calendar,
  Package,
  QrCode,
  RefreshCw,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  History,
  FileWarning,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Lot {
  id: string;
  lotNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  status: "AVAILABLE" | "QUARANTINE" | "EXPIRED" | "CONSUMED";
  expirationDate?: string;
  manufacturingDate?: string;
  supplierName?: string;
  receivedDate: string;
  notes?: string;
}

interface SerialNumber {
  id: string;
  serialNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  lotId?: string;
  status: "AVAILABLE" | "SOLD" | "RESERVED" | "QUARANTINE";
  locationCode?: string;
}

export default function LotTrackingPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [expiringLots, setExpiringLots] = useState<Lot[]>([]);
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("lots");
  const [expiringDays, setExpiringDays] = useState("30");
  const [showCreateLot, setShowCreateLot] = useState(false);
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);

  // New lot form
  const [newLot, setNewLot] = useState({
    itemId: "",
    lotNumber: "",
    quantity: "",
    expirationDate: "",
    manufacturingDate: "",
    notes: "",
  });

  // Recall form
  const [recallForm, setRecallForm] = useState({
    reason: "",
    severity: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  });

  useEffect(() => {
    fetchLots();
    fetchExpiringLots();
  }, [expiringDays]);

  async function fetchLots() {
    setLoading(true);
    try {
      const res = await fetch("/api/lots");
      if (res.ok) {
        const data = await res.json();
        setLots(data.lots || []);
      }
    } catch (error) {
      console.error("Failed to fetch lots:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExpiringLots() {
    try {
      const res = await fetch(`/api/lots?expiringWithinDays=${expiringDays}`);
      if (res.ok) {
        const data = await res.json();
        setExpiringLots(data.lots || []);
      }
    } catch (error) {
      console.error("Failed to fetch expiring lots:", error);
    }
  }

  async function createLot() {
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLot,
          quantity: parseFloat(newLot.quantity),
        }),
      });
      if (res.ok) {
        setShowCreateLot(false);
        setNewLot({
          itemId: "",
          lotNumber: "",
          quantity: "",
          expirationDate: "",
          manufacturingDate: "",
          notes: "",
        });
        fetchLots();
      }
    } catch (error) {
      console.error("Failed to create lot:", error);
    }
  }

  async function initiateRecall() {
    if (selectedLots.length === 0) return;

    try {
      const res = await fetch("/api/lots/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotIds: selectedLots,
          reason: recallForm.reason,
          severity: recallForm.severity,
          notifyCustomers: true,
        }),
      });
      if (res.ok) {
        setShowRecallDialog(false);
        setSelectedLots([]);
        setRecallForm({ reason: "", severity: "MEDIUM" });
        fetchLots();
      }
    } catch (error) {
      console.error("Failed to initiate recall:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-green-500">Available</Badge>;
      case "QUARANTINE":
        return <Badge variant="destructive">Quarantine</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      case "CONSUMED":
        return <Badge variant="outline">Consumed</Badge>;
      case "SOLD":
        return <Badge className="bg-blue-500">Sold</Badge>;
      case "RESERVED":
        return <Badge className="bg-yellow-500">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getDaysUntilExpiration(expirationDate: string) {
    const days = differenceInDays(new Date(expirationDate), new Date());
    if (days < 0) return { text: "Expired", color: "text-red-600" };
    if (days <= 7) return { text: `${days} days`, color: "text-red-600" };
    if (days <= 30) return { text: `${days} days`, color: "text-yellow-600" };
    return { text: `${days} days`, color: "text-green-600" };
  }

  const filteredLots = lots.filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.itemSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.itemName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lot & Serial Tracking</h1>
          <p className="text-muted-foreground">
            Full traceability with FIFO/LIFO/FEFO allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLots} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Lot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lot</DialogTitle>
                <DialogDescription>
                  Register a new lot for tracking
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Lot Number</Label>
                  <Input
                    value={newLot.lotNumber}
                    onChange={(e) => setNewLot({ ...newLot, lotNumber: e.target.value })}
                    placeholder="LOT-2024-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newLot.quantity}
                    onChange={(e) => setNewLot({ ...newLot, quantity: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Manufacturing Date</Label>
                    <Input
                      type="date"
                      value={newLot.manufacturingDate}
                      onChange={(e) => setNewLot({ ...newLot, manufacturingDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Expiration Date</Label>
                    <Input
                      type="date"
                      value={newLot.expirationDate}
                      onChange={(e) => setNewLot({ ...newLot, expirationDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newLot.notes}
                    onChange={(e) => setNewLot({ ...newLot, notes: e.target.value })}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateLot(false)}>
                  Cancel
                </Button>
                <Button onClick={createLot}>Create Lot</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringLots.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Expiring Soon ({expiringLots.length} lots)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringLots.slice(0, 5).map((lot) => (
                <Badge key={lot.id} variant="outline" className="text-yellow-600">
                  {lot.lotNumber} - {lot.itemSku}
                  {lot.expirationDate && (
                    <span className="ml-1">
                      ({getDaysUntilExpiration(lot.expirationDate).text})
                    </span>
                  )}
                </Badge>
              ))}
              {expiringLots.length > 5 && (
                <Badge variant="secondary">+{expiringLots.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lots or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CONSUMED">Consumed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={expiringDays} onValueChange={setExpiringDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Expiring in 7 days</SelectItem>
                <SelectItem value="14">Expiring in 14 days</SelectItem>
                <SelectItem value="30">Expiring in 30 days</SelectItem>
                <SelectItem value="60">Expiring in 60 days</SelectItem>
                <SelectItem value="90">Expiring in 90 days</SelectItem>
              </SelectContent>
            </Select>
            {selectedLots.length > 0 && (
              <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <FileWarning className="h-4 w-4 mr-2" />
                    Initiate Recall ({selectedLots.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initiate Recall</DialogTitle>
                    <DialogDescription>
                      This will quarantine {selectedLots.length} selected lots and notify affected customers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Reason for Recall</Label>
                      <Textarea
                        value={recallForm.reason}
                        onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })}
                        placeholder="Describe the reason for this recall..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Severity</Label>
                      <Select
                        value={recallForm.severity}
                        onValueChange={(value: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") =>
                          setRecallForm({ ...recallForm, severity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low - Advisory</SelectItem>
                          <SelectItem value="MEDIUM">Medium - Voluntary Recall</SelectItem>
                          <SelectItem value="HIGH">High - Mandatory Recall</SelectItem>
                          <SelectItem value="CRITICAL">Critical - Immediate Danger</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRecallDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={initiateRecall}>
                      Initiate Recall
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lots">
            <Package className="h-4 w-4 mr-2" />
            Lots
          </TabsTrigger>
          <TabsTrigger value="serial">
            <QrCode className="h-4 w-4 mr-2" />
            Serial Numbers
          </TabsTrigger>
          <TabsTrigger value="allocation">
            <History className="h-4 w-4 mr-2" />
            Allocation Strategy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lot Inventory</CardTitle>
              <CardDescription>
                All registered lots with traceability information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLots(filteredLots.map((l) => l.id));
                          } else {
                            setSelectedLots([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mfg Date</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLots.length > 0 ? (
                    filteredLots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLots.includes(lot.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLots([...selectedLots, lot.id]);
                              } else {
                                setSelectedLots(selectedLots.filter((id) => id !== lot.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {lot.lotNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lot.itemSku}</div>
                            <div className="text-sm text-muted-foreground">
                              {lot.itemName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {lot.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(lot.status)}</TableCell>
                        <TableCell>
                          {lot.manufacturingDate
                            ? format(new Date(lot.manufacturingDate), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {lot.expirationDate ? (
                            <span className={getDaysUntilExpiration(lot.expirationDate).color}>
                              {format(new Date(lot.expirationDate), "MMM d, yyyy")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{lot.supplierName || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No lots found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="serial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Serial Number Tracking</CardTitle>
              <CardDescription>
                Individual unit tracking with full lifecycle history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serialNumbers.length > 0 ? (
                    serialNumbers.map((sn) => (
                      <TableRow key={sn.id}>
                        <TableCell className="font-mono font-medium">
                          {sn.serialNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sn.itemSku}</div>
                            <div className="text-sm text-muted-foreground">
                              {sn.itemName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{sn.lotId || "-"}</TableCell>
                        <TableCell>{sn.locationCode || "-"}</TableCell>
                        <TableCell>{getStatusBadge(sn.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No serial numbers tracked
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  FIFO
                </CardTitle>
                <CardDescription>First In, First Out</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Allocates oldest inventory first based on received date.
                  Best for perishable goods and general inventory rotation.
                </p>
                <Button className="w-full" variant="outline">
                  Set as Default
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" />
                  LIFO
                </CardTitle>
                <CardDescription>Last In, First Out</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Allocates newest inventory first. Useful for non-perishable
                  goods where newer stock is more accessible.
                </p>
                <Button className="w-full" variant="outline">
                  Set as Default
                </Button>
              </CardContent>
            </Card>

            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  FEFO
                </CardTitle>
                <CardDescription>First Expired, First Out</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Allocates inventory expiring soonest. Required for
                  pharmaceuticals, food, and other expirable goods.
                </p>
                <Badge className="mb-4 bg-green-500">Recommended</Badge>
                <Button className="w-full">Set as Default</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
