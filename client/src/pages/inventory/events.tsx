import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryEvent, Item, Location } from "@shared/inventory";

export default function InventoryEventsPage() {
  const { data: events = [] } = useQuery<InventoryEvent[]>({
    queryKey: ["/api/inventory/events"],
  });
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/inventory/locations"],
  });

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

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
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
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
                  {events.map((event) => {
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
