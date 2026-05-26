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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Package,
  Search,
  RefreshCw,
  Plus,
  ScanLine,
  Layers,
  Archive,
  Truck,
  CheckCircle,
} from "lucide-react";

interface LpnDashboard {
  totalLpns: number;
  inUse: number;
  available: number;
  inTransit: number;
  byType: Array<{ type: string; count: number }>;
  recentActivity: Array<{
    lpn: string;
    action: string;
    timestamp: string;
  }>;
}

interface Lpn {
  id: string;
  lpn: string;
  type: string;
  status: string;
  location?: {
    locationCode: string;
  };
  contents: Array<{
    itemSku: string;
    itemName: string;
    quantity: number;
  }>;
  createdAt: string;
}

export default function LpnPage() {
  const [dashboard, setDashboard] = useState<LpnDashboard | null>(null);
  const [lpns, setLpns] = useState<Lpn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/lpn");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch LPN dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "IN_USE":
        return <Badge className="bg-blue-500">In Use</Badge>;
      case "AVAILABLE":
        return <Badge className="bg-green-500">Available</Badge>;
      case "IN_TRANSIT":
        return <Badge className="bg-purple-500"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case "DAMAGED":
        return <Badge variant="destructive">Damaged</Badge>;
      case "RETIRED":
        return <Badge variant="outline">Retired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case "PALLET":
        return <Badge variant="outline"><Layers className="h-3 w-3 mr-1" />Pallet</Badge>;
      case "CASE":
        return <Badge variant="outline"><Package className="h-3 w-3 mr-1" />Case</Badge>;
      case "TOTE":
        return <Badge variant="outline"><Archive className="h-3 w-3 mr-1" />Tote</Badge>;
      case "CARTON":
        return <Badge variant="outline">Carton</Badge>;
      case "CONTAINER":
        return <Badge variant="outline">Container</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  }

  const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#8b5cf6"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">License Plate Numbers (LPN)</h1>
          <p className="text-muted-foreground">
            Container and pallet tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create LPN
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total LPNs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.totalLpns.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                In Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboard.inUse}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboard.available}</div>
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
              <div className="text-3xl font-bold text-purple-600">{dashboard.inTransit}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Package className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="scan">
            <ScanLine className="h-4 w-4 mr-2" />
            Scan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LPN by Type */}
            <Card>
              <CardHeader>
                <CardTitle>LPNs by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboard.byType}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {dashboard.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recentActivity.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard?.recentActivity.map((activity, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <span className="font-mono font-medium">{activity.lpn}</span>
                          <span className="text-muted-foreground ml-2">{activity.action}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search LPN number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PALLET">Pallet</SelectItem>
                    <SelectItem value="CASE">Case</SelectItem>
                    <SelectItem value="TOTE">Tote</SelectItem>
                    <SelectItem value="CARTON">Carton</SelectItem>
                  </SelectContent>
                </Select>
                <Button>Search</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LPN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contents</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lpns.length > 0 ? (
                    lpns.map((lpn) => (
                      <TableRow key={lpn.id}>
                        <TableCell className="font-mono font-medium">{lpn.lpn}</TableCell>
                        <TableCell>{getTypeBadge(lpn.type)}</TableCell>
                        <TableCell>{getStatusBadge(lpn.status)}</TableCell>
                        <TableCell>{lpn.location?.locationCode || "-"}</TableCell>
                        <TableCell>{lpn.contents?.length || 0} items</TableCell>
                        <TableCell>
                          {new Date(lpn.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Enter a search term to find LPNs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan LPN</CardTitle>
              <CardDescription>Scan or enter an LPN barcode to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto text-center py-12">
                <ScanLine className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <Input
                  placeholder="Scan or enter LPN..."
                  className="text-center text-lg"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Position the barcode in front of your scanner or type the LPN number
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create LPN Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create License Plate Number</DialogTitle>
            <DialogDescription>
              Generate a new LPN for a pallet, case, or tote
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select defaultValue="PALLET">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PALLET">Pallet</SelectItem>
                  <SelectItem value="CASE">Case</SelectItem>
                  <SelectItem value="TOTE">Tote</SelectItem>
                  <SelectItem value="CARTON">Carton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input type="number" defaultValue={1} min={1} max={100} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button>Generate LPN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
