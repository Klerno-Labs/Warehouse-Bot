"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ItemRow = { id: string; name: string; sku: string | null };
type Uom = { id: string; code: string };
type Location = { id: string; code: string };

const txnTypes = ["RECEIVE", "MOVE", "ISSUE", "ADJUST", "COUNT"] as const;

export default function NewTxnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<(typeof txnTypes)[number]>("RECEIVE");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [uomId, setUomId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [direction, setDirection] = useState<"ADD" | "SUBTRACT">("ADD");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: itemsData } = useQuery<{ items: ItemRow[] }>({ queryKey: ["/api/items"] });
  const { data: uomsData } = useQuery<{ uoms: Uom[] }>({ queryKey: ["/api/uoms"] });
  const { data: locationsData } = useQuery<{ locations: Location[] }>({
    queryKey: ["/api/locations"],
  });

  const items = itemsData?.items || [];
  const uoms = uomsData?.uoms || [];
  const locations = locationsData?.locations || [];

  useEffect(() => {
    if (!itemId && items.length > 0) setItemId(items[0].id);
  }, [itemId, items]);

  useEffect(() => {
    if (!uomId && uoms.length > 0) setUomId(uoms[0].id);
  }, [uomId, uoms]);

  const requiresFrom = type === "MOVE" || type === "ISSUE";
  const requiresTo = type === "RECEIVE" || type === "MOVE" || type === "COUNT" || type === "ADJUST";

  const payload = useMemo(
    () => ({
      type,
      itemId,
      qty: Number(qty),
      uomId,
      fromLocationId: requiresFrom ? fromLocationId : undefined,
      toLocationId: requiresTo ? toLocationId : undefined,
      note: note || undefined,
      direction: type === "ADJUST" ? direction : undefined,
    }),
    [type, itemId, qty, uomId, fromLocationId, toLocationId, note, direction, requiresFrom, requiresTo],
  );

  const submit = async () => {
    if (!itemId || !uomId) {
      toast({ title: "Item and UoM are required", variant: "destructive" });
      return;
    }
    const qtyNumber = Number(qty);
    if (!qtyNumber || Number.isNaN(qtyNumber) || qtyNumber <= 0) {
      toast({ title: "Quantity must be positive", variant: "destructive" });
      return;
    }
    if (requiresFrom && !fromLocationId) {
      toast({ title: "From location required", variant: "destructive" });
      return;
    }
    if (requiresTo && !toLocationId) {
      toast({ title: "To location required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/txns", payload);
      toast({ title: "Transaction recorded" });
      router.push("/items");
    } catch (error) {
      toast({
        title: "Failed to create transaction",
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
        <h1 className="text-2xl font-semibold tracking-tight">New Transaction</h1>
        <p className="text-sm text-muted-foreground">Record inventory movement or adjustment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {txnTypes.map((txnType) => (
                  <SelectItem key={txnType} value={txnType}>
                    {txnType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Quantity</Label>
            <Input value={qty} onChange={(event) => setQty(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>UoM</Label>
            <Select value={uomId} onValueChange={setUomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requiresFrom && (
            <div className="flex flex-col gap-2">
              <Label>From Location</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
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
          )}
          {requiresTo && (
            <div className="flex flex-col gap-2">
              <Label>To Location</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
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
          )}
          {type === "ADJUST" && (
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(value) => setDirection(value as "ADD" | "SUBTRACT")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add</SelectItem>
                  <SelectItem value="SUBTRACT">Subtract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>Note</Label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={submit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Record Transaction"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/items")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
