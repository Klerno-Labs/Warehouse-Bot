"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  FileText,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  FlaskConical,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Engineering Dashboard - Tier 4 Role
 * Inventory view (read-only) + Job submission capability
 */
export default function EngineeringDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock inventory data
  const inventoryItems = [
    {
      sku: "PART-1001",
      name: "Filter Housing Assembly",
      category: "PRODUCTION",
      quantity: 450,
      location: "A-12-03",
      reorderPoint: 100,
      status: "in_stock",
    },
    {
      sku: "PART-1002",
      name: "Capping Mechanism",
      category: "PRODUCTION",
      quantity: 75,
      location: "B-05-01",
      reorderPoint: 50,
      status: "in_stock",
    },
    {
      sku: "PART-1003",
      name: "Sealing Gasket",
      category: "PRODUCTION",
      quantity: 25,
      location: "C-08-04",
      reorderPoint: 100,
      status: "low_stock",
    },
    {
      sku: "PART-1004",
      name: "Pressure Relief Valve",
      category: "PRODUCTION",
      quantity: 0,
      location: "A-15-02",
      reorderPoint: 20,
      status: "out_of_stock",
    },
  ];

  const recentJobs = [
    {
      id: "PO-2001",
      item: "Filter Assembly FA-100",
      qty: 500,
      status: "in_progress",
      dueDate: "2024-01-15",
    },
    {
      id: "PO-2002",
      item: "Custom Housing CH-250",
      qty: 250,
      status: "planned",
      dueDate: "2024-01-20",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "text-green-600 bg-green-50 border-green-200";
      case "low_stock":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "out_of_stock":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <CheckCircle className="h-4 w-4" />;
      case "low_stock":
        return <AlertCircle className="h-4 w-4" />;
      case "out_of_stock":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Engineering Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Engineering</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Welcome, {user?.firstName} - Design & Planning
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Submit New Job
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Parts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">248</div>
                <Package className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Low Stock Items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-yellow-600">12</div>
                <AlertCircle className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Active Jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">15</div>
                <Settings className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Pending Approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">3</div>
                <Clock className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory View</TabsTrigger>
            <TabsTrigger value="jobs">Submit Jobs</TabsTrigger>
            <TabsTrigger value="boms">BOMs</TabsTrigger>
          </TabsList>

          {/* Inventory View Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inventory Overview</CardTitle>
                    <CardDescription>View parts and materials (read-only)</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search parts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventoryItems.map((item) => (
                    <div
                      key={item.sku}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{item.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.sku}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Location: {item.location}
                            </span>
                            <span>Category: {item.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">On Hand</div>
                          <div className="text-xl font-bold">{item.quantity}</div>
                          <div className="text-xs text-muted-foreground">
                            Reorder: {item.reorderPoint}
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(item.status)} flex items-center gap-1`}>
                          {getStatusIcon(item.status)}
                          {item.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* New Job Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Submit Production Job</CardTitle>
                  <CardDescription>Create a new production order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item / Product</Label>
                    <Input placeholder="Search or select item..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" placeholder="Enter quantity..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Input placeholder="Normal, High, Urgent..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes / Instructions</Label>
                    <Input placeholder="Special instructions..." />
                  </div>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Job
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Job Submissions</CardTitle>
                  <CardDescription>Your recent production orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <div key={job.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{job.id}</span>
                          <Badge variant={job.status === "in_progress" ? "default" : "outline"}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{job.item}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Qty: {job.qty}</span>
                          <span>Due: {job.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Submissions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BOMs Tab */}
          <TabsContent value="boms">
            <Card>
              <CardHeader>
                <CardTitle>Bill of Materials</CardTitle>
                <CardDescription>Create and manage BOMs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>BOM management interface coming soon</p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New BOM
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
