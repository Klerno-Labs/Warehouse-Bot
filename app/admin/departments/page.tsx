"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  X,
  Settings
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

interface CustomDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  allowConcurrent: boolean;
  requireQC: boolean;
  defaultDuration?: number;
  order: number;
  isActive: boolean;
}

interface DepartmentFormData {
  name: string;
  code: string;
  color: string;
  icon?: string;
  allowConcurrent: boolean;
  requireQC: boolean;
  defaultDuration?: number;
}

const DEFAULT_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

export default function DepartmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<CustomDepartment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
    code: "",
    color: DEFAULT_COLORS[0],
    icon: "",
    allowConcurrent: true,
    requireQC: false,
    defaultDuration: undefined,
  });

  const { data, isLoading } = useQuery<{ departments: CustomDepartment[] }>({
    queryKey: ["/api/departments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create department");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Department created successfully.",
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<DepartmentFormData> }) => {
      const response = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update department");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
      toast({
        title: "Success",
        description: "Department updated successfully.",
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
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete department");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setDeleteConfirmId(null);
      toast({
        title: "Success",
        description: "Department deleted successfully.",
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
      code: "",
      color: DEFAULT_COLORS[0],
      icon: "",
      allowConcurrent: true,
      requireQC: false,
      defaultDuration: undefined,
    });
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (dept: CustomDepartment) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      color: dept.color,
      icon: dept.icon,
      allowConcurrent: dept.allowConcurrent,
      requireQC: dept.requireQC,
      defaultDuration: dept.defaultDuration,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      toast({
        title: "Validation Error",
        description: "Name and code are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (dept: CustomDepartment) => {
    updateMutation.mutate({
      id: dept.id,
      data: { isActive: !dept.isActive },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const departments = data?.departments || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department Configuration</h1>
          <p className="text-muted-foreground">
            Manage custom departments for your production workflow
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departments
          </CardTitle>
          <CardDescription>
            Configure production departments and their operational parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No departments configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first department to get started
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[60px]">Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Concurrent</TableHead>
                  <TableHead className="text-center">Require QC</TableHead>
                  <TableHead>Default Duration</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-8 w-8 rounded border"
                        style={{ backgroundColor: dept.color }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {dept.icon && <span className="mr-2">{dept.icon}</span>}
                      {dept.name}
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-xs">
                        {dept.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      {dept.allowConcurrent ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {dept.requireQC ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dept.defaultDuration ? `${dept.defaultDuration} min` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={dept.isActive}
                        onCheckedChange={() => handleToggleActive(dept)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(dept.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Edit Department" : "Create Department"}
            </DialogTitle>
            <DialogDescription>
              Configure department settings and operational parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name*</Label>
                <Input
                  id="name"
                  placeholder="e.g. Welding, Assembly"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Department Code*</Label>
                <Input
                  id="code"
                  placeholder="e.g. WELD, ASSY"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingDepartment}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (cannot be changed after creation)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 w-10 rounded border-2 ${
                      formData.color === color ? "border-black" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (optional)</Label>
              <Input
                id="icon"
                placeholder="e.g. ⚙️ 🔧 🔨"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Single emoji or icon character
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default Duration (minutes)</Label>
              <Input
                id="defaultDuration"
                type="number"
                min="0"
                placeholder="Optional"
                value={formData.defaultDuration || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultDuration: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Concurrent Jobs</Label>
                  <p className="text-sm text-muted-foreground">
                    Multiple jobs can run simultaneously in this department
                  </p>
                </div>
                <Switch
                  checked={formData.allowConcurrent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowConcurrent: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Quality Control</Label>
                  <p className="text-sm text-muted-foreground">
                    Jobs must pass QC inspection after this department
                  </p>
                </div>
                <Switch
                  checked={formData.requireQC}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requireQC: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingDepartment(null);
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
              {editingDepartment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
              The department cannot be deleted if it is used in any production routings.
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
