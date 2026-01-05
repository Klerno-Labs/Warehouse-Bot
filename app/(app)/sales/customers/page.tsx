"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, Mail, Phone, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingCity: string | null;
  billingState: string | null;
  isActive: boolean;
  creditLimit: number | null;
  _count: { salesOrders: number };
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, showInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (!showInactive) params.append("active", "true");
      const res = await fetch(`/api/sales/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/sales/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          name: formData.get("name"),
          email: formData.get("email") || undefined,
          phone: formData.get("phone") || undefined,
          billingAddress1: formData.get("billingAddress1") || undefined,
          billingCity: formData.get("billingCity") || undefined,
          billingState: formData.get("billingState") || undefined,
          billingZip: formData.get("billingZip") || undefined,
          shippingAddress1: formData.get("shippingAddress1") || undefined,
          shippingCity: formData.get("shippingCity") || undefined,
          shippingState: formData.get("shippingState") || undefined,
          shippingZip: formData.get("shippingZip") || undefined,
          paymentTerms: formData.get("paymentTerms") || undefined,
          creditLimit: formData.get("creditLimit")
            ? parseFloat(formData.get("creditLimit") as string)
            : undefined,
          notes: formData.get("notes") || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDialogOpen(false);
      toast({ title: "Success", description: "Customer created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Success", description: "Customer deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" });
    },
  });

  const customers: Customer[] = data?.customers || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Customer</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Customer Code *</Label>
                  <Input id="code" name="code" required />
                </div>
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" name="name" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Billing Address</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="billingAddress1">Address</Label>
                    <Input id="billingAddress1" name="billingAddress1" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="billingCity">City</Label>
                      <Input id="billingCity" name="billingCity" />
                    </div>
                    <div>
                      <Label htmlFor="billingState">State</Label>
                      <Input id="billingState" name="billingState" />
                    </div>
                    <div>
                      <Label htmlFor="billingZip">ZIP</Label>
                      <Input id="billingZip" name="billingZip" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Shipping Address</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="shippingAddress1">Address</Label>
                    <Input id="shippingAddress1" name="shippingAddress1" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shippingCity">City</Label>
                      <Input id="shippingCity" name="shippingCity" />
                    </div>
                    <div>
                      <Label htmlFor="shippingState">State</Label>
                      <Input id="shippingState" name="shippingState" />
                    </div>
                    <div>
                      <Label htmlFor="shippingZip">ZIP</Label>
                      <Input id="shippingZip" name="shippingZip" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input id="paymentTerms" name="paymentTerms" placeholder="Net 30" />
                </div>
                <div>
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    name="creditLimit"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="showInactive"
            checked={showInactive}
            onCheckedChange={(checked) => setShowInactive(checked as boolean)}
          />
          <Label htmlFor="showInactive" className="text-sm">
            Show inactive
          </Label>
        </div>
      </div>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading customers...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search
                ? "No customers match your search"
                : "No customers yet. Create your first customer to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className={!customer.isActive ? "opacity-60" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/sales/customers/${customer.id}`}
                      className="hover:underline"
                    >
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      #{customer.code}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/sales/customers/${customer.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this customer?"
                            )
                          ) {
                            deleteMutation.mutate(customer.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.billingCity && (
                  <p className="text-sm text-muted-foreground">
                    {customer.billingCity}
                    {customer.billingState && `, ${customer.billingState}`}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">
                    {customer._count.salesOrders} orders
                  </span>
                  {customer.creditLimit && (
                    <span className="text-muted-foreground">
                      Limit: ${customer.creditLimit.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
