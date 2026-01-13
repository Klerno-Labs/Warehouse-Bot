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
import { Progress } from "@/components/ui/progress";
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
  Waves,
  RefreshCw,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Users,
  Package,
  Zap,
  Target,
} from "lucide-react";
import { format } from "date-fns";

interface Wave {
  id: string;
  waveNumber: string;
  status: string;
  priority: string;
  orderCount: number;
  totalLines: number;
  totalUnits: number;
  completedLines: number;
  completedUnits: number;
  assignedPickers: string[];
  plannedStart?: string;
  actualStart?: string;
  completedAt?: string;
  estimatedDuration: number;
  actualDuration?: number;
}

interface WaveAnalytics {
  avgWaveSize: number;
  avgCompletionTime: number;
  wavesPerDay: number;
  pickAccuracy: number;
  throughputPerWave: number;
  byStatus: Array<{ status: string; count: number }>;
  performanceByHour: Array<{ hour: string; waves: number; units: number }>;
}

export default function WavePlanningPage() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [analytics, setAnalytics] = useState<WaveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("waves");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchWaves();
    fetchAnalytics();
  }, []);

  async function fetchWaves() {
    setLoading(true);
    try {
      const res = await fetch("/api/waves");
      if (res.ok) {
        const data = await res.json();
        setWaves(data.waves || []);
      }
    } catch (error) {
      console.error("Failed to fetch waves:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/waves?view=analytics");
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
      case "PLANNED":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Planned</Badge>;
      case "RELEASED":
        return <Badge className="bg-blue-500"><Play className="h-3 w-3 mr-1" />Released</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-purple-500"><Zap className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "PAUSED":
        return <Badge variant="outline" className="border-yellow-500"><Pause className="h-3 w-3 mr-1" />Paused</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const filteredWaves = waves.filter((w) => {
    return statusFilter === "all" || w.status === statusFilter;
  });

  const activeWaves = waves.filter((w) => ["RELEASED", "IN_PROGRESS"].includes(w.status));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wave Planning</h1>
          <p className="text-muted-foreground">
            Intelligent wave creation and workload optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchWaves} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Plan Wave
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Waves className="h-4 w-4" />
              Active Waves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeWaves.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Units to Pick
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeWaves.reduce((sum, w) => sum + (w.totalUnits - w.completedUnits), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pickers Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(activeWaves.flatMap((w) => w.assignedPickers)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics?.avgCompletionTime || 0} min
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.throughputPerWave || 0}
            </div>
            <p className="text-sm text-muted-foreground">units/wave</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="waves">
            <Waves className="h-4 w-4 mr-2" />
            Waves
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Target className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waves" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center justify-between">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="RELEASED">Released</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Suggest Waves
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wave #</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Pickers</TableHead>
                    <TableHead>Planned Start</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWaves.length > 0 ? (
                    filteredWaves.map((wave) => (
                      <TableRow key={wave.id}>
                        <TableCell className="font-mono font-medium">
                          {wave.waveNumber}
                        </TableCell>
                        <TableCell className="text-right">{wave.orderCount}</TableCell>
                        <TableCell className="text-right">{wave.totalLines}</TableCell>
                        <TableCell className="text-right">{wave.totalUnits.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress
                              value={(wave.completedUnits / wave.totalUnits) * 100}
                              className="h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((wave.completedUnits / wave.totalUnits) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {wave.assignedPickers?.length || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          {wave.plannedStart
                            ? format(new Date(wave.plannedStart), "HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(wave.status)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {wave.status === "PLANNED" && (
                            <Button size="sm" variant="outline">
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No waves found"}
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
                  <CardTitle>Waves by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Waves" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hourly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.performanceByHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="waves" fill="#3b82f6" name="Waves" />
                      <Bar dataKey="units" fill="#22c55e" name="Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Wave Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan New Wave</DialogTitle>
            <DialogDescription>
              Create a new picking wave from pending orders
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">
              Wave planning form would go here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button>Plan Wave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
