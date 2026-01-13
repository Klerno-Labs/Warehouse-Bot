"use client";

import { useState } from "react";
import { Building2, Plus, ChevronRight, Settings, MapPin, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addWorkcellOpen, setAddWorkcellOpen] = useState(false);
  const [editWorkcellOpen, setEditWorkcellOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedWorkcell, setSelectedWorkcell] = useState<Workcell | null>(null);
  const [newWorkcell, setNewWorkcell] = useState({
    name: "",
    status: "active",
    devices: 1,
  });

  const handleAddWorkcell = () => {
    if (!selectedDepartment || !newWorkcell.name) return;

    const newId = `w${Date.now()}`;
    setFacilitiesData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.id === selectedDepartment
          ? {
              ...dept,
              workcells: [
                ...dept.workcells,
                { id: newId, ...newWorkcell },
              ],
            }
          : dept
      ),
    }));

    setNewWorkcell({ name: "", status: "active", devices: 1 });
    setSelectedDepartment("");
    setAddWorkcellOpen(false);
  };

  const handleDeleteWorkcell = (deptId: string, workcellId: string) => {
    if (!confirm("Are you sure you want to delete this workcell?")) return;

    setFacilitiesData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.id === deptId
          ? {
              ...dept,
              workcells: dept.workcells.filter((w) => w.id !== workcellId),
            }
          : dept
      ),
    }));
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-facilities-title">
              Facilities
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure sites, departments, workcells, and devices
            </p>
          </div>
        </div>
        <Button onClick={() => setAddWorkcellOpen(true)} data-testid="button-add-workcell">
          <Plus className="mr-2 h-4 w-4" />
          Add Workcell
        </Button>
      </div>

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
                <AccordionTrigger className="hover:no-underline" data-testid={`accordion-dept-${dept.id}`}>
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
                        className="flex items-center justify-between rounded-md border p-3 hover-elevate"
                        data-testid={`workcell-${workcell.id}`}
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
                          <Badge
                            variant={workcell.status === "active" ? "default" : "secondary"}
                          >
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
                            onClick={() => handleDeleteWorkcell(dept.id, workcell.id)}
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workcells
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold" data-testid="text-total-workcells">
              {facilitiesData.departments.reduce((acc, d) => acc + d.workcells.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Workcells
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600" data-testid="text-active-workcells">
              {facilitiesData.departments.reduce(
                (acc, d) => acc + d.workcells.filter((w) => w.status === "active").length,
                0
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold" data-testid="text-total-devices">
              {facilitiesData.departments.reduce(
                (acc, d) => acc + d.workcells.reduce((a, w) => a + w.devices, 0),
                0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Facility Settings</DialogTitle>
            <DialogDescription>
              Manage your warehouse configuration and workcells
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Departments & Workcells</Label>
                <Button size="sm" onClick={() => setAddWorkcellOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Workcell
                </Button>
              </div>
              {facilitiesData.departments.map((dept) => (
                <div key={dept.id} className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    {dept.name}
                    <Badge variant="secondary">{dept.workcells.length} workcells</Badge>
                  </h4>
                  <div className="space-y-2 pl-4">
                    {dept.workcells.map((workcell) => (
                      <div
                        key={workcell.id}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <span>{workcell.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {workcell.devices} devices
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(dept.id, workcell)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteWorkcell(dept.id, workcell.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setSettingsOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Workcell Dialog */}
      <Dialog open={addWorkcellOpen} onOpenChange={setAddWorkcellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Workcell</DialogTitle>
            <DialogDescription>
              Create a new workcell in a department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                onChange={(e) =>
                  setNewWorkcell((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={newWorkcell.status}
                onValueChange={(value) =>
                  setNewWorkcell((prev) => ({ ...prev, status: value }))
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
                value={newWorkcell.devices}
                onChange={(e) =>
                  setNewWorkcell((prev) => ({
                    ...prev,
                    devices: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddWorkcellOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWorkcell}>Add Workcell</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workcell Dialog */}
      <Dialog open={editWorkcellOpen} onOpenChange={setEditWorkcellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workcell</DialogTitle>
            <DialogDescription>
              Update workcell details
            </DialogDescription>
          </DialogHeader>
          {selectedWorkcell && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workcell Name</Label>
                <Input
                  value={selectedWorkcell.name}
                  onChange={(e) =>
                    setSelectedWorkcell((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedWorkcell.status}
                  onValueChange={(value) =>
                    setSelectedWorkcell((prev) =>
                      prev ? { ...prev, status: value } : null
                    )
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
                      prev
                        ? { ...prev, devices: parseInt(e.target.value) || 0 }
                        : null
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWorkcellOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWorkcell}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
