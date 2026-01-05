import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ForecastPeriod {
  date: Date;
  predictedDemand: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

interface ItemForecast {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  averageDemand: number;
  trend: "increasing" | "decreasing" | "stable";
  seasonality: boolean;
  forecast: ForecastPeriod[];
  recommendedAction: string;
  stockoutRisk: "low" | "medium" | "high";
}

interface DemandAnalysis {
  historicalPeriods: number;
  forecastPeriods: number;
  method: string;
  accuracy: number;
  items: ItemForecast[];
}

const TREND_CONFIG = {
  increasing: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
  decreasing: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" },
  stable: { icon: Minus, color: "text-gray-600", bg: "bg-gray-100" },
};

const RISK_CONFIG = {
  low: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Low Risk" },
  medium: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100", label: "Medium Risk" },
  high: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", label: "High Risk" },
};

export function ForecastDashboard() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<DemandAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemForecast | null>(null);
  const [forecastDays, setForecastDays] = useState("30");
  const [historicalDays, setHistoricalDays] = useState("90");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    loadForecasts();
  }, [forecastDays, historicalDays]);

  const loadForecasts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        forecastDays,
        historicalDays,
      });

      const response = await fetch(`/api/forecasting?${params.toString()}`);
      const data = await response.json();

      setAnalysis(data);
      if (data.items.length > 0 && !selectedItem) {
        setSelectedItem(data.items[0]);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load forecasts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateForecasts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/forecasting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecastDays: parseInt(forecastDays),
          historicalDays: parseInt(historicalDays),
        }),
      });

      const result = await response.json();

      toast({
        title: "Forecasts generated",
        description: result.message,
      });

      loadForecasts();
    } catch (error: any) {
      toast({
        title: "Failed to generate forecasts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredItems = () => {
    if (!analysis) return [];
    if (riskFilter === "all") return analysis.items;
    return analysis.items.filter((item) => item.stockoutRisk === riskFilter);
  };

  const prepareChartData = (item: ItemForecast) => {
    return item.forecast.map((period) => ({
      date: new Date(period.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      predicted: Math.round(period.predictedDemand * 10) / 10,
      lower: Math.round(period.lowerBound * 10) / 10,
      upper: Math.round(period.upperBound * 10) / 10,
      confidence: period.confidence,
    }));
  };

  const filteredItems = getFilteredItems();
  const highRiskCount = analysis?.items.filter((i) => i.stockoutRisk === "high").length || 0;
  const mediumRiskCount = analysis?.items.filter((i) => i.stockoutRisk === "medium").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Demand Forecasting
          </h2>
          <p className="text-muted-foreground">AI-powered inventory demand predictions</p>
        </div>
        <div className="flex gap-2">
          <Select value={historicalDays} onValueChange={setHistoricalDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 Days History</SelectItem>
              <SelectItem value="60">60 Days History</SelectItem>
              <SelectItem value="90">90 Days History</SelectItem>
              <SelectItem value="180">180 Days History</SelectItem>
            </SelectContent>
          </Select>

          <Select value={forecastDays} onValueChange={setForecastDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days Forecast</SelectItem>
              <SelectItem value="14">14 Days Forecast</SelectItem>
              <SelectItem value="30">30 Days Forecast</SelectItem>
              <SelectItem value="60">60 Days Forecast</SelectItem>
              <SelectItem value="90">90 Days Forecast</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={generateForecasts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.items.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Using {analysis.method} method
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Forecast Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.accuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">Mean absolute accuracy</p>
            </CardContent>
          </Card>

          <Card className={highRiskCount > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                High Risk Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
            </CardContent>
          </Card>

          <Card className={mediumRiskCount > 0 ? "border-orange-200 bg-orange-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Medium Risk Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{mediumRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Monitor closely</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Chart */}
      {selectedItem && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">{selectedItem.name}</CardTitle>
                <CardDescription>SKU: {selectedItem.sku}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={`${TREND_CONFIG[selectedItem.trend].bg} ${TREND_CONFIG[selectedItem.trend].color}`}
                >
                  {React.createElement(TREND_CONFIG[selectedItem.trend].icon, {
                    className: "h-3 w-3 mr-1 inline",
                  })}
                  {selectedItem.trend}
                </Badge>
                {selectedItem.seasonality && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    Seasonal
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`${RISK_CONFIG[selectedItem.stockoutRisk].bg} ${RISK_CONFIG[selectedItem.stockoutRisk].color}`}
                >
                  {React.createElement(RISK_CONFIG[selectedItem.stockoutRisk].icon, {
                    className: "h-3 w-3 mr-1 inline",
                  })}
                  {RISK_CONFIG[selectedItem.stockoutRisk].label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Current Stock</div>
                <div className="text-2xl font-bold">{selectedItem.currentStock}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Average Demand</div>
                <div className="text-2xl font-bold">
                  {selectedItem.averageDemand.toFixed(1)}/day
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Days of Stock</div>
                <div className="text-2xl font-bold">
                  {selectedItem.averageDemand > 0
                    ? Math.floor(selectedItem.currentStock / selectedItem.averageDemand)
                    : "∞"}
                </div>
              </div>
            </div>

            {/* Forecast Chart with Confidence Bands */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={prepareChartData(selectedItem)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{payload[0].payload.date}</p>
                        <p className="text-sm text-green-600">
                          Predicted: {payload[0].payload.predicted}
                        </p>
                        <p className="text-xs text-gray-500">
                          Range: {payload[0].payload.lower} - {payload[0].payload.upper}
                        </p>
                        <p className="text-xs text-blue-600">
                          Confidence: {payload[0].payload.confidence}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="1"
                  stroke="none"
                  fill="#94a3b8"
                  fillOpacity={0.2}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="1"
                  stroke="none"
                  fill="#94a3b8"
                  fillOpacity={0.2}
                  name="Lower Bound"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: 4 }}
                  name="Predicted Demand"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Recommendation */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-900 mb-1">Recommendation</div>
              <div className="text-sm text-blue-700">{selectedItem.recommendedAction}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Items ({filteredItems.length})</CardTitle>
            <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="high">High Risk Only</SelectItem>
                <SelectItem value="medium">Medium Risk Only</SelectItem>
                <SelectItem value="low">Low Risk Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading forecasts...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found with selected risk level
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const trendConfig = TREND_CONFIG[item.trend];
                const riskConfig = RISK_CONFIG[item.stockoutRisk];
                const TrendIcon = trendConfig.icon;
                const RiskIcon = riskConfig.icon;

                return (
                  <div
                    key={item.itemId}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedItem?.itemId === item.itemId
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Stock: {item.currentStock}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Avg Demand: {item.averageDemand.toFixed(1)}/day
                          </Badge>
                          {item.seasonality && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              Seasonal
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`flex items-center gap-1 ${trendConfig.color}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm capitalize">{item.trend}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${riskConfig.color}`}>
                          <RiskIcon className="h-4 w-4" />
                          <span className="text-sm">{riskConfig.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
