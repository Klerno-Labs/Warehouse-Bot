"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  Loader2,
  Edit,
  Save,
  X,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface SalesOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  totalAmount: number;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
  isActive: boolean;
  orders: SalesOrderSummary[];
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  ALLOCATED: "bg-indigo-100 text-indigo-800",
  PICKING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-orange-100 text-orange-800",
  SHIPPED: "bg-green-100 text-green-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customerId = params.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer>>({});

  const { data: customer, isLoading, error, refetch } = useQuery<Customer>({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const res = await fetch(`/api/sales/customers/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch customer");
      return res.json();
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const res = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update customer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Customer Updated", description: "Customer information has been saved." });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer?.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update customer status");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Customer not found</p>
        <Button onClick={() => router.push("/sales/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  // Calculate customer stats
  const totalOrders = customer.orders.length;
  const totalRevenue = customer.orders
    .filter(o => !["DRAFT", "CANCELLED"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const activeOrders = customer.orders.filter(o => 
    !["SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status)
  ).length;
  const shippedOrders = customer.orders.filter(o => 
    ["SHIPPED", "DELIVERED"].includes(o.status)
  ).length;

  const startEditing = () => {
    setEditData({
      name: customer.name,
      contactName: customer.contactName,
      contactEmail: customer.contactEmail,
      contactPhone: customer.contactPhone,
      paymentTerms: customer.paymentTerms,
      creditLimit: customer.creditLimit,
      notes: customer.notes,
      billingAddress: { ...customer.billingAddress },
      shippingAddress: customer.shippingAddress ? { ...customer.shippingAddress } : undefined,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateCustomer.mutate(editData);
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/sales/customers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <Badge variant="outline">{customer.code}</Badge>
              <Badge className={customer.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Customer since {format(new Date(customer.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="active-toggle" className="text-sm">Active</Label>
            <Switch
              id="active-toggle"
              checked={customer.isActive}
              onCheckedChange={() => toggleActive.mutate()}
            />
          </div>
          {!isEditing ? (
            <Button onClick={startEditing}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateCustomer.isPending}>
                {updateCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Orders</p>
                <p className="text-2xl font-bold">{shippedOrders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={editData.contactName || ""}
                      onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editData.contactEmail || ""}
                      onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editData.contactPhone || ""}
                      onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.contactName && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.contactName}</span>
                    </div>
                  )}
                  {customer.contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${customer.contactEmail}`} className="text-primary hover:underline">
                        {customer.contactEmail}
                      </a>
                    </div>
                  )}
                  {customer.contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.contactPhone}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Billing Address */}
                <div>
                  <h4 className="font-medium mb-2">Billing Address</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Street"
                        value={editData.billingAddress?.street || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          billingAddress: { ...editData.billingAddress!, street: e.target.value }
                        })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="City"
                          value={editData.billingAddress?.city || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            billingAddress: { ...editData.billingAddress!, city: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="State"
                          value={editData.billingAddress?.state || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            billingAddress: { ...editData.billingAddress!, state: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="ZIP"
                          value={editData.billingAddress?.zip || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            billingAddress: { ...editData.billingAddress!, zip: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Country"
                          value={editData.billingAddress?.country || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            billingAddress: { ...editData.billingAddress!, country: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>{customer.billingAddress.street}</p>
                      <p>{customer.billingAddress.city}, {customer.billingAddress.state} {customer.billingAddress.zip}</p>
                      <p>{customer.billingAddress.country}</p>
                    </div>
                  )}
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Street"
                        value={editData.shippingAddress?.street || ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          shippingAddress: { 
                            ...(editData.shippingAddress || { city: "", state: "", zip: "", country: "" }),
                            street: e.target.value 
                          }
                        })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="City"
                          value={editData.shippingAddress?.city || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            shippingAddress: { 
                              ...(editData.shippingAddress || { street: "", state: "", zip: "", country: "" }),
                              city: e.target.value 
                            }
                          })}
                        />
                        <Input
                          placeholder="State"
                          value={editData.shippingAddress?.state || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            shippingAddress: { 
                              ...(editData.shippingAddress || { street: "", city: "", zip: "", country: "" }),
                              state: e.target.value 
                            }
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="ZIP"
                          value={editData.shippingAddress?.zip || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            shippingAddress: { 
                              ...(editData.shippingAddress || { street: "", city: "", state: "", country: "" }),
                              zip: e.target.value 
                            }
                          })}
                        />
                        <Input
                          placeholder="Country"
                          value={editData.shippingAddress?.country || ""}
                          onChange={(e) => setEditData({
                            ...editData,
                            shippingAddress: { 
                              ...(editData.shippingAddress || { street: "", city: "", state: "", zip: "" }),
                              country: e.target.value 
                            }
                          })}
                        />
                      </div>
                    </div>
                  ) : customer.shippingAddress ? (
                    <div className="text-sm text-muted-foreground">
                      <p>{customer.shippingAddress.street}</p>
                      <p>{customer.shippingAddress.city}, {customer.shippingAddress.state} {customer.shippingAddress.zip}</p>
                      <p>{customer.shippingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Same as billing</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order History
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/sales/orders?customerId=${customer.id}`)}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => router.push(`/sales/orders?new=true&customerId=${customer.id}`)}
                  >
                    Create First Order
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.slice(0, 10).map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/sales/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{format(new Date(order.orderDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]} variant="secondary">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${order.totalAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Financial Info */}
        <div className="space-y-6">
          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label>Payment Terms</Label>
                    <Input
                      value={editData.paymentTerms || ""}
                      onChange={(e) => setEditData({ ...editData, paymentTerms: e.target.value })}
                      placeholder="e.g., Net 30"
                    />
                  </div>
                  <div>
                    <Label>Credit Limit</Label>
                    <Input
                      type="number"
                      value={editData.creditLimit || ""}
                      onChange={(e) => setEditData({ ...editData, creditLimit: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terms</span>
                    <span className="font-medium">{customer.paymentTerms || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit Limit</span>
                    <span className="font-medium">
                      {customer.creditLimit ? `$${customer.creditLimit.toLocaleString()}` : "No limit"}
                    </span>
                  </div>
                  {customer.creditLimit && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Credit Used</span>
                        <span>{Math.round((totalRevenue / customer.creditLimit) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (totalRevenue / customer.creditLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                  value={editData.notes || ""}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Internal notes about this customer..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes || "No notes"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push(`/sales/orders?new=true&customerId=${customer.id}`)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create New Order
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => window.open(`mailto:${customer.contactEmail}`)}
                disabled={!customer.contactEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          {/* Audit Info */}
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(customer.createdAt), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Updated {format(new Date(customer.updatedAt), "MMM d, yyyy h:mm a")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
