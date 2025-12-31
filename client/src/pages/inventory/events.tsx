import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { EVENT_TYPES, type InventoryEvent, type Item, type Location } from "@shared/inventory";

export default function InventoryEventsPage() {
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  const { data: events = [] } = useQuery<InventoryEvent[]>({
    queryKey: [`/api/inventory/events?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredEvents = events.filter((event) => {
    const item = itemMap.get(event.itemId);
    const fromLocation = event.fromLocationId
      ? locationMap.get(event.fromLocationId)
      : null;
    const toLocation = event.toLocationId
      ? locationMap.get(event.toLocationId)
      : null;

    const typeMatch = typeFilter === "all" ? true : event.eventType === typeFilter;
    const itemMatch = item
      ? `${item.sku} ${item.name}`.toLowerCase().includes(itemFilter.toLowerCase())
      : true;
    const locationText = `${fromLocation?.label || ""} ${toLocation?.label || ""}`.toLowerCase();
    const locationMatch = locationText.includes(locationFilter.toLowerCase());

    const eventDate = new Date(event.createdAt);
    const startMatch = startDate ? eventDate >= new Date(startDate) : true;
    const endMatch = endDate ? eventDate <= new Date(endDate) : true;

    return typeMatch && itemMatch && locationMatch && startMatch && endMatch;
  });

  const exportCsv = () => {
    const headers = [
      "createdAt",
      "eventType",
      "itemSku",
      "itemName",
      "qtyEntered",
      "uomEntered",
      "fromLocation",
      "toLocation",
    ];
    const rows = filteredEvents.map((event) => {
      const item = itemMap.get(event.itemId);
      const fromLocation = event.fromLocationId
        ? locationMap.get(event.fromLocationId)
        : null;
      const toLocation = event.toLocationId
        ? locationMap.get(event.toLocationId)
        : null;
      return [
        new Date(event.createdAt).toISOString(),
        event.eventType,
        item?.sku || "",
        item?.name || "",
        String(event.qtyEntered),
        event.uomEntered,
        fromLocation?.label || "",
        toLocation?.label || "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, "\"\"")}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventory-events.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event Log</h1>
          <p className="text-sm text-muted-foreground">
            Append-only inventory event ledger.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {EVENT_TYPES.map((eventType) => (
                    <SelectItem key={eventType} value={eventType}>
                      {eventType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Filter by item"
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="w-full sm:w-[200px]"
              />
              <Input
                placeholder="Filter by location"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                className="w-full sm:w-[200px]"
              />
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full sm:w-[170px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full sm:w-[170px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const item = itemMap.get(event.itemId);
                    const fromLocation = event.fromLocationId
                      ? locationMap.get(event.fromLocationId)
                      : null;
                    const toLocation = event.toLocationId
                      ? locationMap.get(event.toLocationId)
                      : null;
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          {new Date(event.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{event.eventType}</TableCell>
                        <TableCell>
                          {item ? `${item.sku} - ${item.name}` : event.itemId}
                        </TableCell>
                        <TableCell>
                          {event.qtyEntered} {event.uomEntered}
                        </TableCell>
                        <TableCell>{fromLocation?.label || "-"}</TableCell>
                        <TableCell>{toLocation?.label || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
