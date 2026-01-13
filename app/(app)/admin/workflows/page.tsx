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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/form-dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  PlayCircle,
  Clock,
  Zap,
  Mail,
  AlertTriangle,
  RefreshCw,
  Settings,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { InlineLoading } from "@/components/LoadingSpinner";

interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number;
  logicalOperator?: string;
}

interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: string;
    config?: Record<string, unknown>;
  };
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
}

interface WorkflowLog {
  id: string;
  workflowId: string;
  workflowName: string;
  triggeredAt: Date;
  status: "success" | "failed" | "skipped";
  duration: number;
  details: string;
}

const TRIGGER_TYPES = [
  { value: "STOCK_BELOW_THRESHOLD", label: "Stock Below Threshold" },
  { value: "CYCLE_COUNT_COMPLETED", label: "Cycle Count Completed" },
  { value: "ORDER_COMPLETED", label: "Order Completed" },
  { value: "TRANSACTION_CREATED", label: "Transaction Created" },
  { value: "PO_RECEIVED", label: "Purchase Order Received" },
  { value: "SHIPMENT_CREATED", label: "Shipment Created" },
  { value: "SCHEDULED", label: "Scheduled (Cron)" },
];

const ACTION_TYPES = [
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail },
  { value: "CREATE_ALERT", label: "Create Alert", icon: AlertTriangle },
  { value: "CREATE_PURCHASE_ORDER", label: "Create Purchase Order", icon: Plus },
  { value: "ADJUST_INVENTORY", label: "Adjust Inventory", icon: RefreshCw },
  { value: "UPDATE_STATUS", label: "Update Status", icon: Settings },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState("workflows");
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "STOCK_BELOW_THRESHOLD",
    enabled: true,
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(
          data.workflows.map((w: Workflow) => ({
            ...w,
            lastExecutedAt: w.lastExecutedAt ? new Date(w.lastExecutedAt) : undefined,
            createdAt: new Date(w.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWorkflow(id: string, enabled: boolean) {
    try {
      const res = await fetch("/api/workflows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) {
        setWorkflows(
          workflows.map((w) => (w.id === id ? { ...w, enabled } : w))
        );
      }
    } catch (error) {
      console.error("Failed to toggle workflow:", error);
    }
  }

  async function executeWorkflow(id: string) {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", workflowId: id }),
      });
      if (res.ok) {
        // Refresh to get updated execution count
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
    }
  }

  async function deleteWorkflow() {
    if (!workflowToDelete) return;
    try {
      const res = await fetch(`/api/workflows?id=${workflowToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkflows(workflows.filter((w) => w.id !== workflowToDelete.id));
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setWorkflowToDelete(null);
    }
  }

  async function createWorkflow() {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          workflow: {
            name: formData.name,
            description: formData.description,
            trigger: { type: formData.triggerType },
            enabled: formData.enabled,
            conditions: [],
            actions: [],
          },
        }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setFormData({
          name: "",
          description: "",
          triggerType: "STOCK_BELOW_THRESHOLD",
          enabled: true,
        });
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  }

  function getTriggerLabel(type: string) {
    return TRIGGER_TYPES.find((t) => t.value === type)?.label || type;
  }

  function getActionIcon(type: string) {
    const action = ACTION_TYPES.find((a) => a.value === type);
    return action?.icon || Settings;
  }

  const enabledCount = workflows.filter((w) => w.enabled).length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground">
            Automate tasks based on inventory events and schedules
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Set up automated actions triggered by inventory events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Auto-Reorder on Low Stock"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this workflow does..."
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, triggerType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enabled: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createWorkflow} disabled={!formData.name}>
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workflows.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{enabledCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {workflows.length - enabledCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalExecutions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">
            <Zap className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Execution History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {loading ? (
            <InlineLoading message="Loading workflows..." />
          ) : workflows.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No workflows configured yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{workflow.name}</h3>
                          <Badge variant={workflow.enabled ? "default" : "secondary"}>
                            {workflow.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          {workflow.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span>Trigger: {getTriggerLabel(workflow.trigger.type)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-blue-500" />
                            <span>{workflow.executionCount} executions</span>
                          </div>

                          {workflow.lastExecutedAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>
                                Last run{" "}
                                {formatDistanceToNow(workflow.lastExecutedAt, {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions Preview */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {workflow.actions.map((action, i) => {
                            const Icon = getActionIcon(action.type);
                            return (
                              <Badge key={i} variant="outline" className="gap-1">
                                <Icon className="h-3 w-3" />
                                {ACTION_TYPES.find((a) => a.value === action.type)?.label ||
                                  action.type}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={workflow.enabled}
                          onCheckedChange={(checked) =>
                            toggleWorkflow(workflow.id, checked)
                          }
                        />

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => executeWorkflow(workflow.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Execute Now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setEditingWorkflow(workflow)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setWorkflowToDelete(workflow)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                Recent workflow executions and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No execution history available</p>
                  <p className="text-sm">Workflow executions will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.workflowName}
                        </TableCell>
                        <TableCell>
                          {format(log.triggeredAt, "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "success"
                                ? "default"
                                : log.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.duration}ms</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!workflowToDelete}
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${workflowToDelete?.name}"? This action cannot be undone.`}
        onConfirm={deleteWorkflow}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
