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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
} from "recharts";
import {
  Clock,
  Users,
  TrendingUp,
  Award,
  Calendar,
  RefreshCw,
  Target,
  DollarSign,
} from "lucide-react";

interface WorkforceAnalytics {
  totalWorkers: number;
  activeNow: number;
  avgProductivity: number;
  avgAccuracy: number;
  laborCostPerUnit: number;
  overtimePercentage: number;
  topPerformers: Array<{ workerId: string; name: string; efficiency: number }>;
  bottomPerformers: Array<{ workerId: string; name: string; efficiency: number }>;
  departmentBreakdown: Array<{
    department: string;
    workers: number;
    avgEfficiency: number;
    totalUnits: number;
  }>;
}

interface ProductivityMetric {
  workerId: string;
  workerName: string;
  period: string;
  tasksCompleted: number;
  unitsProcessed: number;
  hoursWorked: number;
  unitsPerHour: number;
  accuracy: number;
  efficiency: number;
  ranking: number;
}

interface LaborStandard {
  id: string;
  taskType: string;
  expectedUnitsPerHour: number;
  minimumAccuracy: number;
  incentiveThreshold: number;
  incentiveRate: number;
}

export default function LaborManagementPage() {
  const [analytics, setAnalytics] = useState<WorkforceAnalytics | null>(null);
  const [metrics, setMetrics] = useState<ProductivityMetric[]>([]);
  const [standards, setStandards] = useState<LaborStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("WEEK");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/labor?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
        setMetrics(data.metrics || []);
        setStandards(data.standards || []);
      }
    } catch (error) {
      console.error("Failed to fetch labor data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return "text-green-600";
    if (efficiency >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 110) return <Badge className="bg-green-500">Excellent</Badge>;
    if (efficiency >= 100) return <Badge className="bg-blue-500">On Target</Badge>;
    if (efficiency >= 90) return <Badge variant="outline">Below Target</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Labor Management</h1>
          <p className="text-muted-foreground">
            Workforce productivity and performance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Today</SelectItem>
              <SelectItem value="WEEK">This Week</SelectItem>
              <SelectItem value="MONTH">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Workers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalWorkers}</div>
              <p className="text-sm text-green-600">{analytics.activeNow} active now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Productivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.avgProductivity.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">units/hour</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Avg Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {analytics.avgAccuracy.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Labor Cost/Unit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${analytics.laborCostPerUnit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Overtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.overtimePercentage.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {analytics.topPerformers[0]?.name || "-"}
              </div>
              <p className="text-sm text-green-600">
                {analytics.topPerformers[0]?.efficiency.toFixed(1)}% efficiency
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="standards">Labor Standards</TabsTrigger>
          <TabsTrigger value="incentives">Incentives</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.departmentBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgEfficiency" fill="#3b82f6" name="Efficiency %" />
                      <Bar dataKey="workers" fill="#22c55e" name="Workers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top & Bottom Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Rankings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">Top Performers</h4>
                  {analytics?.topPerformers.map((worker, index) => (
                    <div key={worker.workerId} className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{index + 1}</span>
                        <span>{worker.name}</span>
                      </div>
                      <Badge className="bg-green-500">{worker.efficiency.toFixed(1)}%</Badge>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-red-600 mb-2">Needs Coaching</h4>
                  {analytics?.bottomPerformers.map((worker) => (
                    <div key={worker.workerId} className="flex justify-between items-center py-2">
                      <span>{worker.name}</span>
                      <Badge variant="destructive">{worker.efficiency.toFixed(1)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Productivity</CardTitle>
              <CardDescription>Performance metrics for all workers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Units/Hour</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead>Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => (
                    <TableRow key={metric.workerId}>
                      <TableCell className="font-bold">#{metric.ranking}</TableCell>
                      <TableCell>{metric.workerName}</TableCell>
                      <TableCell className="text-right">{metric.tasksCompleted}</TableCell>
                      <TableCell className="text-right">{metric.unitsProcessed.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{metric.hoursWorked.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{metric.unitsPerHour.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{metric.accuracy.toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(metric.efficiency, 120)} className="w-20" />
                          {getEfficiencyBadge(metric.efficiency)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labor Standards</CardTitle>
              <CardDescription>Expected performance by task type</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Type</TableHead>
                    <TableHead className="text-right">Expected Units/Hour</TableHead>
                    <TableHead className="text-right">Min Accuracy</TableHead>
                    <TableHead className="text-right">Incentive Threshold</TableHead>
                    <TableHead className="text-right">Incentive Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards.map((std) => (
                    <TableRow key={std.id}>
                      <TableCell className="font-medium">{std.taskType}</TableCell>
                      <TableCell className="text-right">{std.expectedUnitsPerHour}</TableCell>
                      <TableCell className="text-right">{std.minimumAccuracy}%</TableCell>
                      <TableCell className="text-right">{std.incentiveThreshold} units/hr</TableCell>
                      <TableCell className="text-right">${std.incentiveRate}/unit</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incentives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incentive Calculator</CardTitle>
              <CardDescription>Calculate bonus earnings based on productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a worker to calculate incentives</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
