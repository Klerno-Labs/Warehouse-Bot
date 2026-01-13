import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Factory,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Pause,
  Package,
} from "lucide-react";
import type { Department } from "@shared/job-tracking";
import { DEPARTMENT_CONFIGS } from "@shared/job-tracking";

type DepartmentStats = {
  activeCount: number;
  pendingCount: number;
  completedToday: number;
  avgCycleTime: number;
};

type JobOverview = {
  id: string;
  orderNumber: string;
  itemName: string;
  status: string;
  progress: number;
  currentDepartment: Department | null;
  currentOperation: string | null;
  currentStatus: string | null;
  assignedTo: string | null;
  elapsedTime: number;
  nextDepartment: Department | null;
  nextOperation: string | null;
  startDate: Date;
  dueDate: Date | null;
  quantity: number;
  totalOperations: number;
  completedOperations: number;
};

type OverviewData = {
  jobs: JobOverview[];
  departmentStats: Record<Department, DepartmentStats>;
  summary: {
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    avgProgress: number;
  };
};

export default function ProductionBoardPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/job-tracking/overview"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}:${secs.toString().padStart(2, "0")}`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "PAUSED":
        return "bg-amber-500";
      case "COMPLETED":
        return "bg-green-600";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      case "PAUSED":
        return <Pause className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Factory className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading production board...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { jobs, departmentStats, summary } = data;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          Production Board
        </h1>
        <p className="text-muted-foreground mt-2">Real-time job tracking across all departments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.activeJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pendingJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.avgProgress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Department Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Department Overview
          </CardTitle>
          <CardDescription>Current workload and performance by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(departmentStats) as Department[]).map((dept) => {
              const stats = departmentStats[dept];
              const config = DEPARTMENT_CONFIGS[dept];
              const totalWorkload = stats.activeCount + stats.pendingCount;

              return (
                <div
                  key={dept}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="font-semibold text-foreground mb-2">
                    {config.displayName}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active:</span>
                      <Badge variant="default" className="bg-blue-600">
                        {stats.activeCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <Badge variant="secondary">{stats.pendingCount}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today:</span>
                      <span className="font-medium text-green-600">
                        {stats.completedToday}
                      </span>
                    </div>
                    {stats.avgCycleTime > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Time:</span>
                        <span className="font-medium">{stats.avgCycleTime}m</span>
                      </div>
                    )}
                  </div>
                  {totalWorkload > 5 && (
                    <div className="mt-2 pt-2 border-t">
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        High Load
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            All Jobs ({jobs.length})
          </CardTitle>
          <CardDescription>Live status of all production orders</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active production orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{job.orderNumber}</span>
                        {job.currentStatus && (
                          <Badge className={getStatusColor(job.currentStatus)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(job.currentStatus)}
                              {job.currentStatus.replace("_", " ")}
                            </span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{job.itemName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Quantity: {job.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{job.progress}%</div>
                      <div className="text-xs text-muted-foreground">
                        {job.completedOperations}/{job.totalOperations} ops
                      </div>
                    </div>
                  </div>

                  <Progress value={job.progress} className="mb-3" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {job.currentDepartment && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Current</div>
                        <div className="font-semibold">
                          {DEPARTMENT_CONFIGS[job.currentDepartment].displayName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {job.currentOperation}
                        </div>
                        {job.assignedTo && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Assigned: {job.assignedTo}
                          </div>
                        )}
                        {job.elapsedTime > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span className="font-mono text-blue-600">
                              {formatElapsedTime(job.elapsedTime)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {job.nextDepartment && (
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Next Up</div>
                        <div className="font-semibold">
                          {DEPARTMENT_CONFIGS[job.nextDepartment].displayName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {job.nextOperation}
                        </div>
                      </div>
                    )}

                    {!job.currentDepartment && !job.nextDepartment && (
                      <div className="bg-green-50 p-3 rounded-lg col-span-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">All Operations Complete</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {job.dueDate && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Due: {new Date(job.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
