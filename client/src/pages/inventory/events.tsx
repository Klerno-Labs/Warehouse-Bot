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
import { InlineLoading } from "@/components/LoadingSpinner";
import { EVENT_TYPES, type InventoryEvent, type Item, type Location } from "@shared/inventory";

type EventsResponse = {
  events: InventoryEvent[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const PAGE_SIZE = 50;

export default function InventoryEventsPage() {
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  
  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  
  // Build query params for server-side filtering
  const queryParams = new URLSearchParams();
  queryParams.set("siteId", siteId);
  queryParams.set("limit", String(PAGE_SIZE));
  queryParams.set("offset", String(page * PAGE_SIZE));
  if (typeFilter && typeFilter !== "all") queryParams.set("eventType", typeFilter);
  
  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: [`/api/inventory/events`, { siteId, typeFilter, page }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/events?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: !!siteId,
  });
  
  const events = data?.events || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      const data = await res.json();
      return data.items || data;
    },
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

  // Client-side filtering for item and location (server doesn't support these yet)
  const filteredEvents = events.filter((event) => {
    const item = itemMap.get(event.itemId);
    const fromLocation = event.fromLocationId
      ? locationMap.get(event.fromLocationId)
      : null;
    const toLocation = event.toLocationId
      ? locationMap.get(event.toLocationId)
      : null;

    const itemMatch = item
      ? `${item.sku} ${item.name}`.toLowerCase().includes(itemFilter.toLowerCase())
      : itemFilter === "";
    const locationText = `${fromLocation?.label || ""} ${toLocation?.label || ""}`.toLowerCase();
    const locationMatch = locationText.includes(locationFilter.toLowerCase());

    return itemMatch && locationMatch;
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
              <CardTitle className="text-sm font-medium">
                Event Log ({total} total events)
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(0);
                }}
              >
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <InlineLoading message="Loading events..." />
            ) : (
              <>
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
                      {filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No events found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.map((event) => {
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
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
