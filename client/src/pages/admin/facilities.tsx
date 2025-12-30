import { Building2, Plus, ChevronRight, Settings, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const facilitiesData = {
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
        <Button data-testid="button-add-workcell">
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
            <Button variant="ghost" size="icon">
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
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
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
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400" data-testid="text-active-workcells">
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
    </div>
  );
}
