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
import type { InventoryBalance, Item, Location } from "@shared/inventory";

export default function InventoryBalancesPage() {
  const { data: balances = [] } = useQuery<InventoryBalance[]>({
    queryKey: ["/api/inventory/balances"],
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
          <h1 className="text-2xl font-semibold tracking-tight">Balances</h1>
          <p className="text-sm text-muted-foreground">
            Current on-hand quantities in base units.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">On-hand Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Qty (Base)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => {
                    const item = itemMap.get(balance.itemId);
                    const location = locationMap.get(balance.locationId);
                    return (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">
                          {item ? `${item.sku} - ${item.name}` : balance.itemId}
                        </TableCell>
                        <TableCell>{location?.label || balance.locationId}</TableCell>
                        <TableCell>{balance.qtyBase}</TableCell>
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
