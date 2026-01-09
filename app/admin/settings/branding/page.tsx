"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Palette, Image, Code, Save, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Branding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  favicon?: string;
  customCSS?: string;
}

export default function BrandingSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery<{ branding: Branding }>({
    queryKey: ["/api/tenant/branding"],
  });

  const [formData, setFormData] = useState<Branding>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when data loads
  useState(() => {
    if (branding?.branding) {
      setFormData(branding.branding);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Branding) => {
      const response = await fetch("/api/tenant/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandLogo: data.logo,
          brandColor: data.primaryColor,
          brandColorSecondary: data.secondaryColor,
          favicon: data.favicon,
          customCSS: data.customCSS,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update branding");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/switch-tenant"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Branding updated successfully. Refresh to see changes.",
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

  const handleChange = (field: keyof Branding, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (branding?.branding) {
      setFormData(branding.branding);
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
        <h1 className="text-3xl font-bold tracking-tight">Company Branding</h1>
        <p className="text-muted-foreground">
          Customize your company's appearance throughout the application
        </p>
      </div>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo & Images
          </CardTitle>
          <CardDescription>
            Upload your company logo and favicon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo URL</Label>
            <Input
              id="logo"
              type="url"
              placeholder="https://example.com/logo.png"
              value={formData.logo || ""}
              onChange={(e) => handleChange("logo", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Recommended: PNG or SVG, transparent background, 200x50px
            </p>
            {formData.logo && (
              <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <img
                  src={formData.logo}
                  alt="Logo preview"
                  className="h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon URL</Label>
            <Input
              id="favicon"
              type="url"
              placeholder="https://example.com/favicon.ico"
              value={formData.favicon || ""}
              onChange={(e) => handleChange("favicon", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Recommended: ICO or PNG, 32x32px or 64x64px
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Color Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Define your company's color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor || "#3b82f6"}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  placeholder="#3b82f6"
                  value={formData.primaryColor || ""}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main brand color for buttons and accents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor || "#64748b"}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  placeholder="#64748b"
                  value={formData.secondaryColor || ""}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Secondary color for supporting elements
              </p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-3">Preview:</p>
            <div className="flex gap-2">
              <div
                className="h-16 w-16 rounded-lg border"
                style={{ backgroundColor: formData.primaryColor || "#3b82f6" }}
              />
              <div
                className="h-16 w-16 rounded-lg border"
                style={{ backgroundColor: formData.secondaryColor || "#64748b" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Advanced Styling
          </CardTitle>
          <CardDescription>
            Add custom CSS for advanced customization (use with caution)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customCSS">Custom CSS</Label>
            <Textarea
              id="customCSS"
              placeholder=".header { font-size: 18px; }"
              value={formData.customCSS || ""}
              onChange={(e) => handleChange("customCSS", e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Advanced users only. Invalid CSS may break the UI.
            </p>
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

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> After saving branding changes, refresh your browser to see the updates applied throughout the application.
            Some changes may require clearing your browser cache.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
