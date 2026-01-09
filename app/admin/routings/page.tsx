"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CustomDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
}

interface RoutingStep {
  departmentId: string;
  sequence: number;
  required: boolean;
  canSkip: boolean;
  estimatedMinutes?: number;
  department?: CustomDepartment;
}

interface ProductionRouting {
  id: string;
  name: string;
  description?: string;
  itemId?: string;
  isDefault: boolean;
  isActive: boolean;
  steps: (RoutingStep & { department: CustomDepartment })[];
  item?: {
    id: string;
    sku: string;
    name: string;
  };
}

interface RoutingFormData {
  name: string;
  description?: string;
  itemId?: string;
  isDefault: boolean;
  steps: RoutingStep[];
}

export default function RoutingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRouting, setEditingRouting] = useState<ProductionRouting | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<RoutingFormData>({
    name: "",
    description: "",
    itemId: undefined,
    isDefault: false,
    steps: [],
  });

  const { data: routingsData, isLoading: routingsLoading } = useQuery<{
    routings: ProductionRouting[];
  }>({
    queryKey: ["/api/routings"],
  });

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery<{
    departments: CustomDepartment[];
  }>({
    queryKey: ["/api/departments"],
  });

  const { data: itemsData } = useQuery<{ items: any[] }>({
    queryKey: ["/api/items"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoutingFormData) => {
      const response = await fetch("/api/routings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create routing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routings"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Routing created successfully.",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoutingFormData }) => {
      const response = await fetch(`/api/routings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update routing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routings"] });
      setIsDialogOpen(false);
      setEditingRouting(null);
      resetForm();
      toast({
        title: "Success",
        description: "Routing updated successfully.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/routings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete routing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routings"] });
      setDeleteConfirmId(null);
      toast({
        title: "Success",
        description: "Routing deleted successfully.",
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
      name: "",
      description: "",
      itemId: undefined,
      isDefault: false,
      steps: [],
    });
  };

  const handleCreate = () => {
    setEditingRouting(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (routing: ProductionRouting) => {
    setEditingRouting(routing);
    setFormData({
      name: routing.name,
      description: routing.description,
      itemId: routing.itemId,
      isDefault: routing.isDefault,
      steps: routing.steps.map((step) => ({
        departmentId: step.department.id,
        sequence: step.sequence,
        required: step.required,
        canSkip: step.canSkip,
        estimatedMinutes: step.estimatedMinutes,
      })),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Routing name is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.steps.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one routing step is required.",
        variant: "destructive",
      });
      return;
    }

    if (editingRouting) {
      updateMutation.mutate({ id: editingRouting.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addStep = () => {
    const departments = departmentsData?.departments || [];
    if (departments.length === 0) {
      toast({
        title: "No Departments",
        description: "Please create departments before adding routing steps.",
        variant: "destructive",
      });
      return;
    }

    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          departmentId: departments[0].id,
          sequence: formData.steps.length + 1,
          required: true,
          canSkip: false,
          estimatedMinutes: undefined,
        },
      ],
    });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    // Resequence
    newSteps.forEach((step, i) => {
      step.sequence = i + 1;
    });
    setFormData({ ...formData, steps: newSteps });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...formData.steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Resequence
    newSteps.forEach((step, i) => {
      step.sequence = i + 1;
    });

    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, updates: Partial<RoutingStep>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData({ ...formData, steps: newSteps });
  };

  if (routingsLoading || departmentsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const routings = routingsData?.routings || [];
  const departments = departmentsData?.departments || [];
  const items = itemsData?.items || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Routings</h1>
          <p className="text-muted-foreground">
            Define workflow paths for your production processes
          </p>
        </div>
        <Button onClick={handleCreate} disabled={departments.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Routing
        </Button>
      </div>

      {departments.length === 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>No departments configured.</strong> You need to create departments
              before you can define production routings. Visit the{" "}
              <a href="/admin/departments" className="underline">
                departments page
              </a>{" "}
              to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Routings List */}
      <div className="grid gap-4">
        {routings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No routings configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first production routing to define workflow paths
              </p>
              {departments.length > 0 && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Routing
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          routings.map((routing) => (
            <Card key={routing.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{routing.name}</CardTitle>
                      {routing.isDefault && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                      {!routing.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {routing.description || "No description"}
                      {routing.item && (
                        <span className="ml-2">
                          • Item: {routing.item.sku} - {routing.item.name}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(routing)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(routing.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {routing.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="px-3 py-2 rounded-lg border-2 flex items-center gap-2"
                        style={{
                          borderColor: step.department.color,
                          backgroundColor: `${step.department.color}15`,
                        }}
                      >
                        {step.department.icon && (
                          <span className="text-lg">{step.department.icon}</span>
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {step.department.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {step.estimatedMinutes && `${step.estimatedMinutes} min`}
                            {step.canSkip && (
                              <span className="ml-1 text-yellow-600">(optional)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < routing.steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRouting ? "Edit Routing" : "Create Routing"}
            </DialogTitle>
            <DialogDescription>
              Define the sequence of departments for production workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Routing Name*</Label>
                <Input
                  id="name"
                  placeholder="e.g. Standard Assembly Process"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="itemId">Specific Item (optional)</Label>
                  <Select
                    value={formData.itemId || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, itemId: value || undefined })
                    }
                  >
                    <SelectTrigger id="itemId">
                      <SelectValue placeholder="Select item or leave blank for generic routing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (Generic Routing)</SelectItem>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sku} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-8">
                  <div className="space-y-0.5">
                    <Label>Default Routing</Label>
                    <p className="text-xs text-muted-foreground">
                      Use for items without specific routing
                    </p>
                  </div>
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Routing Steps*</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {formData.steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-3">No steps defined yet</p>
                  <Button type="button" variant="outline" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.steps.map((step, index) => {
                    const dept = departments.find((d) => d.id === step.departmentId);
                    return (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3"
                        style={{
                          borderColor: dept?.color,
                          backgroundColor: `${dept?.color}08`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveStep(index, "up")}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveStep(index, "down")}
                              disabled={index === formData.steps.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Department</Label>
                                <Select
                                  value={step.departmentId}
                                  onValueChange={(value) =>
                                    updateStep(index, { departmentId: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.icon} {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Estimated Time (min)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Optional"
                                  value={step.estimatedMinutes || ""}
                                  onChange={(e) =>
                                    updateStep(index, {
                                      estimatedMinutes: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                />
                              </div>

                              <div className="flex items-end gap-2">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`required-${index}`}
                                    checked={step.required}
                                    onCheckedChange={(checked) =>
                                      updateStep(index, { required: checked })
                                    }
                                  />
                                  <Label htmlFor={`required-${index}`} className="text-xs">
                                    Required
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`skip-${index}`}
                                    checked={step.canSkip}
                                    onCheckedChange={(checked) =>
                                      updateStep(index, { canSkip: checked })
                                    }
                                  />
                                  <Label htmlFor={`skip-${index}`} className="text-xs">
                                    Can Skip
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(index)}
                            className="mt-2"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-12">
                          <span className="font-semibold">Step {step.sequence}</span>
                          {dept && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              <span>{dept.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingRouting(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingRouting ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Routing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this routing? This action cannot be undone.
              The routing cannot be deleted if it is currently in use by production orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
