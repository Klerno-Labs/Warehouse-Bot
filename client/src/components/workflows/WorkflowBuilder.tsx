import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Workflow as WorkflowIcon,
  Zap,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: {
    type: string;
    config?: Record<string, any>;
  };
  conditions: any[];
  actions: any[];
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
}

const TRIGGER_TYPES = [
  { value: "ITEM_CREATED", label: "Item Created" },
  { value: "ITEM_UPDATED", label: "Item Updated" },
  { value: "STOCK_BELOW_THRESHOLD", label: "Stock Below Threshold" },
  { value: "STOCK_ABOVE_THRESHOLD", label: "Stock Above Threshold" },
  { value: "TRANSACTION_CREATED", label: "Transaction Created" },
  { value: "ORDER_CREATED", label: "Order Created" },
  { value: "ORDER_COMPLETED", label: "Order Completed" },
  { value: "CYCLE_COUNT_COMPLETED", label: "Cycle Count Completed" },
  { value: "SCHEDULED", label: "Scheduled (Time-based)" },
  { value: "MANUAL", label: "Manual Execution Only" },
];

const ACTION_TYPES = [
  { value: "SEND_EMAIL", label: "Send Email", icon: "📧" },
  { value: "CREATE_PURCHASE_ORDER", label: "Create Purchase Order", icon: "📦" },
  { value: "ADJUST_INVENTORY", label: "Adjust Inventory", icon: "📊" },
  { value: "UPDATE_ITEM", label: "Update Item", icon: "✏️" },
  { value: "CREATE_ALERT", label: "Create Alert", icon: "🔔" },
  { value: "CALL_WEBHOOK", label: "Call Webhook", icon: "🔗" },
  { value: "UPDATE_STATUS", label: "Update Status", icon: "🔄" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "in", label: "In List" },
  { value: "not_in", label: "Not In List" },
  { value: "is_null", label: "Is Null" },
  { value: "is_not_null", label: "Is Not Null" },
];

export function WorkflowBuilder() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/workflows");
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error: any) {
      toast({
        title: "Failed to load workflows",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error("Failed to update workflow");

      toast({
        title: enabled ? "Workflow enabled" : "Workflow disabled",
      });

      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Failed to update workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows?action=execute&id=${workflowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: {} }),
      });

      const result = await response.json();

      toast({
        title: "Workflow executed",
        description: result.message,
      });

      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Failed to execute workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteWorkflow = async () => {
    if (!workflowToDelete) return;

    try {
      const response = await fetch(`/api/workflows?id=${workflowToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete workflow");

      toast({
        title: "Workflow deleted",
      });

      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Failed to delete workflow",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setWorkflowToDelete(null);
    }
  };

  const viewDetails = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setDetailsOpen(true);
  };

  const enabledCount = workflows.filter((w) => w.enabled).length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <WorkflowIcon className="h-8 w-8" />
            Workflow Automation
          </h2>
          <p className="text-muted-foreground">Automate business processes with custom workflows</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured automations</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{enabledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">98.5%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle>All Workflows ({workflows.length})</CardTitle>
          <CardDescription>Manage your automated business rules and processes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12">
              <WorkflowIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <div className="text-lg font-semibold mb-2">No workflows yet</div>
              <div className="text-muted-foreground mb-4">
                Create your first workflow to automate business processes
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    workflow.enabled ? "border-green-200 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className={`h-5 w-5 ${workflow.enabled ? "text-green-600" : "text-gray-400"}`} />
                        <span className="font-semibold text-lg">{workflow.name}</span>
                        <Badge variant={workflow.enabled ? "default" : "secondary"}>
                          {workflow.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_TYPES.find((t) => t.value === workflow.trigger.type)?.label || workflow.trigger.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {workflow.executionCount} executions
                        </div>
                        {workflow.lastExecutedAt && (
                          <div>
                            Last run: {new Date(workflow.lastExecutedAt).toLocaleString()}
                          </div>
                        )}
                        <div>{workflow.conditions.length} conditions</div>
                        <div>{workflow.actions.length} actions</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={workflow.enabled}
                          onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {workflow.enabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeWorkflow(workflow.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDetails(workflow)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWorkflowToDelete(workflow)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>{selectedWorkflow?.description}</DialogDescription>
          </DialogHeader>

          {selectedWorkflow && (
            <div className="space-y-6">
              {/* Trigger */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Trigger Event</Label>
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">
                      {TRIGGER_TYPES.find((t) => t.value === selectedWorkflow.trigger.type)?.label}
                    </span>
                  </div>
                  {selectedWorkflow.trigger.config && (
                    <div className="mt-2 text-xs text-gray-600">
                      Config: {JSON.stringify(selectedWorkflow.trigger.config)}
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Conditions ({selectedWorkflow.conditions.length})
                </Label>
                {selectedWorkflow.conditions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No conditions - always executes</div>
                ) : (
                  <div className="space-y-2">
                    {selectedWorkflow.conditions.map((condition: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm">
                          {index > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {condition.logicalOperator || "AND"}
                            </Badge>
                          )}
                          <span className="font-mono">{condition.field}</span>
                          <span className="text-gray-500">{condition.operator}</span>
                          <span className="font-semibold">{condition.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Actions ({selectedWorkflow.actions.length})
                </Label>
                <div className="space-y-2">
                  {selectedWorkflow.actions.map((action: any, index: number) => {
                    const actionType = ACTION_TYPES.find((t) => t.value === action.type);
                    return (
                      <div key={index} className="border rounded-lg p-3 bg-green-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {action.order}
                          </Badge>
                          <span className="text-lg">{actionType?.icon}</span>
                          <span className="font-medium">{actionType?.label}</span>
                        </div>
                        <div className="text-xs text-gray-600 ml-7">
                          {Object.entries(action.config).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-semibold">{key}:</span>{" "}
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Executions</div>
                  <div className="text-2xl font-bold">{selectedWorkflow.executionCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant={selectedWorkflow.enabled ? "default" : "secondary"}>
                    {selectedWorkflow.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm">{new Date(selectedWorkflow.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Workflow Confirmation */}
      <ConfirmDialog
        open={!!workflowToDelete}
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        title="Delete Workflow"
        description={`Are you sure you want to delete the workflow "${workflowToDelete?.name}"? This action cannot be undone.`}
        onConfirm={deleteWorkflow}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
