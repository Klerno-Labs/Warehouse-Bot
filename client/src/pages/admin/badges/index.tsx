"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { CreditCard, Plus, Trash2, RefreshCw, Shield } from "lucide-react";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialog, ConfirmDialog } from "@/components/ui/form-dialog";
import { useCRUD } from "@/hooks/use-crud";

interface BadgeItem {
  id: string;
  badgeNumber: string;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

/**
 * Badge Management - For Executives
 * Create and manage employee badges for mobile app access
 *
 * Refactored to use reusable useCRUD hook and FormDialog components
 */
export default function BadgeManagement() {
  // Form state
  const [badgeNumber, setBadgeNumber] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch users without badges for the dropdown
  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users?withoutBadge=true"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?withoutBadge=true");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const availableUsers: User[] = usersData?.users || [];

  // CRUD operations via hook
  const crud = useCRUD<BadgeItem>({
    queryKey: ["/api/admin/badges"],
    queryFn: async () => {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) throw new Error("Failed to fetch badges");
      const data = await res.json();
      return data.badges || [];
    },
    createFn: async (data) => {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create badge");
      }
      return res.json();
    },
    deleteFn: async (id) => {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to deactivate badge");
    },
    entityName: "Badge",
    getId: (badge) => badge.id,
    getName: (badge) => badge.badgeNumber,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!crud.isCreateOpen) {
      setBadgeNumber("");
      setSelectedUserId("");
    }
  }, [crud.isCreateOpen]);

  const generateBadgeNumber = () => {
    const prefix = "B";
    const number = Math.floor(10000 + Math.random() * 90000);
    setBadgeNumber(`${prefix}${number}`);
  };

  const handleCreate = async () => {
    await crud.create({ badgeNumber, userId: selectedUserId });
  };

  const activeBadges = crud.items.filter((b) => b.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Badge Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage employee badges for mobile app access
          </p>
        </div>
        <Button onClick={crud.openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Badge
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Badge System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p>
            Badges allow employees to log into the mobile operator app using their badge number and a 4-digit PIN.
            Each badge is unique and tied to a specific user account.
          </p>
        </CardContent>
      </Card>

      {/* Badges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Badges</CardTitle>
          <CardDescription>
            {activeBadges.length} active badge{activeBadges.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crud.isLoading ? (
            <InlineLoading message="Loading badges..." />
          ) : crud.items.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No badges created"
              description="Create badges to enable mobile access for operators."
              actions={[{ label: "Create Badge", onClick: crud.openCreate, icon: Plus }]}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge Number</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crud.items.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell className="font-mono font-semibold">
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {badge.badgeNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {badge.user.firstName} {badge.user.lastName}
                    </TableCell>
                    <TableCell>{badge.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{badge.user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.isActive ? "default" : "secondary"}>
                        {badge.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {badge.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => crud.openDelete(badge)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Badge Dialog */}
      <FormDialog
        open={crud.isCreateOpen}
        onOpenChange={(open) => !open && crud.closeCreate()}
        title="Create New Badge"
        description="Assign a badge number to an employee for mobile app access"
        onSubmit={handleCreate}
        isSubmitting={crud.isCreating}
        submitLabel="Create Badge"
        submitDisabled={!badgeNumber || !selectedUserId}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Badge Number *</Label>
            <div className="flex gap-2">
              <Input
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="B10001"
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={generateBadgeNumber}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              5-digit badge number starting with &apos;B&apos;
            </p>
          </div>

          <div className="space-y-2">
            <Label>Assign to User *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only showing users without active badges
            </p>
          </div>
        </div>
      </FormDialog>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={crud.isDeleteOpen}
        onOpenChange={crud.closeDelete}
        title="Deactivate Badge"
        description={`Are you sure you want to deactivate badge "${crud.deletingItem?.badgeNumber}"? The user will no longer be able to use mobile login.`}
        onConfirm={crud.remove}
        confirmLabel="Deactivate"
        isLoading={crud.isDeleting}
        variant="destructive"
      />
    </div>
  );
}
