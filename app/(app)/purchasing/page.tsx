"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ShoppingCart, Package, TrendingUp } from "lucide-react";

export default function PurchasingPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Purchasing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/purchasing/suppliers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Suppliers</CardTitle>
              </div>
              <CardDescription>
                Manage supplier information, contacts, and payment terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Manage Suppliers
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchasing/purchase-orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <CardTitle>Purchase Orders</CardTitle>
              </div>
              <CardDescription>
                Create and manage purchase orders, track approvals and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Purchase Orders
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchasing/receipts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Receipts</CardTitle>
              </div>
              <CardDescription>
                View receiving history and receipt documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Receipts
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchasing/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>
                Supplier performance, spend tracking, and purchasing trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
