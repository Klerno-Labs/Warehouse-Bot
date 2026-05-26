"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  RefreshCw,
  Shield,
  FileText,
  Package,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface HazmatClass {
  id: string;
  class: string;
  division?: string;
  name: string;
  description: string;
}

interface HazmatDashboard {
  totalHazmatItems: number;
  totalHazmatValue: number;
  byClass: Array<{ class: string; name: string; itemCount: number; quantity: number }>;
  segregationIssues: number;
  expiringCertifications: Array<{
    type: string;
    holder: string;
    expiryDate: string;
  }>;
  recentShipments: number;
  complianceScore: number;
}

interface HazmatInventoryItem {
  itemId: string;
  itemSku: string;
  itemName: string;
  unNumber: string;
  hazmatClass: string;
  packingGroup: string;
  quantity: number;
  locations: Array<{
    locationCode: string;
    quantity: number;
  }>;
  segregationCompliant: boolean;
}

export default function HazmatPage() {
  const [dashboard, setDashboard] = useState<HazmatDashboard | null>(null);
  const [classes, setClasses] = useState<HazmatClass[]>([]);
  const [inventory, setInventory] = useState<HazmatInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboard();
    fetchClasses();
    fetchInventory();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/hazmat");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    try {
      const res = await fetch("/api/hazmat?view=classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }

  async function fetchInventory() {
    try {
      const res = await fetch("/api/hazmat?view=inventory");
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  }

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  const getClassBadge = (hazClass: string) => {
    const colorMap: Record<string, string> = {
      "1": "bg-red-600",
      "2": "bg-green-600",
      "3": "bg-red-500",
      "4": "bg-red-400",
      "5": "bg-yellow-500",
      "6": "bg-purple-500",
      "7": "bg-yellow-400",
      "8": "bg-gray-600",
      "9": "bg-gray-500",
    };
    const mainClass = hazClass.split(".")[0];
    return (
      <Badge className={colorMap[mainClass] || "bg-gray-400"}>
        Class {hazClass}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hazmat Management</h1>
          <p className="text-muted-foreground">
            Dangerous goods handling and compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate DGD
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Hazmat Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.totalHazmatItems}</div>
              <p className="text-sm text-muted-foreground">in inventory</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${dashboard.totalHazmatValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Segregation Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${dashboard.segregationIssues > 0 ? "text-red-600" : "text-green-600"}`}>
                {dashboard.segregationIssues}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Recent Shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.recentShipments}</div>
              <p className="text-sm text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {dashboard.complianceScore}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="classes">
            <Shield className="h-4 w-4 mr-2" />
            Classifications
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <FileText className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distribution by Class */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Hazmat Class</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboard.byClass}
                        dataKey="itemCount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {dashboard.byClass.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expiring Certifications */}
            <Card>
              <CardHeader>
                <CardTitle>Expiring Certifications</CardTitle>
                <CardDescription>Certifications expiring within 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.expiringCertifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All certifications are up to date</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Holder</TableHead>
                        <TableHead>Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard?.expiringCertifications.map((cert, index) => (
                        <TableRow key={index}>
                          <TableCell>{cert.type}</TableCell>
                          <TableCell>{cert.holder}</TableCell>
                          <TableCell className="text-red-600">
                            {new Date(cert.expiryDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hazmat Inventory</CardTitle>
              <CardDescription>All dangerous goods currently in stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>UN Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Packing Group</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Segregation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length > 0 ? (
                    inventory.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-mono">{item.itemSku}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="font-mono">UN{item.unNumber}</TableCell>
                        <TableCell>{getClassBadge(item.hazmatClass)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.packingGroup}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>
                          {item.segregationCompliant ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Compliant
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Issue
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hazmat inventory found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hazmat Classifications</CardTitle>
              <CardDescription>UN hazardous materials classification system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((hClass) => (
                    <TableRow key={hClass.id}>
                      <TableCell>{getClassBadge(hClass.class)}</TableCell>
                      <TableCell>{hClass.division || "-"}</TableCell>
                      <TableCell className="font-medium">{hClass.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {hClass.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>Documents required for hazmat shipments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Dangerous Goods Declaration (DGD)", required: true },
                    { name: "Emergency Response Information", required: true },
                    { name: "Safety Data Sheets (SDS)", required: true },
                    { name: "Shipper's Declaration", required: true },
                    { name: "Carrier Certification", required: true },
                    { name: "Driver Hazmat Endorsement", required: true },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span>{doc.name}</span>
                      <Badge variant={doc.required ? "default" : "outline"}>
                        {doc.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segregation Rules</CardTitle>
                <CardDescription>Hazmat storage compatibility matrix</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Segregation matrix would be displayed here</p>
                  <Button className="mt-4" variant="outline">
                    View Full Matrix
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
