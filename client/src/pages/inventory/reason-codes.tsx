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
import type { ReasonCode } from "@shared/inventory";

export default function InventoryReasonCodesPage() {
  const { data: reasons = [] } = useQuery<ReasonCode[]>({
    queryKey: ["/api/inventory/reason-codes"],
  });

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reason Codes</h1>
          <p className="text-sm text-muted-foreground">
            Reason codes for scrap, adjust, and hold events.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reason Code List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reasons.map((reason) => (
                    <TableRow key={reason.id}>
                      <TableCell className="font-medium">{reason.type}</TableCell>
                      <TableCell>{reason.code}</TableCell>
                      <TableCell>{reason.description || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
