import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Item, Location, InventoryEvent, InventoryBalance } from "@shared/inventory";

export default function InventoryDashboardPage() {
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/inventory/items"],
  });
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/inventory/locations"],
  });
  const { data: events = [] } = useQuery<InventoryEvent[]>({
    queryKey: ["/api/inventory/events"],
  });
  const { data: balances = [] } = useQuery<InventoryBalance[]>({
    queryKey: ["/api/inventory/balances"],
  });

  const today = new Date().toDateString();
  const eventsToday = events.filter(
    (event) => new Date(event.createdAt).toDateString() === today,
  ).length;

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
        </div>
      </div>
    </div>
  );
}
