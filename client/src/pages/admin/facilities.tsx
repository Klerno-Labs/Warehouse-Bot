"use client";

import { useState } from "react";
import { Building2, Plus, Settings, MapPin, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormDialog, ConfirmDialog } from "@/components/ui/form-dialog";
import { MetricCard, MetricGrid } from "@/components/dashboard/metric-card";

interface Workcell {
  id: string;
  name: string;
  status: string;
  devices: number;
}

interface Department {
  id: string;
  name: string;
  workcells: Workcell[];
}

const initialFacilitiesData = {
  site: {
    name: "Main Warehouse",
    address: "123 Industrial Way, City, ST 12345",
  },
  departments: [
    {
      id: "1",
      name: "Receiving",
      workcells: [
        { id: "w1", name: "Receiving Dock 1", status: "active", devices: 2 },
        { id: "w2", name: "Receiving Dock 2", status: "active", devices: 1 },
      ],
    },
    {
      id: "2",
      name: "Stockroom/Kitting",
      workcells: [
        { id: "w3", name: "Kitting Station A", status: "active", devices: 3 },
        { id: "w4", name: "Kitting Station B", status: "maintenance", devices: 2 },
      ],
    },
    {
      id: "3",
      name: "Production",
      workcells: [
        { id: "w5", name: "Pleater 1", status: "active", devices: 4 },
        { id: "w6", name: "Assembly Line 1", status: "active", devices: 3 },
      ],
    },
    {
      id: "4",
      name: "Packing/Shipping",
      workcells: [
        { id: "w7", name: "Packing Station 1", status: "active", devices: 2 },
        { id: "w8", name: "Shipping Dock", status: "active", devices: 1 },
      ],
    },
  ],
};

export default function AdminFacilitiesPage() {
  const [facilitiesData, setFacilitiesData] = useState(initialFacilitiesData);

  // Dialog states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addWorkcellOpen, setAddWorkcellOpen] = useState(false);
  const [editWorkcellOpen, setEditWorkcellOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Selection states
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedWorkcell, setSelectedWorkcell] = useState<Workcell | null>(null);
  const [workcellToDelete, setWorkcellToDelete] = useState<{ deptId: string; workcell: Workcell } | null>(null);

  // Form state
  const [newWorkcell, setNewWorkcell] = useState({
    name: "",
    status: "active",
    devices: 1,
  });

  // Computed stats
  const totalWorkcells = facilitiesData.departments.reduce((acc, d) => acc + d.workcells.length, 0);
  const activeWorkcells = facilitiesData.departments.reduce(
    (acc, d) => acc + d.workcells.filter((w) => w.status === "active").length,
    0
  );
  const totalDevices = facilitiesData.departments.reduce(
    (acc, d) => acc + d.workcells.reduce((a, w) => a + w.devices, 0),
    0
  );

  const handleAddWorkcell = () => {
    if (!selectedDepartment || !newWorkcell.name) return;

    const newId = `w${Date.now()}`;
    setFacilitiesData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.id === selectedDepartment
          ? {
              ...dept,
              workcells: [...dept.workcells, { id: newId, ...newWorkcell }],
            }
          : dept
      ),
    }));

    setNewWorkcell({ name: "", status: "active", devices: 1 });
    setSelectedDepartment("");
    setAddWorkcellOpen(false);
  };

  const handleDeleteWorkcell = () => {
    if (!workcellToDelete) return;

    setFacilitiesData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.id === workcellToDelete.deptId
          ? {
              ...dept,
              workcells: dept.workcells.filter((w) => w.id !== workcellToDelete.workcell.id),
            }
          : dept
      ),
    }));

    setWorkcellToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleEditWorkcell = () => {
    if (!selectedWorkcell || !selectedDepartment) return;

    setFacilitiesData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.id === selectedDepartment
          ? {
              ...dept,
              workcells: dept.workcells.map((w) =>
                w.id === selectedWorkcell.id ? selectedWorkcell : w
              ),
            }
          : dept
      ),
    }));

    setSelectedWorkcell(null);
    setSelectedDepartment("");
    setEditWorkcellOpen(false);
  };

  const openEditDialog = (deptId: string, workcell: Workcell) => {
    setSelectedDepartment(deptId);
    setSelectedWorkcell({ ...workcell });
    setEditWorkcellOpen(true);
  };

  const openDeleteDialog = (deptId: string, workcell: Workcell) => {
    setWorkcellToDelete({ deptId, workcell });
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Facilities</h1>
            <p className="text-sm text-muted-foreground">
              Configure sites, departments, workcells, and devices
            </p>
          </div>
        </div>
        <Button onClick={() => setAddWorkcellOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Workcell
        </Button>
      </div>

      {/* Site Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {facilitiesData.site.name}
                </CardTitle>
                <CardDescription>{facilitiesData.site.address}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={["1"]}>
            {facilitiesData.departments.map((dept) => (
              <AccordionItem key={dept.id} value={dept.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{dept.name}</span>
                    <Badge variant="secondary" className="font-normal">
                      {dept.workcells.length} workcells
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    {dept.workcells.map((workcell) => (
                      <div
                        key={workcell.id}
                        className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              workcell.status === "active"
                                ? "bg-green-500"
                                : workcell.status === "maintenance"
                                ? "bg-amber-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">{workcell.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {workcell.devices} devices
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={workcell.status === "active" ? "default" : "secondary"}>
                            {workcell.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(dept.id, workcell)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(dept.id, workcell)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <MetricGrid columns={3}>
        <MetricCard
          title="Total Workcells"
          value={totalWorkcells}
          icon={Building2}
          animate={false}
        />
        <MetricCard
          title="Active Workcells"
          value={activeWorkcells}
          icon={Building2}
          variant="success"
          animate={false}
        />
        <MetricCard
          title="Total Devices"
          value={totalDevices}
          icon={Settings}
          animate={false}
        />
      </MetricGrid>

      {/* Settings Dialog */}
      <FormDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Facility Settings"
        description="Manage your warehouse configuration"
        size="lg"
        onSubmit={() => setSettingsOpen(false)}
        submitLabel="Save Changes"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Facility Name</Label>
            <Input
              value={facilitiesData.site.name}
              onChange={(e) =>
                setFacilitiesData((prev) => ({
                  ...prev,
                  site: { ...prev.site, name: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={facilitiesData.site.address}
              onChange={(e) =>
                setFacilitiesData((prev) => ({
                  ...prev,
                  site: { ...prev.site, address: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </FormDialog>

      {/* Add Workcell Dialog */}
      <FormDialog
        open={addWorkcellOpen}
        onOpenChange={setAddWorkcellOpen}
        title="Add New Workcell"
        description="Create a new workcell in a department"
        onSubmit={handleAddWorkcell}
        submitLabel="Add Workcell"
        submitDisabled={!selectedDepartment || !newWorkcell.name}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {facilitiesData.departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Workcell Name</Label>
            <Input
              placeholder="e.g., Assembly Line 2"
              value={newWorkcell.name}
              onChange={(e) => setNewWorkcell((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={newWorkcell.status}
              onValueChange={(value) => setNewWorkcell((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Number of Devices</Label>
            <Input
              type="number"
              min="0"
              value={newWorkcell.devices}
              onChange={(e) =>
                setNewWorkcell((prev) => ({ ...prev, devices: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit Workcell Dialog */}
      <FormDialog
        open={editWorkcellOpen}
        onOpenChange={setEditWorkcellOpen}
        title="Edit Workcell"
        description="Update workcell details"
        onSubmit={handleEditWorkcell}
        submitLabel="Save Changes"
        submitDisabled={!selectedWorkcell?.name}
      >
        {selectedWorkcell && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workcell Name</Label>
              <Input
                value={selectedWorkcell.name}
                onChange={(e) =>
                  setSelectedWorkcell((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedWorkcell.status}
                onValueChange={(value) =>
                  setSelectedWorkcell((prev) => (prev ? { ...prev, status: value } : null))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Devices</Label>
              <Input
                type="number"
                min="0"
                value={selectedWorkcell.devices}
                onChange={(e) =>
                  setSelectedWorkcell((prev) =>
                    prev ? { ...prev, devices: parseInt(e.target.value) || 0 } : null
                  )
                }
              />
            </div>
          </div>
        )}
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Workcell"
        description={`Are you sure you want to delete "${workcellToDelete?.workcell.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteWorkcell}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
