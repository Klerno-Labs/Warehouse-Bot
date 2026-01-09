"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Globe, Briefcase, Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantSettings {
  id: string;
  currency: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  fiscalYearStart: number;
  workWeekDays: number[];
  defaultUOM: string;
  requirePOApproval: boolean;
  poApprovalLimit?: number;
  autoReceivePos: boolean;
  autoReleasePOs: boolean;
  defaultLeadTime: number;
  allowNegativeInventory: boolean;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "INR"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ settings: TenantSettings }>({
    queryKey: ["/api/tenant/settings"],
  });

  const [formData, setFormData] = useState<Partial<TenantSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setFormData(data.settings);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      const response = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/settings"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Company settings updated successfully.",
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

  const handleChange = (field: keyof TenantSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (data?.settings) {
      setFormData(data.settings);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Configure regional preferences and business rules
        </p>
      </div>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Localization and formatting preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange("timezone", value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(value) => handleChange("dateFormat", value)}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select
                value={formData.timeFormat}
                onValueChange={(value) => handleChange("timeFormat", value)}
              >
                <SelectTrigger id="timeFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Business Configuration
          </CardTitle>
          <CardDescription>
            Define your operational parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
              <Select
                value={formData.fiscalYearStart?.toString()}
                onValueChange={(value) => handleChange("fiscalYearStart", parseInt(value))}
              >
                <SelectTrigger id="fiscalYearStart">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultUOM">Default Unit of Measure</Label>
              <Select
                value={formData.defaultUOM}
                onValueChange={(value) => handleChange("defaultUOM", value)}
              >
                <SelectTrigger id="defaultUOM">
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">Each (EA)</SelectItem>
                  <SelectItem value="FT">Feet (FT)</SelectItem>
                  <SelectItem value="YD">Yards (YD)</SelectItem>
                  <SelectItem value="ROLL">Roll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLeadTime">Default Lead Time (days)</Label>
              <Input
                id="defaultLeadTime"
                type="number"
                min="0"
                value={formData.defaultLeadTime || 7}
                onChange={(e) => handleChange("defaultLeadTime", parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Workflow Preferences
          </CardTitle>
          <CardDescription>
            Customize approval processes and automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require PO Approval</Label>
              <p className="text-sm text-muted-foreground">
                Purchase orders must be approved before sending
              </p>
            </div>
            <Switch
              checked={formData.requirePOApproval}
              onCheckedChange={(checked) => handleChange("requirePOApproval", checked)}
            />
          </div>

          {formData.requirePOApproval && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="poApprovalLimit">Approval Required Above ($)</Label>
              <Input
                id="poApprovalLimit"
                type="number"
                min="0"
                step="100"
                placeholder="Leave empty for all POs"
                value={formData.poApprovalLimit || ""}
                onChange={(e) => handleChange("poApprovalLimit", e.target.value ? parseFloat(e.target.value) : null)}
              />
              <p className="text-xs text-muted-foreground">
                POs above this amount require approval. Leave empty to require approval for all POs.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Receive POs</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create receipts when POs are approved
              </p>
            </div>
            <Switch
              checked={formData.autoReceivePos}
              onCheckedChange={(checked) => handleChange("autoReceivePos", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Release POs</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send approved POs to suppliers
              </p>
            </div>
            <Switch
              checked={formData.autoReleasePOs}
              onCheckedChange={(checked) => handleChange("autoReleasePOs", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Negative Inventory</Label>
              <p className="text-sm text-muted-foreground">
                Permit inventory balances to go below zero
              </p>
            </div>
            <Switch
              checked={formData.allowNegativeInventory}
              onCheckedChange={(checked) => handleChange("allowNegativeInventory", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
