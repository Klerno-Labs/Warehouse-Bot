"use client";

import { Shield, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RolesStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const ROLE_PERMISSIONS = {
  operator: ["Scan jobs", "View job details", "Add notes", "Complete tasks"],
  supervisor: ["All operator permissions", "Approve jobs", "View team metrics", "Manage department"],
  inventory: ["Manage stock levels", "Process receiving", "Create transfers", "Run reports"],
  sales: ["View inventory", "Create quotes", "Manage customers", "Track orders"],
  executive: ["View all analytics", "Access all departments", "Manage users", "System settings"],
};

export function RolesStep({ data, onUpdate, onNext }: RolesStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Role-based permissions</h2>
            <p className="text-muted-foreground">
              Pre-configured roles for your team
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Auto-configured:</strong> We've set up smart defaults based on your industry and company size. You can customize these later with our drag-and-drop role editor.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => (
          <Card key={role}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg capitalize">{role}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {permissions.length} permissions
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>Next step:</strong> After setup, you can use our visual drag-and-drop interface to customize permissions or create new roles.
        </AlertDescription>
      </Alert>
    </div>
  );
}
