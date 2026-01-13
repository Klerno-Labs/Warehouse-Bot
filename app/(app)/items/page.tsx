"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InlineLoading } from "@/components/LoadingSpinner";

type ItemRow = {
  id: string;
  publicCode: string;
  sku: string | null;
  name: string;
  baseUom: { code: string };
  defaultLocation: { code: string } | null;
};

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<{ items: ItemRow[] }>({
    queryKey: ["/api/items"],
  });

  const items = data?.items || [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.sku, item.publicCode].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [items, search]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">
          Manage inventory items and print labels.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Item List</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              placeholder="Search by name, SKU, or code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:w-64"
            />
            <Button asChild>
              <Link href="/items/new">New Item</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoading message="Loading items..." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Base UoM</TableHead>
                    <TableHead>Default Location</TableHead>
                    <TableHead>Public Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku || "-"}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.baseUom.code}</TableCell>
                      <TableCell>{item.defaultLocation?.code || "-"}</TableCell>
                      <TableCell>{item.publicCode}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/i/${item.publicCode}`}>Open</Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/labels/item/${item.id}`}>Label</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No items match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
