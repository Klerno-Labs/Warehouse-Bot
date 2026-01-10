"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Briefcase, Info, Sparkles } from "lucide-react";

interface FirstJobStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export function FirstJobStep({ data, onUpdate, onNext }: FirstJobStepProps) {
  const [formData, setFormData] = useState({
    name: data?.firstJob?.name || "",
    sku: data?.firstJob?.sku || "",
    quantity: data?.firstJob?.quantity || 1,
    department: data?.firstJob?.department || "",
    notes: data?.firstJob?.notes || "",
  });

  const departments = data?.departments || [];

  const handleChange = (field: string, value: string | number) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate({ firstJob: updated });
  };

  const isValid = formData.name && formData.sku && formData.quantity > 0 && formData.department;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Create your first production job</h2>
            <p className="text-muted-foreground">
              Let's walk through creating a simple job
            </p>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>This is a walkthrough:</strong> We'll guide you through creating a sample job. You can delete it later. This helps you understand the workflow.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="job-name" className="text-base">
            Job name *
          </Label>
          <Input
            id="job-name"
            placeholder="e.g., Assemble Widget A"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="text-lg"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-sku" className="text-base">
              SKU / Part number *
            </Label>
            <Input
              id="job-sku"
              placeholder="e.g., WIDGET-001"
              value={formData.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-quantity" className="text-base">
              Quantity *
            </Label>
            <Input
              id="job-quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-department" className="text-base">
            Assign to department *
          </Label>
          <Select
            value={formData.department}
            onValueChange={(value) => handleChange("department", value)}
          >
            <SelectTrigger id="job-department" className="text-lg">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept: string) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-notes" className="text-base">
            Job notes (optional)
          </Label>
          <Textarea
            id="job-notes"
            placeholder="Any special instructions or notes..."
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* What happens next */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>What happens next:</strong> This job will appear on the dashboard for the selected department. Operators can scan a QR code to start working on it.
        </AlertDescription>
      </Alert>

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
