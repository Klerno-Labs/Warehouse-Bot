"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  FileText,
  RefreshCw,
  Download,
  Search,
  Printer,
  Package,
  Truck,
  ClipboardList,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

interface DocumentDashboard {
  totalDocuments: number;
  generatedToday: number;
  storageUsed: number;
  byType: Array<{ type: string; count: number }>;
  recentDocuments: Array<{
    id: string;
    templateName: string;
    type: string;
    referenceNumber: string;
    generatedAt: string;
    url: string;
  }>;
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  format: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function DocumentsPage() {
  const [dashboard, setDashboard] = useState<DocumentDashboard | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDashboard();
    fetchTemplates();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch document dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/documents?view=templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "PACKING_SLIP":
        return <Package className="h-4 w-4" />;
      case "BOL":
        return <Truck className="h-4 w-4" />;
      case "PICK_LIST":
        return <ClipboardList className="h-4 w-4" />;
      case "COMMERCIAL_INVOICE":
        return <Receipt className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  }

  const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ef4444"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">
            BOL, packing slips, customs docs, and labels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.totalDocuments.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Generated Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboard.generatedToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{templates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatFileSize(dashboard.storageUsed)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Printer className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <ClipboardList className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Documents by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Documents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboard.byType}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${String(name ?? "").replace(/_/g, " ")}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {dashboard.byType.map((entry, index) => (
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

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recentDocuments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No recent documents
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard?.recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(doc.type)}
                          <div>
                            <span className="font-medium">{doc.templateName}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {doc.referenceNumber}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Bill of Lading
                </CardTitle>
                <CardDescription>Generate BOL for shipments</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Packing Slip
                </CardTitle>
                <CardDescription>Generate packing slips for orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Commercial Invoice
                </CardTitle>
                <CardDescription>Generate invoices for international</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Pick List
                </CardTitle>
                <CardDescription>Generate pick lists for waves</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Customs Declaration
                </CardTitle>
                <CardDescription>Generate customs documents</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Labels
                </CardTitle>
                <CardDescription>Generate product/location labels</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>Manage document templates and formats</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(template.type)}
                          {template.type.replace(/_/g, " ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.format}</Badge>
                      </TableCell>
                      <TableCell>
                        {template.isDefault && (
                          <Badge className="bg-blue-500">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="BOL">Bill of Lading</SelectItem>
                    <SelectItem value="PACKING_SLIP">Packing Slip</SelectItem>
                    <SelectItem value="PICK_LIST">Pick List</SelectItem>
                    <SelectItem value="COMMERCIAL_INVOICE">Commercial Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-center py-12 text-muted-foreground">
                Document history will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
