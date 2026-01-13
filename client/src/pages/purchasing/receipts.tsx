import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";

type Receipt = {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  receivedBy: string;
  notes: string | null;
  purchaseOrder: {
    poNumber: string;
    supplier: {
      name: string;
    };
  };
  location: {
    name: string;
  };
  lines: {
    id: string;
    qtyReceived: number;
    uom: string;
    item: {
      code: string;
      description: string;
    };
  }[];
  createdAt: string;
};

type ReceiptsResponse = {
  receipts: Receipt[];
};

export default function ReceiptsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<ReceiptsResponse>({
    queryKey: ["/api/purchasing/receipts"],
    queryFn: async () => {
      const res = await fetch("/api/purchasing/receipts");
      if (!res.ok) throw new Error("Failed to fetch receipts");
      return res.json();
    },
  });

  const receipts = data?.receipts || [];

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.purchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.purchaseOrder.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Receipts</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Receiving History</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoading message="Loading receipts..." />
          ) : filteredReceipts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No receipts yet"
              description="Receive items from purchase orders to create receipts."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{receipt.purchaseOrder.poNumber}</Badge>
                    </TableCell>
                    <TableCell>{receipt.purchaseOrder.supplier.name}</TableCell>
                    <TableCell>
                      {new Date(receipt.receiptDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{receipt.location.name}</TableCell>
                    <TableCell>{receipt.receivedBy}</TableCell>
                    <TableCell>
                      {receipt.lines.length} item{receipt.lines.length !== 1 ? "s" : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
