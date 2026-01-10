"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Package,
  Wrench,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Plus,
  X,
  Check,
  Info,
} from "lucide-react";

interface DepartmentsStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const DEPARTMENT_TEMPLATES = [
  {
    id: "inventory",
    name: "Inventory",
    icon: Package,
    description: "Stock management, receiving, putaway",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "picking",
    name: "Picking & Packing",
    icon: ShoppingCart,
    description: "Order fulfillment, shipping prep",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "assembly",
    name: "Assembly",
    icon: Wrench,
    description: "Production, manufacturing",
    color: "bg-orange-100 text-orange-700",
  },
  {
    id: "qc",
    name: "Quality Control",
    icon: ShieldCheck,
    description: "Inspection, testing, compliance",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "sales",
    name: "Sales",
    icon: Users,
    description: "Customer orders, quotes",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "shipping",
    name: "Shipping",
    icon: Truck,
    description: "Outbound logistics, carriers",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    id: "maintenance",
    name: "Maintenance",
    icon: Wrench,
    description: "Equipment, facilities",
    color: "bg-amber-100 text-amber-700",
  },
];

export function DepartmentsStep({ data, onUpdate, onNext }: DepartmentsStepProps) {
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    data?.departments || []
  );
  const [customDept, setCustomDept] = useState("");
  const [customDepts, setCustomDepts] = useState<string[]>([]);

  const toggleDepartment = (deptId: string) => {
    const updated = selectedDepts.includes(deptId)
      ? selectedDepts.filter((id) => id !== deptId)
      : [...selectedDepts, deptId];
    setSelectedDepts(updated);
    onUpdate({ departments: updated.concat(customDepts) });
  };

  const addCustomDepartment = () => {
    if (customDept.trim()) {
      const updated = [...customDepts, customDept.trim()];
      setCustomDepts(updated);
      setCustomDept("");
      onUpdate({ departments: selectedDepts.concat(updated) });
    }
  };

  const removeCustomDepartment = (dept: string) => {
    const updated = customDepts.filter((d) => d !== dept);
    setCustomDepts(updated);
    onUpdate({ departments: selectedDepts.concat(updated) });
  };

  const totalDepts = selectedDepts.length + customDepts.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Set up your departments</h2>
            <p className="text-muted-foreground">
              Choose from templates or create custom ones
            </p>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why departments matter:</strong> Each department gets its own workflow, permissions, and dashboard views. Operators will only see jobs for their department.
        </AlertDescription>
      </Alert>

      {/* Templates */}
      <div>
        <h3 className="font-semibold mb-4">Pre-built templates</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedDepts.includes(template.id);

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => toggleDepartment(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${template.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold mb-1">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Departments */}
      <div>
        <h3 className="font-semibold mb-4">Custom departments</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom department name"
            value={customDept}
            onChange={(e) => setCustomDept(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomDepartment();
              }
            }}
          />
          <Button onClick={addCustomDepartment} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {customDepts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customDepts.map((dept) => (
              <Badge key={dept} variant="secondary" className="text-sm py-1.5 px-3">
                {dept}
                <button
                  onClick={() => removeCustomDepartment(dept)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm">
          <strong>{totalDepts}</strong> department{totalDepts !== 1 ? "s" : ""} selected
          {totalDepts > 0 && ": "}
          {selectedDepts
            .map((id) => DEPARTMENT_TEMPLATES.find((t) => t.id === id)?.name)
            .concat(customDepts)
            .join(", ")}
        </p>
        {totalDepts === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Select at least one department to continue
          </p>
        )}
      </div>

      {/* Validation */}
      {totalDepts === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Please select at least one department to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
