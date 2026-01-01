import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { LOCATION_TYPES, type Location } from "@shared/inventory";

export default function InventoryLocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [zone, setZone] = useState("");
  const [bin, setBin] = useState("");
  const [type, setType] = useState<string>("");

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch = 
        loc.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.zone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.bin?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || loc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [locations, searchTerm, typeFilter]);

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setZone("");
    setBin("");
    setType("");
  };

  const submit = async () => {
    if (!siteId) {
      toast({ title: "Select a site", variant: "destructive" });
      return;
    }
    const payload = {
      siteId,
      label,
      zone: zone || undefined,
      bin: bin || undefined,
      type: type || undefined,
    };
    try {
      if (editingId) {
        await apiRequest("PATCH", `/api/inventory/locations/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/inventory/locations", payload);
      }
      await queryClient.invalidateQueries({
        queryKey: [`/api/inventory/locations?siteId=${siteId}`],
      });
      resetForm();
      toast({ title: "Location saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setLabel(location.label);
    setZone(location.zone || "");
    setBin(location.bin || "");
    setType(location.type || "");
  };

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Manage site storage locations.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {editingId ? "Edit Location" : "Add Location"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="zone">Zone</Label>
              <Input id="zone" value={zone} onChange={(event) => setZone(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bin">Bin</Label>
              <Input id="bin" value={bin} onChange={(event) => setBin(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((locType) => (
                    <SelectItem key={locType} value={locType}>
                      {locType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button onClick={submit}>{editingId ? "Update Location" : "Add Location"}</Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Location List ({filteredLocations.length} of {locations.length})
              </CardTitle>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                placeholder="Search by label, zone, bin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {LOCATION_TYPES.map((locType) => (
                    <SelectItem key={locType} value={locType}>
                      {locType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No locations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.label}</TableCell>
                        <TableCell>{location.zone || "-"}</TableCell>
                        <TableCell>{location.bin || "-"}</TableCell>
                        <TableCell>{location.type || "-"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => startEdit(location)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
