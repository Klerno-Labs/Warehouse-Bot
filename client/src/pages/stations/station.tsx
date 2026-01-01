import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  addQueueItem,
  loadQueue,
  removeQueueItem,
  updateQueueItem,
  type InventoryQueueItem,
} from "@/lib/offline-queue";
import type {
  InventoryEventType,
  Item,
  Location,
  ReasonCode,
  Uom,
} from "@shared/inventory";

const stationConfigs: Record<
  string,
  { label: string; actions: InventoryEventType[]; workcellName: string }
> = {
  receiving: {
    label: "Receiving",
    actions: ["RECEIVE", "MOVE", "HOLD"],
    workcellName: "Receiving Dock 1",
  },
  stockroom: {
    label: "Stockroom / Kitting",
    actions: ["MOVE", "ISSUE_TO_WORKCELL", "RETURN"],
    workcellName: "Kitting Station A",
  },
  pleater1: {
    label: "Pleater 1",
    actions: ["ISSUE_TO_WORKCELL", "RETURN"],
    workcellName: "Pleater 1",
  },
  packing: {
    label: "Packing / Shipping",
    actions: ["MOVE", "RETURN"],
    workcellName: "Packing Station 1",
  },
};

const actionLabels: Record<InventoryEventType, string> = {
  RECEIVE: "Receive",
  MOVE: "Move",
  ISSUE_TO_WORKCELL: "Issue to Workcell",
  RETURN: "Return",
  SCRAP: "Scrap",
  HOLD: "Hold",
  RELEASE: "Release",
  COUNT: "Count",
  ADJUST: "Adjust",
};

export default function StationPage({ stationId }: { stationId: string }) {
  const station = stationConfigs[stationId || ""];
  const { currentSite, user } = useAuth();
  const { toast } = useToast();
  const [action, setAction] = useState<InventoryEventType | "">("");
  const [sku, setSku] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [qtyEntered, setQtyEntered] = useState("");
  const [uomEntered, setUomEntered] = useState<Uom | "">("");
  const [reasonCodeId, setReasonCodeId] = useState("");
  const [queue, setQueue] = useState<InventoryQueueItem[]>(() => loadQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  const skuRef = useRef<HTMLInputElement | null>(null);
  const fromRef = useRef<HTMLInputElement | null>(null);
  const toRef = useRef<HTMLInputElement | null>(null);
  const qtyRef = useRef<HTMLInputElement | null>(null);

  const siteId = currentSite?.id || "";

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: reasons = [] } = useQuery<ReasonCode[]>({
    queryKey: ["/api/inventory/reason-codes"],
  });
  const { data: workcells = [] } = useQuery<
    Array<{ id: string; name: string }>
  >({
    queryKey: [`/api/sites/${siteId}/workcells`],
    enabled: !!siteId,
  });

  const item = useMemo(
    () => items.find((i) => i.sku.toLowerCase() === sku.trim().toLowerCase()),
    [items, sku],
  );

  const fromLocation = useMemo(
    () =>
      locations.find((loc) => loc.label.toLowerCase() === fromLabel.trim().toLowerCase()),
    [locations, fromLabel],
  );

  const toLocation = useMemo(
    () => locations.find((loc) => loc.label.toLowerCase() === toLabel.trim().toLowerCase()),
    [locations, toLabel],
  );

  const availableUoms = item?.allowedUoms.map((u) => u.uom) || [];

  const workcellId = useMemo(() => {
    if (!station) return null;
    return workcells.find((w) => w.name === station.workcellName)?.id || null;
  }, [workcells, station]);

  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const needsReviewCount = queue.filter((q) => q.status === "needs-review").length;

  if (!station) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <h3 className="text-lg font-medium">Station Not Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The requested station does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && !["Operator", "Inventory", "Supervisor", "Admin"].includes(user.role)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <h3 className="text-lg font-medium">Access Denied</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your role does not have access to station mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiresReason = action === "SCRAP" || action === "ADJUST" || action === "HOLD";

  useEffect(() => {
    if (item) {
      setUomEntered(item.baseUom);
    } else {
      setUomEntered("");
    }
  }, [item]);

  useEffect(() => {
    setReasonCodeId("");
  }, [action]);

  const resetForm = () => {
    setSku("");
    setFromLabel("");
    setToLabel("");
    setQtyEntered("");
    setUomEntered("");
    setReasonCodeId("");
    setTimeout(() => skuRef.current?.focus(), 0);
  };

  const buildPayload = () => {
    if (!siteId) {
      toast({ title: "No site selected", variant: "destructive" });
      return null;
    }
    if (!action) {
      toast({ title: "Select an action", variant: "destructive" });
      return null;
    }
    if (!item) {
      toast({ title: "Item not found", description: "Scan a valid SKU", variant: "destructive" });
      return null;
    }
    if (!uomEntered) {
      toast({ title: "Select a UoM", variant: "destructive" });
      return null;
    }
    if (!qtyEntered || Number.isNaN(Number(qtyEntered))) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return null;
    }
    if (!fromLocation && ["MOVE", "ISSUE_TO_WORKCELL", "RETURN", "SCRAP", "HOLD", "RELEASE"].includes(action)) {
      toast({ title: "Scan from location", variant: "destructive" });
      return null;
    }
    if (!toLocation && ["RECEIVE", "MOVE", "ISSUE_TO_WORKCELL", "RETURN", "HOLD", "RELEASE", "COUNT"].includes(action)) {
      toast({ title: "Scan to location", variant: "destructive" });
      return null;
    }

    const payload = {
      siteId,
      eventType: action,
      itemId: item.id,
      qtyEntered: Number(qtyEntered),
      uomEntered,
      fromLocationId: fromLocation?.id,
      toLocationId: toLocation?.id,
      workcellId,
      reasonCodeId: reasonCodeId || undefined,
    };

    if (requiresReason && !reasonCodeId) {
      toast({ title: "Reason code required", variant: "destructive" });
      return null;
    }

    return payload;
  };

  const submitEvent = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const response = await fetch("/api/inventory/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        const queueItem: InventoryQueueItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          payload,
          status: "needs-review",
          error: text,
          createdAt: new Date().toISOString(),
        };
        const updated = addQueueItem(queueItem);
        setQueue(updated);
        toast({
          title: "Needs review",
          description: "Server rejected the event. Saved for review.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Event recorded" });
      resetForm();
    } catch (error) {
      const queueItem: InventoryQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        payload,
        status: "queued",
        createdAt: new Date().toISOString(),
      };
      const updated = addQueueItem(queueItem);
      setQueue(updated);
      toast({
        title: "Offline",
        description: "Event queued for sync.",
      });
    }
  };

  const syncQueue = async () => {
    setIsSyncing(true);
    let currentQueue = loadQueue();

    for (const item of currentQueue) {
      if (item.status !== "queued") continue;
      try {
        const response = await fetch("/api/inventory/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item.payload),
        });
        if (!response.ok) {
          const text = await response.text();
          currentQueue = updateQueueItem(item.id, {
            status: "needs-review",
            error: text,
          });
          continue;
        }
        currentQueue = removeQueueItem(item.id);
      } catch {
        break;
      }
    }

    setQueue(currentQueue);
    setIsSyncing(false);
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{station.label} Station</h1>
          <p className="text-sm text-muted-foreground">
            Scan and transact inventory with minimal taps.
          </p>
        </div>
        <Card className="w-full max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offline Queue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Queued</span>
              <span className="font-semibold">{queuedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Needs Review</span>
              <span className="font-semibold">{needsReviewCount}</span>
            </div>
            <Button onClick={syncQueue} disabled={isSyncing || queuedCount === 0}>
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Action</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {station.actions.map((eventType) => (
            <Button
              key={eventType}
              variant={action === eventType ? "default" : "outline"}
              size="lg"
              onClick={() => setAction(eventType)}
              data-testid={`button-action-${eventType}`}
            >
              {actionLabels[eventType]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transaction</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">Item SKU</Label>
            <Input
              id="sku"
              ref={skuRef}
              placeholder="Scan or type SKU"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fromRef.current?.focus();
              }}
              data-testid="input-station-sku"
              className={item ? "border-green-500 focus-visible:ring-green-500" : sku && !item ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {item ? (
              <span className="text-xs text-green-600">
                ✓ {item.name} · {item.category} · Base UoM: {item.baseUom}
              </span>
            ) : sku ? (
              <span className="text-xs text-red-500">✗ Item not found</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fromLocation">From Location</Label>
            <Input
              id="fromLocation"
              ref={fromRef}
              placeholder="Scan from location"
              value={fromLabel}
              onChange={(event) => setFromLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") toRef.current?.focus();
              }}
              data-testid="input-station-from"
              className={fromLocation ? "border-green-500 focus-visible:ring-green-500" : fromLabel && !fromLocation ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fromLocation ? (
              <span className="text-xs text-green-600">
                ✓ {fromLocation.label} {fromLocation.type ? `(${fromLocation.type})` : ""}
              </span>
            ) : fromLabel ? (
              <span className="text-xs text-red-500">✗ Location not found</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="toLocation">To Location</Label>
            <Input
              id="toLocation"
              ref={toRef}
              placeholder="Scan to location"
              value={toLabel}
              onChange={(event) => setToLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") qtyRef.current?.focus();
              }}
              data-testid="input-station-to"
              className={toLocation ? "border-green-500 focus-visible:ring-green-500" : toLabel && !toLocation ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {toLocation ? (
              <span className="text-xs text-green-600">
                ✓ {toLocation.label} {toLocation.type ? `(${toLocation.type})` : ""}
              </span>
            ) : toLabel ? (
              <span className="text-xs text-red-500">✗ Location not found</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              ref={qtyRef}
              placeholder="Enter quantity"
              value={qtyEntered}
              onChange={(event) => setQtyEntered(event.target.value)}
              data-testid="input-station-qty"
            />
          </div>

          {availableUoms.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label>UoM</Label>
              <Select value={uomEntered} onValueChange={(value) => setUomEntered(value as Uom)}>
                <SelectTrigger data-testid="select-station-uom">
                  <SelectValue placeholder="Select UoM" />
                </SelectTrigger>
                <SelectContent>
                  {availableUoms.map((uom) => (
                    <SelectItem key={uom} value={uom}>
                      {uom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableUoms.length === 1 && (
            <div className="flex flex-col gap-2">
              <Label>UoM</Label>
              <Input value={availableUoms[0]} disabled />
            </div>
          )}

          {requiresReason && (
            <div className="flex flex-col gap-2">
              <Label>Reason Code</Label>
              <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                <SelectTrigger data-testid="select-station-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons
                    .filter((reason) => reason.type === action)
                    .map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-end">
            <Button size="lg" className="w-full" onClick={submitEvent} data-testid="button-station-submit">
              Confirm {action ? actionLabels[action] : "Action"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(queuedCount > 0 || needsReviewCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queued Events</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{item.status === "queued" ? "Queued" : "Needs Review"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  {item.error && (
                    <span className="text-xs text-destructive">{item.error}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updated = removeQueueItem(item.id);
                    setQueue(updated);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
