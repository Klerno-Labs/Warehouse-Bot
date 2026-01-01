"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ItemDetail = {
  id: string;
  publicCode: string;
  sku: string | null;
  name: string;
  description: string | null;
  photoUrl: string | null;
  specs: Record<string, unknown> | null;
  baseUom: { code: string };
  defaultLocation: { code: string } | null;
  balances: Array<{
    id: string;
    qtyBase: string;
    location: { code: string };
  }>;
  txns: Array<{
    id: string;
    type: string;
    qty: string;
    uom: { code: string };
    fromLocation: { code: string } | null;
    toLocation: { code: string } | null;
    createdAt: string;
  }>;
};

export default function ItemScanPage() {
  const params = useParams<{ publicCode: string }>();
  const publicCode = params?.publicCode;
  const { data, isLoading } = useQuery<{ item: ItemDetail }>({
    queryKey: ["/api/items/public/" + publicCode],
    enabled: Boolean(publicCode),
  });

  const item = data?.item;

  return (
    <div className="flex flex-col gap-6 p-6">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading item...</div>
      ) : !item ? (
        <div className="text-sm text-muted-foreground">Item not found.</div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
            <p className="text-sm text-muted-foreground">
              {item.sku ? `SKU ${item.sku}` : "No SKU"} · Code {item.publicCode}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.photoUrl && (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="h-48 w-full rounded-md object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description || "No description"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Base UoM</p>
                    <p className="text-sm text-muted-foreground">{item.baseUom.code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Default Location</p>
                    <p className="text-sm text-muted-foreground">
                      {item.defaultLocation?.code || "Not set"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Specs</p>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs">
                    {item.specs ? JSON.stringify(item.specs, null, 2) : "No specs"}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/txns/new">Record Transaction</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/labels/item/${item.id}`}>Print Label</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/items">Back to Items</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Balances</CardTitle>
              </CardHeader>
              <CardContent>
                {item.balances.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No on-hand balances.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead>Qty (Base)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.balances.map((balance) => (
                          <TableRow key={balance.id}>
                            <TableCell>{balance.location.code}</TableCell>
                            <TableCell>{balance.qtyBase}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {item.txns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.txns.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell>{txn.type}</TableCell>
                            <TableCell>
                              {txn.qty} {txn.uom.code}
                            </TableCell>
                            <TableCell>{txn.fromLocation?.code || "-"}</TableCell>
                            <TableCell>{txn.toLocation?.code || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
