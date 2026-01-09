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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Edit, Save, X, Plus, Trash2, Users } from "lucide-react";
import { Role, Permission, ROLE_PERMISSIONS, getRoleDisplayName, getRoleTier } from "@shared/permissions";

/**
 * Custom Roles Management - For Executive Tier
 * Create multiple custom roles per base tier (e.g., multiple operator types)
 */
export default function CustomRolesManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [baseRole, setBaseRole] = useState<Role>(Role.Operator);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Mock existing custom roles
  const customRoles = [
    {
      id: "1",
      baseRole: Role.Operator,
      customName: "Capping Machine Operator",
      description: "Operates capping machinery on production line",
      assignedDepartments: ["capping"],
      permissions: [Permission.VIEW_JOB_CARD, Permission.COMPLETE_PRODUCTION_JOB],
      userCount: 5,
    },
    {
      id: "2",
      baseRole: Role.Operator,
      customName: "Welding Operator",
      description: "Performs welding operations",
      assignedDepartments: ["welding"],
      permissions: [Permission.VIEW_JOB_CARD, Permission.COMPLETE_PRODUCTION_JOB, Permission.VIEW_QUALITY],
      userCount: 3,
    },
    {
      id: "3",
      baseRole: Role.Sales,
      customName: "Inside Sales Rep",
      description: "Handles phone and email sales",
      assignedDepartments: ["sales"],
      permissions: [Permission.VIEW_SALES, Permission.CREATE_SALES_ORDER],
      userCount: 7,
    },
  ];

  // Available departments (mock - fetch from API)
  const departments = [
    { id: "assembly", name: "Assembly" },
    { id: "capping", name: "Capping" },
    { id: "welding", name: "Welding" },
    { id: "packaging", name: "Packaging" },
    { id: "quality", name: "Quality Control" },
    { id: "sales", name: "Sales" },
  ];

  // Base roles that can be customized
  const customizableRoles = [Role.Operator, Role.Supervisor, Role.Sales, Role.Engineering];

  const handleCreateRole = async () => {
    try {
      const response = await fetch("/api/admin/roles/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseRole,
          customName,
          description,
          permissions: selectedPermissions,
          assignedDepartments: selectedDepartments,
        }),
      });

      if (!response.ok) throw new Error("Failed to create custom role");

      // Reset form
      setIsCreating(false);
      setCustomName("");
      setDescription("");
      setSelectedPermissions([]);
      setSelectedDepartments([]);
    } catch (error) {
      console.error("Error creating custom role:", error);
    }
  };

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((d) => d !== deptId)
        : [...prev, deptId]
    );
  };

  const getRoleTierBadge = (role: Role) => {
    const tier = getRoleTier(role);
    const colors = ["bg-gray-500", "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-red-500"];
    return <Badge className={`${colors[tier]} text-white`}>Tier {tier}</Badge>;
  };

  // Group permissions by category
  const permissionCategories = {
    Production: Object.values(Permission).filter((p) =>
      p.includes("PRODUCTION") || p.includes("JOB") || p.includes("BOM")
    ),
    Inventory: Object.values(Permission).filter((p) =>
      p.includes("INVENTORY") || p.includes("CYCLE")
    ),
    Sales: Object.values(Permission).filter((p) =>
      p.includes("SALES") || p.includes("CUSTOMER") || p.includes("SHIPMENT")
    ),
    Quality: Object.values(Permission).filter((p) =>
      p.includes("QUALITY") || p.includes("INSPECTION")
    ),
    Mobile: Object.values(Permission).filter((p) => p.includes("MOBILE")),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Custom Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Create multiple role variants for different job functions
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Custom Role
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">Examples</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Operators:</strong> "Capping Machine Operator", "Welding Operator", "Assembly Line Worker"</li>
            <li><strong>Sales:</strong> "Inside Sales Rep", "Field Sales Rep", "Account Manager"</li>
            <li><strong>Engineering:</strong> "Process Engineer", "Quality Engineer", "Design Engineer"</li>
          </ul>
        </CardContent>
      </Card>

      {/* Existing Custom Roles */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Your Custom Roles</h2>
        {customRoles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-lg">{role.customName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      Based on {getRoleDisplayName(role.baseRole)}
                      {getRoleTierBadge(role.baseRole)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="outline">
                      <Users className="mr-1 h-3 w-3" />
                      {role.userCount} users
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.assignedDepartments.map((dept) => (
                    <Badge key={dept} variant="secondary" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {role.permissions.length} permissions assigned
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Custom Role Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Create Custom Role
            </DialogTitle>
            <DialogDescription>
              Define a new role variant with specific permissions and department access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Base Role */}
            <div className="space-y-2">
              <Label>Base Role Tier</Label>
              <Select value={baseRole} onValueChange={(value) => setBaseRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customizableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)} {getRoleTierBadge(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the tier this role belongs to
              </p>
            </div>

            {/* Custom Name */}
            <div className="space-y-2">
              <Label>Custom Role Name *</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Capping Machine Operator"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this role's responsibilities..."
                rows={3}
              />
            </div>

            {/* Department Assignment */}
            <div className="space-y-2">
              <Label>Assigned Departments</Label>
              <div className="grid grid-cols-3 gap-2">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={dept.id}
                      checked={selectedDepartments.includes(dept.id)}
                      onCheckedChange={() => toggleDepartment(dept.id)}
                    />
                    <label
                      htmlFor={dept.id}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {dept.name}
                    </label>
                  </div>
                ))}
              </div>
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
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!customName}>
              <Save className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
