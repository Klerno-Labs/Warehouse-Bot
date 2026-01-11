"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Shield, Edit, Save, X, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Role, Permission, ROLE_PERMISSIONS, getRoleDisplayName, getRoleTier } from "@shared/permissions";

/**
 * Role Management - For Executive Tier
 * Allows executives to customize role names and permissions within their tenant
 */
export default function RoleManagement() {
  const { toast } = useToast();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get all roles except SuperAdmin (that's platform-only)
  const editableRoles = Object.values(Role).filter(
    (role) => role !== Role.SuperAdmin && role !== Role.Viewer
  );

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setCustomName(getRoleDisplayName(role));
    setDescription("");
    setSelectedPermissions(ROLE_PERMISSIONS[role] || []);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/roles/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingRole,
          customName,
          description,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) throw new Error("Failed to save role configuration");

      // Success - close dialog and show toast
      setEditingRole(null);
      toast({
        title: "Role Updated",
        description: `${customName} has been configured successfully.`,
      });
    } catch (error) {
      console.error("Error saving role:", error);
      toast({
        title: "Error",
        description: "Failed to save role configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const getRoleTierBadge = (role: Role) => {
    const tier = getRoleTier(role);
    const colors = ["bg-gray-500", "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-red-500"];
    return <Badge className={`${colors[tier]} text-white`}>Tier {tier}</Badge>;
  };

  // Group permissions by category
  const permissionCategories = {
    Inventory: Object.values(Permission).filter((p) => p.includes("INVENTORY") || p.includes("CYCLE")),
    Production: Object.values(Permission).filter((p) => p.includes("PRODUCTION") || p.includes("JOB") || p.includes("BOM")),
    Purchasing: Object.values(Permission).filter((p) => p.includes("PURCHASING") || p.includes("PURCHASE")),
    Sales: Object.values(Permission).filter((p) => p.includes("SALES") || p.includes("CUSTOMER") || p.includes("SHIPMENT")),
    Quality: Object.values(Permission).filter((p) => p.includes("QUALITY") || p.includes("INSPECTION") || p.includes("NCR")),
    Users: Object.values(Permission).filter((p) => p.includes("USER")),
    Settings: Object.values(Permission).filter((p) => p.includes("SETTINGS") || p.includes("FACILITIES")),
    Reports: Object.values(Permission).filter((p) => p.includes("REPORTS") || p.includes("EXPORT") || p.includes("ANALYTICS")),
    Mobile: Object.values(Permission).filter((p) => p.includes("MOBILE")),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize role names and permissions for your organization
          </p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="h-5 w-5" />
            About Role Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <p>
            As an Executive, you can customize role names and permissions to match your organization's structure.
            Changes apply only to your warehouse/tenant. The base tier structure remains intact.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {editableRoles.map((role) => (
          <Card key={role} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{getRoleDisplayName(role)}</CardTitle>
                {getRoleTierBadge(role)}
              </div>
              <CardDescription>
                {ROLE_PERMISSIONS[role]?.length || 0} permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Current Name:</strong> {getRoleDisplayName(role)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleEditRole(role)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Customize Role
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Customize {editingRole && getRoleDisplayName(editingRole)}
              {editingRole && getRoleTierBadge(editingRole)}
            </DialogTitle>
            <DialogDescription>
              Modify the display name, description, and permissions for this role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Custom Name */}
            <div className="space-y-2">
              <Label>Custom Role Name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={editingRole ? getRoleDisplayName(editingRole) : ""}
              />
              <p className="text-xs text-muted-foreground">
                e.g., "Floor Supervisor" instead of "Operator"
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this role's responsibilities..."
                rows={3}
              />
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Permissions</Label>
              {Object.entries(permissionCategories).map(([category, permissions]) => {
                if (permissions.length === 0) return null;
                return (
                  <Card key={category}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                          />
                          <label
                            htmlFor={permission}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.replace(/_/g, " ").toLowerCase()}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
