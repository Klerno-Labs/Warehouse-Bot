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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Package,
  RotateCcw,
  Search,
  RefreshCw,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";

interface RMA {
  id: string;
  rmaNumber: string;
  customerName: string;
  originalOrderNumber?: string;
  status: string;
  createdAt: string;
  returnReason: string;
  creditAmount?: number;
  lines: Array<{
    itemSku: string;
    itemName: string;
    quantityRequested: number;
  }>;
}

interface ReturnAnalytics {
  totalReturns: number;
  totalValue: number;
  returnRate: number;
  avgProcessingTime: number;
  byReason: Array<{ reason: string; count: number; value: number }>;
  byDisposition: Array<{ disposition: string; count: number; value: number }>;
}

export default function ReturnsManagementPage() {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rmas");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateRMA, setShowCreateRMA] = useState(false);

  useEffect(() => {
    fetchRMAs();
    fetchAnalytics();
  }, []);

  async function fetchRMAs() {
    setLoading(true);
    try {
      const res = await fetch("/api/returns");
      if (res.ok) {
        const data = await res.json();
        setRmas(data.rmas || []);
      }
    } catch (error) {
      console.error("Failed to fetch RMAs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/returns?view=analytics&period=MONTH");
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
      case "REQUESTED":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Requested</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "SHIPPED":
        return <Badge className="bg-purple-500">Shipped</Badge>;
      case "RECEIVED":
        return <Badge className="bg-yellow-500">Received</Badge>;
      case "INSPECTED":
        return <Badge className="bg-orange-500">Inspected</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "REJECTED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const filteredRMAs = rmas.filter((rma) => {
    const matchesSearch =
      rma.rmaNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rma.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Returns Management</h1>
          <p className="text-muted-foreground">
            RMA processing, inspection, and restocking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRMAs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateRMA(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New RMA
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalReturns}</div>
              <p className="text-sm text-muted-foreground">this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Return Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${analytics.totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Return Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{analytics.returnRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.avgProcessingTime} days</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rmas">
            <RotateCcw className="h-4 w-4 mr-2" />
            RMAs
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingDown className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="policies">
            <FileText className="h-4 w-4 mr-2" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rmas" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search RMAs..."
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
                    <SelectItem value="REQUESTED">Requested</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="INSPECTED">Inspected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
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
                    <TableHead>RMA #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Original Order</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRMAs.length > 0 ? (
                    filteredRMAs.map((rma) => (
                      <TableRow key={rma.id}>
                        <TableCell className="font-mono font-medium">
                          {rma.rmaNumber}
                        </TableCell>
                        <TableCell>{rma.customerName}</TableCell>
                        <TableCell className="font-mono">
                          {rma.originalOrderNumber || "-"}
                        </TableCell>
                        <TableCell>{rma.returnReason}</TableCell>
                        <TableCell>{rma.lines?.length || 0} items</TableCell>
                        <TableCell>
                          {format(new Date(rma.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {rma.creditAmount ? `$${rma.creditAmount.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(rma.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No RMAs found"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Returns by Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.byReason}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {analytics.byReason.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disposition Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.byDisposition}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="disposition" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                      <Bar dataKey="value" fill="#22c55e" name="Value ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Return Policies</CardTitle>
              <CardDescription>Manage return eligibility and restocking fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Standard Return Policy</h4>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Return Window:</span>
                      <span className="ml-2 font-medium">30 days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Restocking Fee:</span>
                      <span className="ml-2 font-medium">0%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Refund Method:</span>
                      <span className="ml-2 font-medium">Original Payment</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Extended Holiday Policy</h4>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Return Window:</span>
                      <span className="ml-2 font-medium">60 days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Restocking Fee:</span>
                      <span className="ml-2 font-medium">0%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Refund Method:</span>
                      <span className="ml-2 font-medium">Original Payment</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create RMA Dialog */}
      <Dialog open={showCreateRMA} onOpenChange={setShowCreateRMA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Return Authorization</DialogTitle>
            <DialogDescription>
              Initiate a new return merchandise authorization
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">
              RMA creation form would go here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRMA(false)}>
              Cancel
            </Button>
            <Button>Create RMA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
