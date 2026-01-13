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
import { Progress } from "@/components/ui/progress";
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
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";

interface Supplier {
  id: string;
  code: string;
  name: string;
  category?: string;
}

interface Scorecard {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  category?: string;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  metrics: {
    onTimeDelivery: { rate: number; onTime: number; late: number; total: number };
    qualityRate: { rate: number; accepted: number; rejected: number; total: number };
    orderFulfillment: { rate: number; complete: number; partial: number; total: number };
    averageLeadTime: { days: number; trend: string };
    priceVariance: { percentage: number; trend: string };
    responsiveness: { averageDays: number; rating: string };
  };
  overallScore: number;
  rating: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendation: string;
}

interface TrendData {
  month: string;
  onTimeDelivery: number;
  qualityRate: number;
  overallScore: number;
}

interface ComparisonData {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  metrics: {
    onTimeDelivery: number;
    qualityRate: number;
    orderFulfillment: number;
    priceCompetitiveness: number;
    responsiveness: number;
  };
  overallScore: number;
  rating: string;
}

export default function VendorScorecardsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [periodDays, setPeriodDays] = useState<string>("90");
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("scorecard");

  // Fetch suppliers
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch("/api/purchasing/suppliers");
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data);
        }
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
      }
    }
    fetchSuppliers();
  }, []);

  // Fetch scorecard when supplier changes
  useEffect(() => {
    if (selectedSupplier) {
      fetchScorecard();
      fetchTrends();
    }
  }, [selectedSupplier, periodDays]);

  // Fetch comparison data
  useEffect(() => {
    if (activeTab === "compare") {
      fetchComparison();
    }
  }, [activeTab, periodDays]);

  async function fetchScorecard() {
    if (!selectedSupplier) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vendors/scorecards?supplierId=${selectedSupplier}&periodDays=${periodDays}`
      );
      if (res.ok) {
        const data = await res.json();
        setScorecard(data);
      }
    } catch (error) {
      console.error("Failed to fetch scorecard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrends() {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(
        `/api/vendors/scorecards?action=trends&supplierId=${selectedSupplier}&months=12`
      );
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    }
  }

  async function fetchComparison() {
    try {
      const res = await fetch(
        `/api/vendors/scorecards?action=compare&periodDays=${periodDays}`
      );
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      }
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
    }
  }

  function getRatingColor(rating: string) {
    switch (rating) {
      case "Excellent":
        return "bg-green-500";
      case "Good":
        return "bg-blue-500";
      case "Acceptable":
        return "bg-yellow-500";
      case "Needs Improvement":
        return "bg-orange-500";
      case "Poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  function getScoreColor(score: number) {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  }

  const radarData = scorecard
    ? [
        {
          metric: "On-Time Delivery",
          value: scorecard.metrics.onTimeDelivery.rate,
          fullMark: 100,
        },
        {
          metric: "Quality",
          value: scorecard.metrics.qualityRate.rate,
          fullMark: 100,
        },
        {
          metric: "Order Fulfillment",
          value: scorecard.metrics.orderFulfillment.rate,
          fullMark: 100,
        },
        {
          metric: "Lead Time",
          value: Math.max(0, 100 - scorecard.metrics.averageLeadTime.days * 2),
          fullMark: 100,
        },
        {
          metric: "Price Stability",
          value: Math.max(0, 100 - Math.abs(scorecard.metrics.priceVariance.percentage)),
          fullMark: 100,
        },
      ]
    : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendor Scorecards</h1>
          <p className="text-muted-foreground">
            Evaluate and compare supplier performance metrics
          </p>
        </div>
        <Button onClick={() => fetchScorecard()} disabled={loading || !selectedSupplier}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.code} - {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="60">Last 60 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="180">Last 6 Months</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="compare">Compare Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="space-y-6">
          {scorecard ? (
            <>
              {/* Overall Score Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Overall Score</CardTitle>
                    <CardDescription>
                      {scorecard.supplierCode} - {scorecard.supplierName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
                    <div className={`text-6xl font-bold ${getScoreColor(scorecard.overallScore)}`}>
                      {scorecard.overallScore}
                    </div>
                    <Badge className={getRatingColor(scorecard.rating)}>
                      <Star className="h-4 w-4 mr-1" />
                      {scorecard.rating}
                    </Badge>
                    <p className="text-sm text-muted-foreground text-center">
                      Based on {periodDays} days of data
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Radar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Performance"
                          dataKey="value"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      On-Time Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.onTimeDelivery.rate.toFixed(1)}%
                    </div>
                    <Progress
                      value={scorecard.metrics.onTimeDelivery.rate}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {scorecard.metrics.onTimeDelivery.onTime} on-time /{" "}
                      {scorecard.metrics.onTimeDelivery.total} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Quality Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.qualityRate.rate.toFixed(1)}%
                    </div>
                    <Progress
                      value={scorecard.metrics.qualityRate.rate}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {scorecard.metrics.qualityRate.accepted} accepted /{" "}
                      {scorecard.metrics.qualityRate.total} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Order Fulfillment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.orderFulfillment.rate.toFixed(1)}%
                    </div>
                    <Progress
                      value={scorecard.metrics.orderFulfillment.rate}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {scorecard.metrics.orderFulfillment.complete} complete /{" "}
                      {scorecard.metrics.orderFulfillment.total} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Average Lead Time
                      {getTrendIcon(scorecard.metrics.averageLeadTime.trend)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.averageLeadTime.days.toFixed(1)} days
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Price Variance
                      {getTrendIcon(scorecard.metrics.priceVariance.trend)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.priceVariance.percentage > 0 ? "+" : ""}
                      {scorecard.metrics.priceVariance.percentage.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Responsiveness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {scorecard.metrics.responsiveness.averageDays.toFixed(1)} days
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {scorecard.metrics.responsiveness.rating}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {scorecard.strengths.map((strength, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {strength}
                        </li>
                      ))}
                      {scorecard.strengths.length === 0 && (
                        <li className="text-muted-foreground">No notable strengths identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-600">Areas for Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {scorecard.areasForImprovement.map((area, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          {area}
                        </li>
                      ))}
                      {scorecard.areasForImprovement.length === 0 && (
                        <li className="text-muted-foreground">No improvement areas identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{scorecard.recommendation}</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={Award}
              title="Select a supplier"
              description="Choose a supplier from the dropdown to view their performance scorecard."
            />
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {trends.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends (12 Months)</CardTitle>
                <CardDescription>
                  Track supplier performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="onTimeDelivery"
                      name="On-Time Delivery"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="qualityRate"
                      name="Quality Rate"
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="overallScore"
                      name="Overall Score"
                      stroke="#ffc658"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No trends available"
              description="Select a supplier to view their 12-month performance trends."
            />
          )}
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          {comparison.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Comparison</CardTitle>
                  <CardDescription>
                    Compare overall scores across all suppliers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="supplierCode" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="overallScore" name="Overall Score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">On-Time %</TableHead>
                        <TableHead className="text-center">Quality %</TableHead>
                        <TableHead className="text-center">Fulfillment %</TableHead>
                        <TableHead className="text-center">Overall</TableHead>
                        <TableHead className="text-center">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison
                        .sort((a, b) => b.overallScore - a.overallScore)
                        .map((supplier) => (
                          <TableRow key={supplier.supplierId}>
                            <TableCell className="font-medium">
                              {supplier.supplierCode} - {supplier.supplierName}
                            </TableCell>
                            <TableCell className="text-center">
                              {supplier.metrics.onTimeDelivery.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {supplier.metrics.qualityRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {supplier.metrics.orderFulfillment.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              <span className={getScoreColor(supplier.overallScore)}>
                                {supplier.overallScore}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getRatingColor(supplier.rating)}>
                                {supplier.rating}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <InlineLoading message="Loading supplier comparison data..." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
