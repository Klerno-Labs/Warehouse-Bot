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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Box,
  Boxes,
  Package,
  RefreshCw,
  Plus,
  Search,
  PlayCircle,
  CheckCircle,
  Clock,
  Wrench,
} from "lucide-react";

interface Kit {
  id: string;
  kitSku: string;
  kitName: string;
  status: string;
  type: string;
  components: Array<{
    itemSku: string;
    itemName: string;
    quantity: number;
  }>;
  laborMinutes: number;
}

interface KitOrder {
  id: string;
  orderNumber: string;
  kitSku: string;
  kitName: string;
  quantityOrdered: number;
  quantityCompleted: number;
  status: string;
  priority: string;
  salesOrderId?: string;
}

interface KittingAnalytics {
  totalKitsAssembled: number;
  totalComponentsUsed: number;
  avgAssemblyTime: number;
  efficiency: number;
  laborHours: number;
  throughput: number;
  byKit: Array<{
    kitSku: string;
    kitName: string;
    assembled: number;
    avgTime: number;
  }>;
}

export default function KittingPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [analytics, setAnalytics] = useState<KittingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kits");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateKit, setShowCreateKit] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);

  useEffect(() => {
    fetchKits();
    fetchOrders();
    fetchAnalytics();
  }, []);

  async function fetchKits() {
    setLoading(true);
    try {
      const res = await fetch("/api/kitting");
      if (res.ok) {
        const data = await res.json();
        setKits(data.kits || []);
      }
    } catch (error) {
      console.error("Failed to fetch kits:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch("/api/kitting?view=orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/kitting?view=analytics&period=MONTH");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>;
      case "PENDING":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500"><PlayCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
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
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  }

  const filteredKits = kits.filter(
    (kit) =>
      kit.kitSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.kitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kitting & Assembly</h1>
          <p className="text-muted-foreground">
            Bundle creation, kit management, and assembly tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchKits} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowCreateKit(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Kit
          </Button>
          <Button onClick={() => setShowCreateOrder(true)}>
            <Wrench className="h-4 w-4 mr-2" />
            Assembly Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Kits Assembled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalKitsAssembled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Components Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalComponentsUsed.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Assembly Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.avgAssemblyTime} min</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.efficiency}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Labor Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.laborHours.toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.throughput.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">kits/hour</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="kits">
            <Boxes className="h-4 w-4 mr-2" />
            Kit Definitions
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Wrench className="h-4 w-4 mr-2" />
            Assembly Orders
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kits" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search kits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kit SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Components</TableHead>
                    <TableHead className="text-right">Labor (min)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKits.length > 0 ? (
                    filteredKits.map((kit) => (
                      <TableRow key={kit.id}>
                        <TableCell className="font-mono font-medium">
                          {kit.kitSku}
                        </TableCell>
                        <TableCell>{kit.kitName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{kit.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {kit.components?.length || 0}
                        </TableCell>
                        <TableCell className="text-right">{kit.laborMinutes}</TableCell>
                        <TableCell>{getStatusBadge(kit.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No kits found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assembly Orders</CardTitle>
              <CardDescription>Active and pending kit assembly orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Kit</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.kitSku}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.kitName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{order.quantityOrdered}</TableCell>
                        <TableCell className="text-right">{order.quantityCompleted}</TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          {order.status === "PENDING" && (
                            <Button size="sm">
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {order.status === "IN_PROGRESS" && (
                            <Button size="sm" variant="outline">
                              Continue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No assembly orders
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Assembly Performance by Kit</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.byKit}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="kitSku" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="assembled" fill="#3b82f6" name="Quantity Assembled" />
                    <Bar yAxisId="right" dataKey="avgTime" fill="#22c55e" name="Avg Time (min)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Kit Dialog */}
      <Dialog open={showCreateKit} onOpenChange={setShowCreateKit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Kit Definition</DialogTitle>
            <DialogDescription>Define a new kit with its components</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">Kit creation form would go here</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKit(false)}>Cancel</Button>
            <Button>Create Kit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assembly Order</DialogTitle>
            <DialogDescription>Schedule kit assembly</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">Order creation form would go here</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOrder(false)}>Cancel</Button>
            <Button>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
