"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle2, Play, Pause, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

interface ProductionMetrics {
  myAssignedJobs: number;
  activeJobs: number;
  completedToday: number;
  bottleneckDept: string;
  avgCycleTime: number;
  qualityRejectRate: number;
  materialShortages: number;
}

interface AssignedJob {
  id: string;
  orderNumber: string;
  itemName: string;
  qtyOrdered: number;
  qtyCompleted: number;
  currentDept: string;
  status: string;
  priority: number;
  dueDate: string;
}

interface DepartmentStatus {
  department: string;
  activeJobs: number;
  pendingJobs: number;
  avgCycleTime: number;
  efficiency: number;
}

export default function ProductionDashboard() {
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery<ProductionMetrics>({
    queryKey: ["/api/dashboard/production/metrics"],
  });

  const { data: assignedJobs, isLoading: jobsLoading } = useQuery<AssignedJob[]>({
    queryKey: ["/api/dashboard/production/my-jobs", user?.id],
  });

  const { data: deptStatus, isLoading: deptLoading } = useQuery<DepartmentStatus[]>({
    queryKey: ["/api/job-tracking/overview"],
  });

  if (metricsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      case "PAUSED":
        return "bg-yellow-500";
      case "PENDING":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "IN_PROGRESS":
        return <Play className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "PAUSED":
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your jobs, department performance, and production flow
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assigned Jobs</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.myAssignedJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active in Production</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.completedToday || 0} completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Shortages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics?.materialShortages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Jobs blocked by inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Reject Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.qualityRejectRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* My Assigned Jobs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>My Assigned Jobs</CardTitle>
            <CardDescription>Production orders assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !assignedJobs || assignedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No jobs assigned to you at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedJobs.map((job) => {
                  const progress = (job.qtyCompleted / job.qtyOrdered) * 100;
                  const isOverdue = new Date(job.dueDate) < new Date();

                  return (
                    <div
                      key={job.id}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{job.orderNumber}</span>
                            {job.priority <= 3 && (
                              <Badge variant="destructive" className="text-xs">High Priority</Badge>
                            )}
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{job.itemName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(job.status)}>
                            {getStatusIcon(job.status)}
                            <span className="ml-1">{job.status}</span>
                          </Badge>
                          <Button size="sm" asChild>
                            <Link href={`/manufacturing/production-board?job=${job.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current: {job.currentDept}</span>
                          <span className="font-medium">
                            {job.qtyCompleted} / {job.qtyOrdered} units
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Due: {new Date(job.dueDate).toLocaleDateString()}</span>
                          <span>{Math.round(progress)}% complete</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Status */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Real-time status across all production departments</CardDescription>
          </CardHeader>
          <CardContent>
            {deptLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !deptStatus || deptStatus.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No department data available.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {deptStatus.map((dept) => {
                  const isBottleneck = dept.department === metrics?.bottleneckDept;

                  return (
                    <div
                      key={dept.department}
                      className={`p-4 border rounded-lg ${
                        isBottleneck ? "border-yellow-500 bg-yellow-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{dept.department}</span>
                          {isBottleneck && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Bottleneck
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {dept.efficiency}% eff.
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Active</div>
                          <div className="text-lg font-bold text-blue-600">{dept.activeJobs}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Pending</div>
                          <div className="text-lg font-bold">{dept.pendingJobs}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cycle Time</div>
                          <div className="text-lg font-bold">{dept.avgCycleTime}m</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link href="/manufacturing/production-board">View Production Board</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Alert */}
      {metrics?.bottleneckDept && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Bottleneck Detected: {metrics.bottleneckDept}
            </CardTitle>
            <CardDescription>
              This department is operating at high capacity. Consider reassigning resources or extending hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/manufacturing/analytics/bottlenecks">View Detailed Analysis</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
