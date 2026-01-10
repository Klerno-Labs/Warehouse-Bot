"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompanyInfoStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export function CompanyInfoStep({ data, onUpdate, onNext }: CompanyInfoStepProps) {
  const [formData, setFormData] = useState({
    name: data?.company?.name || "",
    industry: data?.company?.industry || "",
    size: data?.company?.size || "",
    timezone: data?.company?.timezone || "America/New_York",
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate({ company: updated });
  };

  const isValid = formData.name && formData.industry && formData.size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Tell us about your company</h2>
            <p className="text-muted-foreground">
              This helps us customize your experience
            </p>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why we ask:</strong> Your industry and company size help us recommend the right department templates and workflows in the next steps.
        </AlertDescription>
      </Alert>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-base">
            Company name *
          </Label>
          <Input
            id="company-name"
            placeholder="Acme Manufacturing"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="text-lg"
            autoFocus
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry" className="text-base">
            Industry *
          </Label>
          <Select
            value={formData.industry}
            onValueChange={(value) => handleChange("industry", value)}
          >
            <SelectTrigger id="industry" className="text-lg">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automotive">Automotive & Parts</SelectItem>
              <SelectItem value="electronics">Electronics & Technology</SelectItem>
              <SelectItem value="food-beverage">Food & Beverage</SelectItem>
              <SelectItem value="industrial">Industrial Equipment</SelectItem>
              <SelectItem value="medical">Medical Devices</SelectItem>
              <SelectItem value="packaging">Packaging & Printing</SelectItem>
              <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
              <SelectItem value="plastics">Plastics & Polymers</SelectItem>
              <SelectItem value="textiles">Textiles & Apparel</SelectItem>
              <SelectItem value="other">Other Manufacturing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <Label htmlFor="company-size" className="text-base">
            Company size *
          </Label>
          <Select
            value={formData.size}
            onValueChange={(value) => handleChange("size", value)}
          >
            <SelectTrigger id="company-size" className="text-lg">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="500+">500+ employees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-base">
            Timezone
          </Label>
          <Select
            value={formData.timezone}
            onValueChange={(value) => handleChange("timezone", value)}
          >
            <SelectTrigger id="timezone" className="text-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
              <SelectItem value="America/Chicago">Central (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
              <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
              <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
              <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Used for scheduling and reporting
          </p>
        </div>
      </div>

      {/* Validation Message */}
      {!isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            Please fill in all required fields to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
