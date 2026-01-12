"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Edit, Trash2, Users } from "lucide-react";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateEditDialog, DeleteDialog } from "@/components/ui/form-dialog";
import { useCRUD, filterBySearch } from "@/hooks/use-crud";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: { users: number };
}

/**
 * Department Management - For Executives
 * Create and manage departments within the organization
 *
 * Refactored to use reusable useCRUD hook and FormDialog components
 */
export default function DepartmentManagement() {
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  // CRUD operations via hook
  const crud = useCRUD<Department>({
    queryKey: ["/api/admin/departments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      return data.departments || [];
    },
    createFn: async (data) => {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create department");
      }
      return res.json();
    },
    updateFn: async (id, data) => {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update department");
      return res.json();
    },
    deleteFn: async (id) => {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete department");
    },
    entityName: "Department",
    getId: (dept) => dept.id,
    getName: (dept) => dept.name,
  });

  // Reset form when dialogs close
  useEffect(() => {
    if (!crud.isCreateOpen && !crud.isEditOpen) {
      setName("");
      setCode("");
      setDescription("");
    }
  }, [crud.isCreateOpen, crud.isEditOpen]);

  // Populate form when editing
  useEffect(() => {
    if (crud.editingItem) {
      setName(crud.editingItem.name);
      setCode(crud.editingItem.code);
      setDescription(crud.editingItem.description || "");
    }
  }, [crud.editingItem]);

  const handleCreate = async () => {
    await crud.create({ name, code, description });
  };

  const handleUpdate = async () => {
    await crud.update({ name, description });
  };

  // Filter departments by search
  const filteredDepartments = filterBySearch(
    crud.items,
    crud.searchQuery,
    ["name", "code", "description"]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Department Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and organize departments for your organization
          </p>
        </div>
        <Button onClick={crud.openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Department
        </Button>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            {crud.items.length} department{crud.items.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crud.isLoading ? (
            <InlineLoading message="Loading departments..." />
          ) : crud.items.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No departments yet"
              description="Create departments to organize your team."
              actions={[{ label: "Create Department", onClick: crud.openCreate, icon: Plus }]}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{dept.code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {dept.description || <span className="text-muted-foreground italic">No description</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="mr-1 h-3 w-3" />
                        {dept._count?.users || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => crud.openEdit(dept)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => crud.openDelete(dept)}
                          disabled={(dept._count?.users || 0) > 0}
                        >
                          <Trash2 className="h-4 w-4" />
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
      <CreateEditDialog
        open={crud.isCreateOpen || crud.isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            crud.closeCreate();
            crud.closeEdit();
          }
        }}
        entityName="Department"
        editingItem={crud.editingItem}
        onSubmit={crud.editingItem ? handleUpdate : handleCreate}
        isSubmitting={crud.isCreating || crud.isUpdating}
        submitDisabled={!name || (!crud.editingItem && !code)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Department Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Assembly, Welding, Quality Control"
            />
          </div>

          <div className="space-y-2">
            <Label>Department Code {crud.editingItem ? "" : "*"}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="e.g., assembly, welding, qc"
              disabled={!!crud.editingItem}
              className={crud.editingItem ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground">
              {crud.editingItem
                ? "Code cannot be changed after creation"
                : "Unique identifier (lowercase, no spaces)"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this department..."
              rows={3}
            />
          </div>
        </div>
      </CreateEditDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={crud.isDeleteOpen}
        onOpenChange={crud.closeDelete}
        itemName={crud.deletingItem?.name || ""}
        onDelete={crud.remove}
        isDeleting={crud.isDeleting}
      />
    </div>
  );
}
