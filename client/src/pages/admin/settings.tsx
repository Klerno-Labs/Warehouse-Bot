import { Settings, Building2, Bell, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";

export default function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-settings-title">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage tenant and system configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            <Building2 className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">
            <Database className="mr-2 h-4 w-4" />
            Modules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Tenant Information</CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Organization Name</Label>
                  <Input
                    id="tenant-name"
                    defaultValue={user?.tenantName || "Acme Warehouse"}
                    data-testid="input-tenant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">URL Slug</Label>
                  <Input
                    id="tenant-slug"
                    defaultValue="acme"
                    data-testid="input-tenant-slug"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button data-testid="button-save-general">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts when inventory falls below threshold
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-low-stock" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Job Completion Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when production jobs are completed
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-job-complete" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders for scheduled maintenance
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-maintenance" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summary via email
                    </p>
                  </div>
                  <Switch data-testid="switch-email-digest" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Security Settings</CardTitle>
              <CardDescription>
                Configure authentication and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Strong Passwords</Label>
                    <p className="text-sm text-muted-foreground">
                      Enforce minimum 12 characters with special characters
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-strong-passwords" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out after inactivity
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-session-timeout" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit All Actions</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all user actions to the audit trail
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-audit-all" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Module Configuration</CardTitle>
              <CardDescription>
                Enable or disable modules for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { id: "inventory", name: "Inventory", description: "Stock management and tracking" },
                  { id: "jobs", name: "Jobs", description: "Production job management" },
                  { id: "purchasing", name: "Purchasing", description: "Purchase order management" },
                  { id: "cycle-counts", name: "Cycle Counts", description: "Inventory auditing" },
                  { id: "maintenance", name: "Maintenance", description: "Equipment maintenance tracking" },
                  { id: "sales-atp", name: "Sales ATP", description: "Available to promise reporting" },
                  { id: "dashboards", name: "Dashboards", description: "Analytics and reporting" },
                ].map((module, idx) => (
                  <div key={module.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{module.name}</Label>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                      <Switch defaultChecked data-testid={`switch-module-${module.id}`} />
                    </div>
                    {idx < 6 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
