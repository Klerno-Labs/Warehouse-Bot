"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Plus, Trash2, Edit, RefreshCw, Shield } from "lucide-react";

/**
 * Badge Management - For Executives
 * Create and manage employee badges for mobile app access
 */
export default function BadgeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [badgeNumber, setBadgeNumber] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  // Fetch all badges
  const { data: badgesData, isLoading } = useQuery({
    queryKey: ["/api/admin/badges"],
    queryFn: async () => {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
  });

  // Fetch users without badges
  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users?withoutBadge=true"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?withoutBadge=true");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const badges = badgesData?.badges || [];
  const availableUsers = usersData?.users || [];

  // Create badge mutation
  const createBadgeMutation = useMutation({
    mutationFn: async (data: { badgeNumber: string; userId: string }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Badge created successfully",
      });
      setIsCreating(false);
      setBadgeNumber("");
      setSelectedUser("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate badge mutation
  const deactivateBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const res = await fetch(`/api/admin/badges/${badgeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to deactivate badge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] });
      toast({
        title: "Success",
        description: "Badge deactivated successfully",
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

  const generateBadgeNumber = () => {
    const prefix = "B";
    const number = Math.floor(10000 + Math.random() * 90000);
    setBadgeNumber(`${prefix}${number}`);
  };

  const handleCreateBadge = () => {
    if (!badgeNumber || !selectedUser) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createBadgeMutation.mutate({ badgeNumber, userId: selectedUser });
  };

  const handleDeactivate = (badgeId: string) => {
    if (confirm("Are you sure you want to deactivate this badge? The user will no longer be able to use mobile login.")) {
      deactivateBadgeMutation.mutate(badgeId);
    }
  };

  return (
    <div className="p-6 space-y-6">
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
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Badge
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Badge System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
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
            {badges.filter((b: any) => b.isActive).length} active badge{badges.filter((b: any) => b.isActive).length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading badges...</div>
          ) : badges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No badges created yet. Create your first badge to enable mobile access for operators.
            </div>
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
                {badges.map((badge: any) => (
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
                          onClick={() => handleDeactivate(badge.id)}
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
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Create New Badge
            </DialogTitle>
            <DialogDescription>
              Assign a badge number to an employee for mobile app access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                5-digit badge number starting with 'B'
              </p>
            </div>

            <div className="space-y-2">
              <Label>Assign to User *</Label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.email} ({user.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only showing users without active badges
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBadge}
              disabled={!badgeNumber || !selectedUser || createBadgeMutation.isPending}
            >
              {createBadgeMutation.isPending ? "Creating..." : "Create Badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
