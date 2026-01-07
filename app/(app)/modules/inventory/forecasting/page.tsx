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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  RefreshCw,
  Search,
  Download,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface ForecastItem {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  averageDemand: number;
  forecastedDemand: number;
  reorderPoint: number;
  safetyStock: number;
  daysOfSupply: number;
  trend: string;
  confidence: number;
  recommendation: string;
  riskLevel: string;
}

interface ForecastAnalysis {
  tenantId: string;
  siteId?: string;
  generatedAt: string;
  forecastDays: number;
  historicalDays: number;
  items: ForecastItem[];
  summary: {
    totalItems: number;
    atRisk: number;
    lowStock: number;
    overstocked: number;
    healthy: number;
  };
}

interface DailyForecast {
  date: string;
  forecasted: number;
  lower: number;
  upper: number;
  actual?: number;
}

interface ItemDetailForecast {
  itemId: string;
  sku: string;
  name: string;
  historicalData: Array<{ date: string; quantity: number }>;
  forecastData: DailyForecast[];
  statistics: {
    meanDailyDemand: number;
    standardDeviation: number;
    coefficientOfVariation: number;
    seasonalityIndex?: number;
  };
  recommendation: {
    reorderQuantity: number;
    reorderDate: string;
    safetyStockAdjustment: string;
  };
}

export default function ForecastingPage() {
  const [forecastData, setForecastData] = useState<ForecastAnalysis | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [itemForecast, setItemForecast] = useState<ItemDetailForecast | null>(null);
  const [forecastDays, setForecastDays] = useState<string>("30");
  const [historicalDays, setHistoricalDays] = useState<string>("90");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch forecast data on load
  useEffect(() => {
    fetchForecast();
  }, [forecastDays, historicalDays]);

  // Fetch item detail when selected
  useEffect(() => {
    if (selectedItem) {
      fetchItemForecast(selectedItem);
    }
  }, [selectedItem]);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/forecasting?forecastDays=${forecastDays}&historicalDays=${historicalDays}`
      );
      if (res.ok) {
        const data = await res.json();
        setForecastData(data);
      }
    } catch (error) {
      console.error("Failed to fetch forecast:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchItemForecast(itemId: string) {
    try {
      const res = await fetch(
        `/api/forecasting?itemId=${itemId}&forecastDays=${forecastDays}&historicalDays=${historicalDays}`
      );
      if (res.ok) {
        const data = await res.json();
        setItemForecast(data);
      }
    } catch (error) {
      console.error("Failed to fetch item forecast:", error);
    }
  }

  async function generateForecast() {
    setGenerating(true);
    try {
      const res = await fetch("/api/forecasting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecastDays: parseInt(forecastDays),
          historicalDays: parseInt(historicalDays),
        }),
      });
      if (res.ok) {
        await fetchForecast();
      }
    } catch (error) {
      console.error("Failed to generate forecast:", error);
    } finally {
      setGenerating(false);
    }
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  }

  function getRiskBadge(riskLevel: string) {
    switch (riskLevel) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge variant="default" className="bg-orange-500">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  }

  const filteredItems = forecastData?.items.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const summaryChartData = forecastData
    ? [
        { name: "Healthy", value: forecastData.summary.healthy, fill: "#22c55e" },
        { name: "Low Stock", value: forecastData.summary.lowStock, fill: "#eab308" },
        { name: "At Risk", value: forecastData.summary.atRisk, fill: "#ef4444" },
        { name: "Overstocked", value: forecastData.summary.overstocked, fill: "#3b82f6" },
      ]
    : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Demand Forecasting</h1>
          <p className="text-muted-foreground">
            AI-powered demand predictions and inventory planning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchForecast()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={generateForecast} disabled={generating}>
            <Calendar className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            Generate Forecast
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Forecast:</span>
              <Select value={forecastDays} onValueChange={setForecastDays}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Historical:</span>
              <Select value={historicalDays} onValueChange={setHistoricalDays}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Item Forecasts</TabsTrigger>
          <TabsTrigger value="detail">Item Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {forecastData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {forecastData.summary.totalItems}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">Healthy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {forecastData.summary.healthy}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-600">Low Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      {forecastData.summary.lowStock}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600">At Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {forecastData.summary.atRisk}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-600">Overstocked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {forecastData.summary.overstocked}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Status Distribution</CardTitle>
                  <CardDescription>
                    Current stock levels vs forecasted demand
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* At Risk Items */}
              {forecastData.summary.atRisk > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Items At Risk
                    </CardTitle>
                    <CardDescription>
                      Items that may run out of stock within the forecast period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead className="text-right">Forecasted Demand</TableHead>
                          <TableHead className="text-right">Days of Supply</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forecastData.items
                          .filter((item) => item.riskLevel === "high")
                          .slice(0, 10)
                          .map((item) => (
                            <TableRow
                              key={item.itemId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedItem(item.itemId);
                                setActiveTab("detail");
                              }}
                            >
                              <TableCell className="font-medium">{item.sku}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {item.currentStock.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.forecastedDemand.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-red-600 font-bold">
                                {item.daysOfSupply.toFixed(1)}
                              </TableCell>
                              <TableCell>{item.recommendation}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                {loading ? "Loading forecast data..." : "No forecast data available"}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Item Forecasts</CardTitle>
              <CardDescription>
                Demand forecasts for all inventory items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-right">Avg Daily Demand</TableHead>
                    <TableHead className="text-right">Forecasted</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Days Supply</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.itemId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedItem(item.itemId);
                        setActiveTab("detail");
                      }}
                    >
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-center">
                        {getTrendIcon(item.trend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.averageDemand.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.forecastedDemand.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.currentStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.daysOfSupply.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getConfidenceColor(item.confidence)}>
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRiskBadge(item.riskLevel)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Select an item to view forecast details" />
                </SelectTrigger>
                <SelectContent>
                  {forecastData?.items.map((item) => (
                    <SelectItem key={item.itemId} value={item.itemId}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {itemForecast ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {itemForecast.sku} - {itemForecast.name}
                  </CardTitle>
                  <CardDescription>
                    Historical demand and forecast with confidence intervals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                      data={[
                        ...itemForecast.historicalData.map((d) => ({
                          date: d.date,
                          actual: d.quantity,
                        })),
                        ...itemForecast.forecastData.map((d) => ({
                          date: d.date,
                          forecasted: d.forecasted,
                          lower: d.lower,
                          upper: d.upper,
                          actual: d.actual,
                        })),
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stackId="1"
                        stroke="transparent"
                        fill="#8884d8"
                        fillOpacity={0.2}
                        name="Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stackId="2"
                        stroke="transparent"
                        fill="#ffffff"
                        name="Lower Bound"
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot={false}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecasted"
                        stroke="#8884d8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Forecast"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mean Daily Demand</span>
                      <span className="font-medium">
                        {itemForecast.statistics.meanDailyDemand.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Standard Deviation</span>
                      <span className="font-medium">
                        {itemForecast.statistics.standardDeviation.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coefficient of Variation</span>
                      <span className="font-medium">
                        {(itemForecast.statistics.coefficientOfVariation * 100).toFixed(1)}%
                      </span>
                    </div>
                    {itemForecast.statistics.seasonalityIndex && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seasonality Index</span>
                        <span className="font-medium">
                          {itemForecast.statistics.seasonalityIndex.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reorder Quantity</span>
                      <span className="font-medium">
                        {itemForecast.recommendation.reorderQuantity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suggested Reorder Date</span>
                      <span className="font-medium">
                        {format(new Date(itemForecast.recommendation.reorderDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Safety Stock Adjustment</span>
                      <Badge variant="outline">
                        {itemForecast.recommendation.safetyStockAdjustment}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                Select an item to view detailed forecast
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
