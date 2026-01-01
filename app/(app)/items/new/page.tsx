"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Uom = {
  id: string;
  code: string;
  name: string;
};

type Location = {
  id: string;
  code: string;
};

type ConversionRow = {
  fromUomId: string;
  factor: string;
};

export default function NewItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [specs, setSpecs] = useState("");
  const [baseUomId, setBaseUomId] = useState("");
  const [defaultLocationId, setDefaultLocationId] = useState("");
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: uomData } = useQuery<{ uoms: Uom[] }>({ queryKey: ["/api/uoms"] });
  const { data: locationData } = useQuery<{ locations: Location[] }>({
    queryKey: ["/api/locations"],
  });

  const uoms = uomData?.uoms || [];
  const locations = locationData?.locations || [];

  useEffect(() => {
    if (!baseUomId && uoms.length > 0) {
      setBaseUomId(uoms[0].id);
    }
  }, [baseUomId, uoms]);

  const addConversion = () => {
    setConversions((prev) => [...prev, { fromUomId: "", factor: "" }]);
  };

  const updateConversion = (index: number, value: Partial<ConversionRow>) => {
    setConversions((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...value } : row)),
    );
  };

  const removeConversion = (index: number) => {
    setConversions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const parsedConversions = useMemo(() => {
    return conversions
      .map((row) => ({
        fromUomId: row.fromUomId,
        factor: Number(row.factor),
      }))
      .filter((row) => row.fromUomId && !Number.isNaN(row.factor) && row.factor > 0);
  }, [conversions]);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!baseUomId) {
      toast({ title: "Base UoM is required", variant: "destructive" });
      return;
    }

    let specsJson: unknown = undefined;
    if (specs.trim()) {
      try {
        specsJson = JSON.parse(specs);
      } catch {
        toast({ title: "Specs must be valid JSON", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/items", {
        sku: sku || undefined,
        name,
        description: description || undefined,
        photoUrl: photoUrl || undefined,
        specs: specsJson,
        baseUomId,
        defaultLocationId: defaultLocationId || undefined,
        conversions: parsedConversions.map((row) => ({
          fromUomId: row.fromUomId,
          toUomId: baseUomId,
          factor: row.factor,
        })),
      });
      toast({ title: "Item created" });
      router.push("/items");
    } catch (error) {
      toast({
        title: "Failed to create item",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Item</h1>
        <p className="text-sm text-muted-foreground">Create an inventory item and its conversions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Item Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={sku} onChange={(event) => setSku(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="photoUrl">Photo URL</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Base UoM</Label>
            <Select value={baseUomId} onValueChange={setBaseUomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select base unit" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.code} - {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>Default Location</Label>
            <Select value={defaultLocationId} onValueChange={setDefaultLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select default location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="specs">Specs (JSON)</Label>
            <Textarea
              id="specs"
              value={specs}
              onChange={(event) => setSpecs(event.target.value)}
              placeholder='{"width":"24in","material":"Synthetic"}'
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Conversions to Base Unit</CardTitle>
          <Button variant="outline" size="sm" onClick={addConversion}>
            Add Conversion
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {conversions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add conversions for alternate units like roll or yard.
            </p>
          )}
          {conversions.map((row, index) => (
            <div key={`conversion-${index}`} className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>From UoM</Label>
                <Select
                  value={row.fromUomId}
                  onValueChange={(value) => updateConversion(index, { fromUomId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UoM" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.code} - {uom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Factor to Base</Label>
                <Input
                  value={row.factor}
                  onChange={(event) => updateConversion(index, { factor: event.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => removeConversion(index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={submit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Create Item"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/items")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
