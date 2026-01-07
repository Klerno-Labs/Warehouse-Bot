import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import type { InventoryBalance, Item, Location } from "@shared/inventory";

interface ItemsResponse {
  items: Item[];
  total: number;
}

export default function InventoryBalancesPage() {
  const { currentSite } = useAuth();
  const siteId = currentSite?.id || "";
  const { data: balances = [] } = useQuery<InventoryBalance[]>({
    queryKey: [`/api/inventory/balances?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const { data: itemsData } = useQuery<ItemsResponse>({
    queryKey: ["/api/inventory/items"],
  });
  const items = itemsData?.items || [];
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: [`/api/inventory/locations?siteId=${siteId}`],
    enabled: !!siteId,
  });
  const [displayUom, setDisplayUom] = useState<string>("base");
  const [itemFilter, setItemFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

  const displayOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => item.allowedUoms.forEach((u) => unique.add(u.uom)));
    return ["base", ...Array.from(unique)];
  }, [items]);

  const formatQty = (balance: InventoryBalance) => {
    const item = itemMap.get(balance.itemId);
    if (!item || displayUom === "base") {
      return `${balance.qtyBase}`;
    }
    const conversion = item.allowedUoms.find((u) => u.uom === displayUom);
    if (!conversion) {
      return `${balance.qtyBase}`;
    }
    const converted = balance.qtyBase / conversion.toBase;
    return `${converted.toFixed(2)} ${displayUom}`;
  };

  const filteredBalances = balances.filter((balance) => {
    const item = itemMap.get(balance.itemId);
    const location = locationMap.get(balance.locationId);
    const itemMatch = item
      ? `${item.sku} ${item.name}`.toLowerCase().includes(itemFilter.toLowerCase())
      : true;
    const locationMatch = location
      ? location.label.toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return itemMatch && locationMatch;
  });

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">On-hand Balances</CardTitle>
              <Select value={displayUom} onValueChange={setDisplayUom}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Display UoM" />
                </SelectTrigger>
                <SelectContent>
                  {displayOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "base" ? "Base" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                placeholder="Filter by item"
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="w-full sm:w-[220px]"
              />
              <Input
                placeholder="Filter by location"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                className="w-full sm:w-[220px]"
              />
            </div>
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
                  {filteredBalances.map((balance) => {
                    const item = itemMap.get(balance.itemId);
                    const location = locationMap.get(balance.locationId);
                    return (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">
                          {item ? `${item.sku} - ${item.name}` : balance.itemId}
                        </TableCell>
                        <TableCell>{location?.label || balance.locationId}</TableCell>
                        <TableCell>{formatQty(balance)}</TableCell>
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
