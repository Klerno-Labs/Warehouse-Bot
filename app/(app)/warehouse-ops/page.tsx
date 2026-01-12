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
  ArrowDown,
  ArrowUp,
  Box,
  CheckCircle,
  ClipboardList,
  Layers,
  MapPin,
  Package,
  Play,
  RefreshCw,
  Truck,
  Users,
  Zap,
} from "lucide-react";

interface Task {
  id: string;
  type: "PUTAWAY" | "PICK" | "TRANSFER" | "COUNT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "NORMAL" | "HIGH" | "URGENT";
  itemSku: string;
  itemName: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  assignedTo?: string;
  createdAt: string;
}

interface PickingWave {
  waveId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  strategy: "WAVE" | "BATCH" | "ZONE" | "CLUSTER";
  orderCount: number;
  lineCount: number;
  progress: number;
  createdAt: string;
}

interface SlottingRecommendation {
  itemId: string;
  itemSku: string;
  itemName: string;
  currentLocation: string;
  suggestedLocation: string;
  reason: string;
  expectedSavings: string;
}

export default function WarehouseOpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [waves, setWaves] = useState<PickingWave[]>([]);
  const [slottingRecs, setSlottingRecs] = useState<SlottingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showWaveDialog, setShowWaveDialog] = useState(false);
  const [newWave, setNewWave] = useState({
    strategy: "WAVE" as "WAVE" | "BATCH" | "ZONE" | "CLUSTER",
    orderIds: [] as string[],
  });

  useEffect(() => {
    fetchTasks();
    fetchWaves();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouse-ops/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWaves() {
    try {
      const res = await fetch("/api/warehouse-ops/picking");
      if (res.ok) {
        const data = await res.json();
        setWaves(data.waves || []);
      }
    } catch (error) {
      console.error("Failed to fetch waves:", error);
    }
  }

  async function optimizeSlotting() {
    try {
      const res = await fetch("/api/warehouse-ops/putaway", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: "default" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlottingRecs(data.recommendations || []);
      }
    } catch (error) {
      console.error("Failed to optimize slotting:", error);
    }
  }

  async function startTask(taskId: string) {
    try {
      const res = await fetch("/api/warehouse-ops/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, userId: "current" }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  }

  async function completeTask(taskId: string) {
    try {
      const res = await fetch("/api/warehouse-ops/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  }

  function getTaskIcon(type: string) {
    switch (type) {
      case "PUTAWAY":
        return <ArrowDown className="h-4 w-4 text-blue-500" />;
      case "PICK":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "TRANSFER":
        return <Truck className="h-4 w-4 text-purple-500" />;
      case "COUNT":
        return <ClipboardList className="h-4 w-4 text-orange-500" />;
      default:
        return <Box className="h-4 w-4" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
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
        return <Badge variant="secondary">Normal</Badge>;
    }
  }

  const filteredTasks = tasks.filter((task) => {
    return statusFilter === "all" || task.status === statusFilter;
  });

  const taskStats = {
    pending: tasks.filter((t) => t.status === "PENDING").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    urgent: tasks.filter((t) => t.priority === "URGENT").length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Operations</h1>
          <p className="text-muted-foreground">
            Directed putaway, wave picking, and slotting optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowWaveDialog(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Create Wave
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{taskStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{taskStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{taskStats.completed}</div>
          </CardContent>
        </Card>
        <Card className={taskStats.urgent > 0 ? "border-red-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{taskStats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="putaway">
            <ArrowDown className="h-4 w-4 mr-2" />
            Putaway
          </TabsTrigger>
          <TabsTrigger value="picking">
            <ArrowUp className="h-4 w-4 mr-2" />
            Picking Waves
          </TabsTrigger>
          <TabsTrigger value="slotting">
            <Zap className="h-4 w-4 mr-2" />
            Slotting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Task Queue</CardTitle>
                  <CardDescription>All warehouse tasks pending execution</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task.type)}
                            {task.type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.itemSku}</div>
                            <div className="text-sm text-muted-foreground">
                              {task.itemName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{task.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {task.fromLocation || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {task.toLocation || "-"}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          {task.assignedTo || (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.status === "PENDING" && (
                            <Button size="sm" onClick={() => startTask(task.id)}>
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {task.status === "IN_PROGRESS" && (
                            <Button size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No tasks found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="putaway" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Directed Putaway</CardTitle>
                <CardDescription>
                  System suggests optimal locations based on item velocity and characteristics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    ABC velocity-based slotting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Weight and size optimization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Zone and aisle restrictions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Consolidation rules
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Putaway Rules</CardTitle>
                <CardDescription>Configure automatic location assignment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Class A Items</span>
                  <Badge>Ground Level</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Class B Items</span>
                  <Badge variant="secondary">Mid Level</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Class C Items</span>
                  <Badge variant="outline">Upper Level</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Hazmat</span>
                  <Badge variant="destructive">Zone H Only</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Putaways</CardTitle>
                <CardDescription>Last 5 completed putaways</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No recent putaways
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="picking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Picking Waves</CardTitle>
              <CardDescription>
                Batch orders into waves for efficient picking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wave ID</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waves.length > 0 ? (
                    waves.map((wave) => (
                      <TableRow key={wave.waveId}>
                        <TableCell className="font-mono">{wave.waveId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{wave.strategy}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{wave.orderCount}</TableCell>
                        <TableCell className="text-right">{wave.lineCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={wave.progress} className="w-20" />
                            <span className="text-sm">{wave.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(wave.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {wave.createdAt}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No picking waves
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Wave Picking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Group orders by ship date and pick all items together
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Batch Picking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Pick multiple orders simultaneously, sort at pack station
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Zone Picking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Pickers work in assigned zones, orders pass through
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cluster Picking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Pick to cart with multiple order totes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slotting" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Slotting Optimization</CardTitle>
                  <CardDescription>
                    AI-powered location optimization to reduce travel time
                  </CardDescription>
                </div>
                <Button onClick={optimizeSlotting}>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Optimization
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slottingRecs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Location</TableHead>
                      <TableHead>Suggested Location</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Expected Savings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slottingRecs.map((rec) => (
                      <TableRow key={rec.itemId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rec.itemSku}</div>
                            <div className="text-sm text-muted-foreground">
                              {rec.itemName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{rec.currentLocation}</TableCell>
                        <TableCell className="font-mono text-green-600">
                          {rec.suggestedLocation}
                        </TableCell>
                        <TableCell className="text-sm">{rec.reason}</TableCell>
                        <TableCell className="text-green-600">{rec.expectedSavings}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            Apply
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Click "Run Optimization" to analyze your warehouse layout</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Wave Dialog */}
      <Dialog open={showWaveDialog} onOpenChange={setShowWaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Picking Wave</DialogTitle>
            <DialogDescription>
              Select orders and picking strategy for this wave
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Strategy</label>
              <Select
                value={newWave.strategy}
                onValueChange={(value: "WAVE" | "BATCH" | "ZONE" | "CLUSTER") =>
                  setNewWave({ ...newWave, strategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAVE">Wave Picking</SelectItem>
                  <SelectItem value="BATCH">Batch Picking</SelectItem>
                  <SelectItem value="ZONE">Zone Picking</SelectItem>
                  <SelectItem value="CLUSTER">Cluster Picking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaveDialog(false)}>
              Cancel
            </Button>
            <Button>Create Wave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
