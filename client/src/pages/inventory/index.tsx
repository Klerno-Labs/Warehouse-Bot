import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { loadQueue } from "@/lib/offline-queue";
import type { Item, Location, InventoryEvent, InventoryBalance } from "@shared/inventory";

export default function InventoryDashboardPage() {
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: events = [] } = useQuery<InventoryEvent[]>({
    queryKey: [`/api/inventory/events?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: balances = [] } = useQuery<InventoryBalance[]>({
    queryKey: [`/api/inventory/balances?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const [queuedCount, setQueuedCount] = useState(0);

  const today = new Date().toDateString();
  const eventsToday = events.filter(
    (event) => new Date(event.createdAt).toDateString() === today,
  ).length;

  useEffect(() => {
    setQueuedCount(loadQueue().filter((item) => item.status === "queued").length);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of inventory activity and master data.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {items.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {locations.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Events Today</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {eventsToday}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Balance Rows</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {balances.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Queued Events</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {queuedCount}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Station Mode</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <a className="text-primary hover:underline" href="/stations/receiving">
                Receiving Station
              </a>
              <a className="text-primary hover:underline" href="/stations/stockroom">
                Stockroom / Kitting Station
              </a>
              <a className="text-primary hover:underline" href="/stations/pleater1">
                Pleater 1 Station
              </a>
              <a className="text-primary hover:underline" href="/stations/packing">
                Packing / Shipping Station
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
