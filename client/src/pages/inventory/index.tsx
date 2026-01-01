import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { loadQueue } from "@/lib/offline-queue";
import type { Item, Location, InventoryEvent, InventoryBalance } from "@shared/inventory";

type ItemsResponse = {
  items: Item[];
  total: number;
};

type EventsResponse = {
  events: InventoryEvent[];
  total: number;
};

export default function InventoryDashboardPage() {
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  
  const { data: itemsData } = useQuery<ItemsResponse>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      return res.json();
    },
  });
  const items = itemsData?.items || [];
  
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: eventsData } = useQuery<EventsResponse>({
    queryKey: [`/api/inventory/events`, { siteId }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/events?siteId=${siteId}&limit=100`);
      return res.json();
    },
    enabled: !!siteId,
  });
  const events = eventsData?.events || [];
  
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

  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const balanceByItem = new Map<string, number>();
    
    // Sum balances by item across all locations
    balances.forEach((balance) => {
      const current = balanceByItem.get(balance.itemId) || 0;
      balanceByItem.set(balance.itemId, current + balance.qtyBase);
    });
    
    // Find items below reorder point
    return items
      .filter((item) => {
        if (!item.reorderPointBase) return false;
        const totalQty = balanceByItem.get(item.id) || 0;
        return totalQty <= item.reorderPointBase;
      })
      .map((item) => ({
        item,
        currentQty: balanceByItem.get(item.id) || 0,
        reorderPoint: item.reorderPointBase || 0,
      }))
      .sort((a, b) => (a.currentQty / a.reorderPoint) - (b.currentQty / b.reorderPoint));
  }, [items, balances]);

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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <Card className={lowStockItems.length > 0 ? "border-orange-500" : ""}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {lowStockItems.length > 0 ? (
                <span className="text-orange-500">{lowStockItems.length}</span>
              ) : (
                <span className="text-green-500">0</span>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {lowStockItems.length > 0 && (
            <Card className="border-orange-500 md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <Badge variant="destructive">{lowStockItems.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Current Qty</TableHead>
                        <TableHead className="text-right">Reorder Point</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.slice(0, 10).map(({ item, currentQty, reorderPoint }) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {currentQty} {item.baseUom}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {reorderPoint} {item.baseUom}
                          </TableCell>
                          <TableCell>
                            {currentQty === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : currentQty < reorderPoint / 2 ? (
                              <Badge variant="destructive">Critical</Badge>
                            ) : (
                              <Badge className="bg-orange-500">Low</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {lowStockItems.length > 10 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Showing 10 of {lowStockItems.length} low stock items
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {queuedCount > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Offline Queue</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-yellow-600">
                  {queuedCount} event{queuedCount !== 1 ? "s" : ""} pending sync.
                  Go to a station to sync.
                </p>
              </CardContent>
            </Card>
          )}

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
