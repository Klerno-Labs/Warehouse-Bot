"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Trash2, Edit, UserPlus, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type DepartmentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  badgeNumber?: string;
  role: string;
  department: string;
  isActive: boolean;
};

/**
 * Department User Management - For Supervisors/Managers
 * Add, edit, and remove users within their department
 */
export default function DepartmentUserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<DepartmentUser | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [userToDelete, setUserToDelete] = useState<DepartmentUser | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>([]);

  // Fetch departments (hardcoded for now, should come from API)
  const departments = [
    { id: "assembly", name: "Assembly" },
    { id: "capping", name: "Capping" },
    { id: "welding", name: "Welding" },
    { id: "packaging", name: "Packaging" },
    { id: "quality", name: "Quality Control" },
  ];

  // Fetch users in department
  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: DepartmentUser[] }>({
    queryKey: ["/api/admin/department-users", selectedDepartment],
    queryFn: async () => {
      const url = selectedDepartment
        ? `/api/admin/department-users?department=${selectedDepartment}`
        : "/api/admin/department-users";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const departmentUsers: DepartmentUser[] = usersData?.users || [];

  // Fetch available custom roles
  const { data: rolesData } = useQuery({
    queryKey: ["/api/admin/roles/custom"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles/custom");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const availableRoles = rolesData?.roles || [];

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch("/api/admin/department-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/department-users"] });
      toast({
        title: "Success",
        description: "User added successfully",
      });
      setIsAddingUser(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/department-users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/department-users"] });
      toast({
        title: "Success",
        description: "User removed successfully",
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

  const handleAddUser = () => {
    addUserMutation.mutate({
      email,
      firstName,
      lastName,
      badgeNumber,
      pin,
      roleId: selectedRole || null,
      assignedDepartments,
    });
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setBadgeNumber("");
    setPin("");
    setSelectedRole("");
    setAssignedDepartments([]);
  };

  const generateBadgeNumber = () => {
    const prefix = "B";
    const number = Math.floor(1000 + Math.random() * 9000);
    setBadgeNumber(`${prefix}${number}`);
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(pin);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Department Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users in your department
          </p>
        </div>
        <Button onClick={() => setIsAddingUser(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manager Access
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <p>
            As a manager, you can add and remove users within your department(s).
            You can assign them to custom roles and set up their mobile access.
          </p>
        </CardContent>
      </Card>

      {/* Department Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Users</CardTitle>
          <CardDescription>
            {departmentUsers.length} users in your department{selectedDepartment ? `s - ${selectedDepartment}` : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Badge #</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentUsers.map((depUser) => (
                <TableRow key={depUser.id}>
                  <TableCell className="font-medium">
                    {depUser.firstName} {depUser.lastName}
                  </TableCell>
                  <TableCell>{depUser.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{depUser.badgeNumber}</Badge>
                  </TableCell>
                  <TableCell>{depUser.role}</TableCell>
                  <TableCell>{depUser.department}</TableCell>
                  <TableCell>
                    <Badge variant={depUser.isActive ? "default" : "secondary"}>
                      {depUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingUser(depUser)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => setUserToDelete(depUser)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account for your department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Number *</Label>
                <div className="flex gap-2">
                  <Input
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    placeholder="B1001"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateBadgeNumber}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>PIN (4 digits) *</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                  />
                  <Button type="button" variant="outline" onClick={generatePin}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.customName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose from your custom roles
              </p>
            </div>

            <div className="space-y-2">
              <Label>Assigned Departments *</Label>
              <div className="grid grid-cols-2 gap-2">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={dept.id}
                      checked={assignedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignedDepartments([...assignedDepartments, dept.id]);
                        } else {
                          setAssignedDepartments(
                            assignedDepartments.filter((d) => d !== dept.id)
                          );
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={dept.id} className="text-sm cursor-pointer">
                      {dept.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingUser(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!email || !firstName || !lastName || !badgeNumber || !pin || !selectedRole}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Remove User"
        description={`Are you sure you want to remove ${userToDelete?.firstName} ${userToDelete?.lastName} from this department? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        confirmLabel="Remove"
        variant="destructive"
      />
    </div>
  );
}
