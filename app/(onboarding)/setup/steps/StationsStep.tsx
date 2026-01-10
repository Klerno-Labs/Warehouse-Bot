"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Monitor, Tv, Printer, Plus, X, Info } from "lucide-react";

interface Station {
  name: string;
  deviceType: string;
  department: string;
}

interface StationsStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const DEVICE_TYPES = [
  { value: "tablet", label: "Tablet", icon: Smartphone, description: "Mobile operators" },
  { value: "workstation", label: "Workstation", icon: Monitor, description: "Desktop stations" },
  { value: "tv-board", label: "TV Board", icon: Tv, description: "Wall displays" },
  { value: "printer", label: "Label Printer", icon: Printer, description: "QR/barcode printing" },
];

export function StationsStep({ data, onUpdate, onNext }: StationsStepProps) {
  const [stations, setStations] = useState<Station[]>(
    data?.stations || [{ name: "", deviceType: "", department: "" }]
  );

  const departments = data?.departments || [];

  const updateStation = (index: number, field: string, value: string) => {
    const updated = [...stations];
    updated[index] = { ...updated[index], [field]: value };
    setStations(updated);
    onUpdate({ stations: updated });
  };

  const addStation = () => {
    const updated = [...stations, { name: "", deviceType: "", department: "" }];
    setStations(updated);
    onUpdate({ stations: updated });
  };

  const removeStation = (index: number) => {
    const updated = stations.filter((_, i) => i !== index);
    setStations(updated);
    onUpdate({ stations: updated });
  };

  const validStations = stations.filter(
    (s) => s.name && s.deviceType && s.department
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Map your devices to departments</h2>
            <p className="text-muted-foreground">
              Connect tablets, workstations, and displays
            </p>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why this matters:</strong> Each device knows which department it belongs to. Operators see only their department's jobs. TV boards display their department's queue.
        </AlertDescription>
      </Alert>

      {/* Stations List */}
      <div className="space-y-4">
        {stations.map((station, index) => {
          const DeviceIcon = DEVICE_TYPES.find(
            (t) => t.value === station.deviceType
          )?.icon || Monitor;

          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <DeviceIcon className="h-5 w-5" />
                  </div>

                  <div className="grid flex-1 gap-4 sm:grid-cols-3">
                    {/* Device Name */}
                    <div className="space-y-2">
                      <Label htmlFor={`station-name-${index}`} className="text-sm">
                        Device name
                      </Label>
                      <Input
                        id={`station-name-${index}`}
                        placeholder="Station 1"
                        value={station.name}
                        onChange={(e) =>
                          updateStation(index, "name", e.target.value)
                        }
                      />
                    </div>

                    {/* Device Type */}
                    <div className="space-y-2">
                      <Label htmlFor={`station-type-${index}`} className="text-sm">
                        Device type
                      </Label>
                      <Select
                        value={station.deviceType}
                        onValueChange={(value) =>
                          updateStation(index, "deviceType", value)
                        }
                      >
                        <SelectTrigger id={`station-type-${index}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVICE_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <Label htmlFor={`station-dept-${index}`} className="text-sm">
                        Department
                      </Label>
                      <Select
                        value={station.department}
                        onValueChange={(value) =>
                          updateStation(index, "department", value)
                        }
                      >
                        <SelectTrigger id={`station-dept-${index}`}>
                          <SelectValue placeholder="Select dept" />
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
                  </div>

                  {/* Remove Button */}
                  {stations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStation(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Station Button */}
      <Button onClick={addStation} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Device
      </Button>

      {/* Device Type Reference */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-3">Device type reference:</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEVICE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.value} className="flex items-start gap-2">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {type.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm">
          <strong>{validStations.length}</strong> device{validStations.length !== 1 ? "s" : ""} configured
        </p>
        {validStations.length === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Configure at least one device to continue
          </p>
        )}
      </div>
    </div>
  );
}
