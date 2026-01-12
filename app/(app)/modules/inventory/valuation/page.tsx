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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Calculator,
  Calendar,
  DollarSign,
  Download,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
} from "lucide-react";

interface ValuationSummary {
  totalValue: number;
  totalItems: number;
  totalQuantity: number;
  byCategory: Array<{ category: string; value: number; quantity: number }>;
  byMethod: { FIFO: number; LIFO: number; WAC: number };
}

interface AgingBucket {
  range: string;
  quantity: number;
  value: number;
  itemCount: number;
}

interface ItemValuation {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  costMethod: string;
  lastUpdated: string;
}

export default function ValuationPage() {
  const [summary, setSummary] = useState<ValuationSummary | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [items, setItems] = useState<ItemValuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [costMethod, setCostMethod] = useState<string>("WEIGHTED_AVERAGE");
  const [asOfDate, setAsOfDate] = useState<string>("");

  useEffect(() => {
    fetchValuation();
    fetchAging();
  }, [costMethod, asOfDate]);

  async function fetchValuation() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ method: costMethod });
      if (asOfDate) params.append("asOfDate", asOfDate);

      const res = await fetch(`/api/valuation?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.valuation);
        setItems(data.valuation?.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch valuation:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAging() {
    try {
      const res = await fetch("/api/valuation/aging");
      if (res.ok) {
        const data = await res.json();
        setAging(data.aging?.buckets || []);
      }
    } catch (error) {
      console.error("Failed to fetch aging:", error);
    }
  }

  const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#8b5cf6"];

  const categoryChartData = summary?.byCategory || [];
  const agingChartData = aging.map((bucket) => ({
    name: bucket.range,
    value: bucket.value,
    quantity: bucket.quantity,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Valuation</h1>
          <p className="text-muted-foreground">
            FIFO, LIFO, and Weighted Average cost methods
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchValuation} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cost Method:</span>
              <Select value={costMethod} onValueChange={setCostMethod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                  <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                  <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
                  <SelectItem value="STANDARD">Standard Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">As of Date:</span>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${summary.totalValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary.totalQuantity.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Unit Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(summary.totalValue / summary.totalQuantity).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <DollarSign className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="aging">
            <Clock className="h-4 w-4 mr-2" />
            Aging Analysis
          </TabsTrigger>
          <TabsTrigger value="items">
            <FileText className="h-4 w-4 mr-2" />
            Item Detail
          </TabsTrigger>
          <TabsTrigger value="cogs">
            <Calculator className="h-4 w-4 mr-2" />
            COGS Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Value by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, percent }) =>
                        `${category}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Method Comparison</CardTitle>
                <CardDescription>
                  Valuation difference across methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">FIFO</p>
                        <p className="text-sm text-muted-foreground">First In, First Out</p>
                      </div>
                      <p className="text-xl font-bold">
                        ${summary.byMethod.FIFO?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">LIFO</p>
                        <p className="text-sm text-muted-foreground">Last In, First Out</p>
                      </div>
                      <p className="text-xl font-bold">
                        ${summary.byMethod.LIFO?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Weighted Average</p>
                        <p className="text-sm text-muted-foreground">WAC Method</p>
                      </div>
                      <p className="text-xl font-bold">
                        ${summary.byMethod.WAC?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Aging</CardTitle>
              <CardDescription>
                Distribution of inventory value by age
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={agingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "value" ? `$${value.toLocaleString()}` : value.toLocaleString(),
                      name === "value" ? "Value" : "Quantity",
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Value ($)" />
                  <Bar yAxisId="right" dataKey="quantity" fill="#22c55e" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aging Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age Range</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.map((bucket, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{bucket.range}</TableCell>
                      <TableCell className="text-right">{bucket.itemCount}</TableCell>
                      <TableCell className="text-right">
                        {bucket.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${bucket.value.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary
                          ? ((bucket.value / summary.totalValue) * 100).toFixed(1)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Valuation Detail</CardTitle>
              <CardDescription>
                Individual item costs using {costMethod.replace("_", " ")} method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 50).map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${item.totalValue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.lastUpdated}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cogs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost of Goods Sold Calculator</CardTitle>
              <CardDescription>
                Calculate COGS for a specific period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Cost Method</label>
                  <Select value={costMethod} onValueChange={setCostMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIFO">FIFO</SelectItem>
                      <SelectItem value="LIFO">LIFO</SelectItem>
                      <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate COGS
              </Button>

              <div className="mt-6 p-6 bg-muted rounded-lg">
                <h4 className="font-medium mb-4">COGS Formula</h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Beginning Inventory</span>
                    <span className="font-mono">$0.00</span>
                  </p>
                  <p className="flex justify-between">
                    <span>+ Purchases</span>
                    <span className="font-mono">$0.00</span>
                  </p>
                  <p className="flex justify-between">
                    <span>- Ending Inventory</span>
                    <span className="font-mono">$0.00</span>
                  </p>
                  <div className="border-t pt-2 mt-2">
                    <p className="flex justify-between font-bold">
                      <span>= Cost of Goods Sold</span>
                      <span className="font-mono">$0.00</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
