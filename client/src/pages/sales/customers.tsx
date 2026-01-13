"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShoppingCart,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry: string;
  paymentTerms?: string;
  creditLimit?: number;
  taxExempt: boolean;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  _count?: { salesOrders: number };
}

const emptyCustomer = {
  code: "",
  name: "",
  email: "",
  phone: "",
  billingAddress1: "",
  billingAddress2: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  billingCountry: "US",
  shippingAddress1: "",
  shippingAddress2: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
  shippingCountry: "US",
  paymentTerms: "NET30",
  creditLimit: 0,
  taxExempt: false,
  taxId: "",
  notes: "",
};

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(emptyCustomer);
  const [copyBillingToShipping, setCopyBillingToShipping] = useState(false);

  const { data, isLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/sales/customers", showActiveOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showActiveOnly) params.set("active", "true");
      const res = await fetch(`/api/sales/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyCustomer) =>
      apiRequest("POST", "/api/sales/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/customers"] });
      toast({ title: "Success", description: "Customer created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<typeof emptyCustomer> }) =>
      apiRequest("PUT", `/api/sales/customers/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/customers"] });
      toast({ title: "Success", description: "Customer updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/customers"] });
      toast({ title: "Success", description: "Customer deleted successfully" });
      setIsDeleteOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const customers = data?.customers || [];
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData(emptyCustomer);
    setSelectedCustomer(null);
    setCopyBillingToShipping(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      billingAddress1: customer.billingAddress1 || "",
      billingAddress2: customer.billingAddress2 || "",
      billingCity: customer.billingCity || "",
      billingState: customer.billingState || "",
      billingZip: customer.billingZip || "",
      billingCountry: customer.billingCountry,
      shippingAddress1: customer.shippingAddress1 || "",
      shippingAddress2: customer.shippingAddress2 || "",
      shippingCity: customer.shippingCity || "",
      shippingState: customer.shippingState || "",
      shippingZip: customer.shippingZip || "",
      shippingCountry: customer.shippingCountry,
      paymentTerms: customer.paymentTerms || "",
      creditLimit: customer.creditLimit || 0,
      taxExempt: customer.taxExempt,
      taxId: customer.taxId || "",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCopyBilling = () => {
    if (copyBillingToShipping) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress1: prev.billingAddress1,
        shippingAddress2: prev.billingAddress2,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingZip: prev.billingZip,
        shippingCountry: prev.billingCountry,
      }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">
              Manage your customer accounts and contacts
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="activeOnly"
                checked={showActiveOnly}
                onCheckedChange={(checked) => setShowActiveOnly(checked as boolean)}
              />
              <Label htmlFor="activeOnly" className="cursor-pointer">
                Active only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InlineLoading message="Loading customers..." />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Add your first customer to start selling."
              actions={[{ label: "Add Customer", onClick: () => { setSelectedCustomer(null); setFormData(emptyCustomer); setIsDialogOpen(true); }, icon: Plus }]}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.billingCity && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {customer.billingCity}, {customer.billingState}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{customer.paymentTerms || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {customer._count?.salesOrders || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? "Edit Customer" : "New Customer"}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? "Update customer information"
                : "Add a new customer to your system"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Customer Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="CUST-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Acme Corporation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-6 mt-4">
              {/* Billing Address */}
              <div>
                <h4 className="font-semibold mb-3">Billing Address</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input
                      value={formData.billingAddress1}
                      onChange={(e) =>
                        setFormData({ ...formData, billingAddress1: e.target.value })
                      }
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input
                      value={formData.billingAddress2}
                      onChange={(e) =>
                        setFormData({ ...formData, billingAddress2: e.target.value })
                      }
                      placeholder="Suite 100"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.billingCity}
                        onChange={(e) =>
                          setFormData({ ...formData, billingCity: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={formData.billingState}
                        onChange={(e) =>
                          setFormData({ ...formData, billingState: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={formData.billingZip}
                        onChange={(e) =>
                          setFormData({ ...formData, billingZip: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy to Shipping */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="copyBilling"
                  checked={copyBillingToShipping}
                  onCheckedChange={(checked) => {
                    setCopyBillingToShipping(checked as boolean);
                    if (checked) handleCopyBilling();
                  }}
                />
                <Label htmlFor="copyBilling" className="cursor-pointer">
                  Same as billing address
                </Label>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-semibold mb-3">Shipping Address</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input
                      value={formData.shippingAddress1}
                      onChange={(e) =>
                        setFormData({ ...formData, shippingAddress1: e.target.value })
                      }
                      placeholder="123 Main Street"
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input
                      value={formData.shippingAddress2}
                      onChange={(e) =>
                        setFormData({ ...formData, shippingAddress2: e.target.value })
                      }
                      placeholder="Suite 100"
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.shippingCity}
                        onChange={(e) =>
                          setFormData({ ...formData, shippingCity: e.target.value })
                        }
                        disabled={copyBillingToShipping}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={formData.shippingState}
                        onChange={(e) =>
                          setFormData({ ...formData, shippingState: e.target.value })
                        }
                        disabled={copyBillingToShipping}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={formData.shippingZip}
                        onChange={(e) =>
                          setFormData({ ...formData, shippingZip: e.target.value })
                        }
                        disabled={copyBillingToShipping}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentTerms: e.target.value })
                    }
                    placeholder="NET30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit ($)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        creditLimit: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) =>
                      setFormData({ ...formData, taxId: e.target.value })
                    }
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="taxExempt"
                    checked={formData.taxExempt}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, taxExempt: checked as boolean })
                    }
                  />
                  <Label htmlFor="taxExempt" className="cursor-pointer">
                    Tax Exempt
                  </Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !formData.code ||
                !formData.name
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedCustomer
                  ? "Update Customer"
                  : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete ${selectedCustomer?.name}? This action cannot be undone.`}
        onConfirm={() => selectedCustomer && deleteMutation.mutate(selectedCustomer.id)}
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        variant="destructive"
      />
    </div>
  );
}
