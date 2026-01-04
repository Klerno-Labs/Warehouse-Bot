import { useState, useEffect } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Award,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Package,
  Clock,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VendorMetrics {
  supplierId: string;
  supplierName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  performance: {
    onTimeDeliveryRate: number;
    qualityRate: number;
    fillRate: number;
    leadTimeAccuracy: number;
    responseTime: number;
    orderAccuracy: number;
  };
  costs: {
    averageUnitCost: number;
    totalSpend: number;
    priceVariance: number;
    shippingCost: number;
  };
  orders: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    averageOrderSize: number;
  };
  quality: {
    defectRate: number;
    returnRate: number;
    complianceRate: number;
    certifications: string[];
  };
  overallScore: number;
  rating: "A" | "B" | "C" | "D" | "F";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const RATING_CONFIG = {
  A: { color: "text-green-600", bg: "bg-green-100", label: "Excellent" },
  B: { color: "text-blue-600", bg: "bg-blue-100", label: "Good" },
  C: { color: "text-yellow-600", bg: "bg-yellow-100", label: "Satisfactory" },
  D: { color: "text-orange-600", bg: "bg-orange-100", label: "Needs Improvement" },
  F: { color: "text-red-600", bg: "bg-red-100", label: "Poor" },
};

export function VendorScorecard({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [scorecard, setScorecard] = useState<VendorMetrics | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState("90");

  useEffect(() => {
    loadScorecard();
    loadTrends();
  }, [supplierId, periodDays]);

  const loadScorecard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/vendors/scorecards?supplierId=${supplierId}&periodDays=${periodDays}`
      );
      const data = await response.json();
      setScorecard(data);
    } catch (error: any) {
      toast({
        title: "Failed to load scorecard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const response = await fetch(
        `/api/vendors/scorecards?action=trends&supplierId=${supplierId}&months=12`
      );
      const data = await response.json();
      setTrends(data);
    } catch (error: any) {
      console.error("Failed to load trends:", error);
    }
  };

  if (isLoading || !scorecard) {
    return <div className="text-center py-8 text-muted-foreground">Loading scorecard...</div>;
  }

  const ratingConfig = RATING_CONFIG[scorecard.rating];

  // Prepare radar chart data
  const radarData = [
    { metric: "On-Time", value: scorecard.performance.onTimeDeliveryRate },
    { metric: "Quality", value: scorecard.performance.qualityRate },
    { metric: "Fill Rate", value: scorecard.performance.fillRate },
    { metric: "Lead Time", value: scorecard.performance.leadTimeAccuracy },
    { metric: "Accuracy", value: scorecard.performance.orderAccuracy },
    { metric: "Compliance", value: scorecard.quality.complianceRate },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8" />
            Vendor Scorecard: {scorecard.supplierName}
          </h2>
          <p className="text-muted-foreground">
            Performance period: {new Date(scorecard.period.startDate).toLocaleDateString()} -{" "}
            {new Date(scorecard.period.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 180 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className={`border-2 ${ratingConfig.bg}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-2">Overall Performance Score</div>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-bold">{scorecard.overallScore}</span>
                <span className="text-2xl text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-8xl font-bold ${ratingConfig.color} ${ratingConfig.bg} rounded-full w-32 h-32 flex items-center justify-center`}
              >
                {scorecard.rating}
              </div>
              <div className={`text-lg font-semibold ${ratingConfig.color} mt-2`}>
                {ratingConfig.label}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              On-Time Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scorecard.performance.onTimeDeliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {scorecard.orders.completedOrders} of {scorecard.orders.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Quality Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scorecard.performance.qualityRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {scorecard.quality.defectRate.toFixed(1)}% defect rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Fill Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scorecard.performance.fillRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Order fulfillment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${scorecard.costs.totalSpend.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${scorecard.costs.averageUnitCost.toFixed(2)} avg/unit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Radar</CardTitle>
          <CardDescription>Multi-dimensional performance visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trends Chart */}
      {trends && trends.trends && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>12-month performance history</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Overall Score"
                />
                <Line
                  type="monotone"
                  dataKey="onTimeDeliveryRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="On-Time %"
                />
                <Line
                  type="monotone"
                  dataKey="qualityRate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Quality %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              Strengths ({scorecard.strengths.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scorecard.strengths.length === 0 ? (
              <div className="text-sm text-muted-foreground">No notable strengths identified</div>
            ) : (
              <ul className="space-y-2">
                {scorecard.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Weaknesses ({scorecard.weaknesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scorecard.weaknesses.length === 0 ? (
              <div className="text-sm text-muted-foreground">No weaknesses identified</div>
            ) : (
              <ul className="space-y-2">
                {scorecard.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Actionable steps to improve supplier relationship</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {scorecard.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs mt-0.5">
                  {index + 1}
                </Badge>
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Certifications */}
      {scorecard.quality.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {scorecard.quality.certifications.map((cert, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  <Award className="h-3 w-3 mr-1" />
                  {cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
