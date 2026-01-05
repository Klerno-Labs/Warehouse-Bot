"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Truck,
  Filter,
  MoreHorizontal,
  Eye,
  Send,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  salesOrder: { id: string; orderNumber: string };
  customer: { id: string; name: string; code: string };
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  _count: { lines: number; packages: number };
  createdAt: string;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "READY_TO_SHIP", label: "Ready to Ship" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ShipmentsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch shipments
  const { data, isLoading } = useQuery({
    queryKey: ["shipments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/sales/shipments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shipments");
      return res.json();
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/shipments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to ship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast({ title: "Success", description: "Shipment marked as shipped" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to ship", variant: "destructive" });
    },
  });

  const shipments: Shipment[] = data?.shipments || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Shipments</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shipments Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading shipments...</div>
      ) : shipments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter
                ? "No shipments match your filter"
                : "No shipments yet. Shipments are created when orders are ready to ship."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Shipment #</th>
                    <th className="text-left p-4 font-medium">Order #</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Carrier</th>
                    <th className="text-left p-4 font-medium">Tracking</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Ship Date</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => (
                    <tr key={shipment.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <Link
                          href={`/sales/shipments/${shipment.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {shipment.shipmentNumber}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/sales/orders/${shipment.salesOrder.id}`}
                          className="text-primary hover:underline"
                        >
                          {shipment.salesOrder.orderNumber}
                        </Link>
                      </td>
                      <td className="p-4">{shipment.customer.name}</td>
                      <td className="p-4">{shipment.carrier || "-"}</td>
                      <td className="p-4">
                        {shipment.trackingNumber ? (
                          <span className="font-mono text-sm">
                            {shipment.trackingNumber}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={shipment.status} />
                      </td>
                      <td className="p-4">
                        {shipment.shipDate
                          ? new Date(shipment.shipDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/shipments/${shipment.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {(shipment.status === "DRAFT" ||
                              shipment.status === "READY_TO_SHIP") && (
                              <DropdownMenuItem
                                onClick={() => shipMutation.mutate(shipment.id)}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Mark Shipped
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    READY_TO_SHIP: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-green-100 text-green-800",
    IN_TRANSIT: "bg-yellow-100 text-yellow-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
