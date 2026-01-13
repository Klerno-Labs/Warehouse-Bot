import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  Award,
  AlertTriangle,
  Users,
  Calendar,
  Scan,
} from "lucide-react";
import { MetricCard, MetricGrid } from "@/components/dashboard/metric-card";
import type { Department } from "@shared/job-tracking";
import { DEPARTMENT_CONFIGS } from "@shared/job-tracking";

type DepartmentMetrics = {
  totalCompleted: number;
  avgCycleTime: number;
  minCycleTime: number;
  maxCycleTime: number;
  totalTime: number;
  onTimeRate: number;
  throughput: number;
};

type AnalyticsData = {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  overall: {
    totalCompleted: number;
    totalScans: number;
    avgJobCompletionTime: number;
    throughput: number;
  };
  departmentMetrics: Record<Department, DepartmentMetrics>;
  dailyCompletions: Array<{
    date: string;
    count: number;
    departments: Record<Department, number>;
  }>;
  topOperators: Array<{
    name: string;
    totalCompleted: number;
    avgCycleTime: number;
    departments: string[];
  }>;
  bottlenecks: Array<{
    department: Department;
    avgCycleTime: number;
    totalCompleted: number;
  }>;
};

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState("7");

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/job-tracking/analytics", timePeriod],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overall, departmentMetrics, dailyCompletions, topOperators, bottlenecks } = data;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Production insights and department performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overall Metrics */}
      <MetricGrid columns={4}>
        <MetricCard
          title="Total Completed"
          value={overall.totalCompleted}
          subtitle="operations"
          icon={Activity}
          animate={false}
        />
        <MetricCard
          title="Throughput"
          value={overall.throughput}
          subtitle="ops/day"
          icon={TrendingUp}
          variant="primary"
          animate={false}
        />
        <MetricCard
          title="Avg Cycle Time"
          value={formatTime(overall.avgJobCompletionTime)}
          subtitle="per operation"
          icon={Clock}
          variant="warning"
          animate={false}
        />
        <MetricCard
          title="Total Scans"
          value={overall.totalScans}
          subtitle="scan events"
          icon={Scan}
          variant="success"
          animate={false}
        />
      </MetricGrid>

      {/* Bottlenecks Alert */}
      {bottlenecks.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Identified Bottlenecks
            </CardTitle>
            <CardDescription>Departments with longest average cycle times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bottlenecks.map((bottleneck, idx) => (
                <div
                  key={bottleneck.department}
                  className="border rounded-lg p-4 bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      {DEPARTMENT_CONFIGS[bottleneck.department].displayName}
                    </span>
                    <Badge variant={idx === 0 ? "destructive" : "secondary"}>
                      #{idx + 1}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {formatTime(bottleneck.avgCycleTime)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bottleneck.totalCompleted} operations
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Department Performance
          </CardTitle>
          <CardDescription>Detailed metrics by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(Object.keys(departmentMetrics) as Department[])
              .filter((dept) => departmentMetrics[dept].totalCompleted > 0)
              .map((dept) => {
                const metrics = departmentMetrics[dept];
                const config = DEPARTMENT_CONFIGS[dept];

                return (
                  <div
                    key={dept}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{config.displayName}</h3>
                      <Badge variant="outline">{metrics.totalCompleted} ops</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Cycle Time</p>
                        <p className="font-semibold text-base">
                          {formatTime(metrics.avgCycleTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Throughput</p>
                        <p className="font-semibold text-base">{metrics.throughput}/day</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Min Time</p>
                        <p className="font-semibold text-base text-green-600">
                          {formatTime(metrics.minCycleTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Max Time</p>
                        <p className="font-semibold text-base text-red-600">
                          {formatTime(metrics.maxCycleTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Time</p>
                        <p className="font-semibold text-base">
                          {formatTime(metrics.totalTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">On-Time Rate</p>
                        <p className="font-semibold text-base">
                          <span
                            className={
                              metrics.onTimeRate >= 80
                                ? "text-green-600"
                                : metrics.onTimeRate >= 60
                                ? "text-amber-600"
                                : "text-red-600"
                            }
                          >
                            {metrics.onTimeRate}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Daily Completion Trend
          </CardTitle>
          <CardDescription>Operations completed per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyCompletions.map((day) => {
              const maxCount = Math.max(...dailyCompletions.map((d) => d.count));
              const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;

              return (
                <div key={day.date}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-sm font-semibold">{day.count} ops</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {(Object.entries(day.departments) as [Department, number][])
                      .filter(([_, count]) => count > 0)
                      .map(([dept, count]) => (
                        <Badge key={dept} variant="secondary" className="text-xs">
                          {dept}: {count}
                        </Badge>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Operators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Top Performers
          </CardTitle>
          <CardDescription>Most productive operators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topOperators.map((operator, idx) => (
              <div
                key={operator.name}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                      idx === 0
                        ? "bg-amber-100 text-amber-700"
                        : idx === 1
                        ? "bg-gray-100 text-gray-700"
                        : idx === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {operator.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {operator.departments.join(", ")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {operator.totalCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg: {formatTime(operator.avgCycleTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
