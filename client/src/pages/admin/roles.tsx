"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Plus,
  GripVertical,
  Check,
  X,
  Edit2,
  Trash2,
  Copy,
  Info,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineLoading } from "@/components/LoadingSpinner";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: "inventory" | "production" | "sales" | "admin" | "analytics";
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[]; // Array of permission IDs
  userCount: number;
}

const PERMISSION_CATEGORIES = {
  inventory: { label: "Inventory", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  production: { label: "Production", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  sales: { label: "Sales", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  admin: { label: "Administration", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  analytics: { label: "Analytics", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function RoleManagement() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPermission, setDraggedPermission] = useState<string | null>(null);

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ["/api/admin/permissions"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (role: Partial<Role>) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role),
      });
      if (!res.ok) throw new Error("Failed to create role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setSelectedRole(null);
    },
  });

  const handleDragStart = (permissionId: string) => {
    setDraggedPermission(permissionId);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedPermission(null);
    setIsDragging(false);
  };

  const handleDrop = (roleId: string) => {
    if (!draggedPermission) return;

    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;

    // Add permission if not already present
    if (!role.permissions.includes(draggedPermission)) {
      const updatedRole = {
        ...role,
        permissions: [...role.permissions, draggedPermission],
      };
      updateRoleMutation.mutate(updatedRole);
    }

    setDraggedPermission(null);
    setIsDragging(false);
  };

  const handleRemovePermission = (roleId: string, permissionId: string) => {
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;

    const updatedRole = {
      ...role,
      permissions: role.permissions.filter((p) => p !== permissionId),
    };
    updateRoleMutation.mutate(updatedRole);
  };

  const handleDuplicateRole = (role: Role) => {
    createRoleMutation.mutate({
      name: `${role.name} (Copy)`,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    });
  };

  const availablePermissions = allPermissions?.filter(
    (p) => !selectedRole?.permissions.includes(p.id)
  ) || [];

  const assignedPermissions = allPermissions?.filter(
    (p) => selectedRole?.permissions.includes(p.id)
  ) || [];

  // Group permissions by category
  const permissionsByCategory = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  };

  if (rolesLoading) {
    return (
      <div className="p-6">
        <InlineLoading message="Loading roles..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">
            Drag and drop permissions to customize role access
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Role
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Drag permissions from the left panel and drop them onto roles to grant access. Click a role to see detailed permissions.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Available Permissions Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Available Permissions
            </CardTitle>
            <CardDescription>Drag to assign to roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search permissions..."
              className="mb-4"
            />
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(permissionsByCategory(availablePermissions)).map(([category, perms]) => (
                <div key={category}>
                  <Badge
                    className={PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].color}
                    variant="secondary"
                  >
                    {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].label}
                  </Badge>
                  <div className="mt-2 space-y-2">
                    {perms.map((permission) => (
                      <div
                        key={permission.id}
                        draggable
                        onDragStart={() => handleDragStart(permission.id)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{permission.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roles Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {roles?.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all ${
                  selectedRole?.id === role.id ? "ring-2 ring-primary" : ""
                } ${isDragging ? "ring-2 ring-dashed ring-primary/50" : ""}`}
                onClick={() => setSelectedRole(role)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(role.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg ${role.color} flex items-center justify-center`}
                      >
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {role.userCount} {role.userCount === 1 ? "user" : "users"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateRole(role);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRoleMutation.mutate(role.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.slice(0, 5).map((permId) => {
                      const perm = allPermissions?.find((p) => p.id === permId);
                      if (!perm) return null;
                      return (
                        <Badge key={permId} variant="secondary" className="text-xs">
                          {perm.name}
                        </Badge>
                      );
                    })}
                    {role.permissions.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Permissions View */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRole.name} Permissions</CardTitle>
                    <CardDescription>
                      {selectedRole.permissions.length} permissions assigned
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignedPermissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No permissions assigned yet. Drag permissions from the left to add them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(permissionsByCategory(assignedPermissions)).map(([category, perms]) => (
                      <div key={category}>
                        <Badge
                          className={PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].color}
                          variant="secondary"
                        >
                          {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].label}
                        </Badge>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {perms.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{permission.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePermission(selectedRole.id, permission.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
