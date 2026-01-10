"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Play,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  UserCheck,
  Activity,
  ArrowRight,
  Timer,
  Package,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ManagerMetrics {
  department: string;
  activeJobs: number;
  pendingJobs: number;
  completedToday: number;
  overdueJobs: number;
  teamSize: number;
  activeOperators: number;
  avgCycleTime: number;
  efficiency: number;
  efficiencyTrend: number;
  bottleneckStation: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: "ACTIVE" | "IDLE" | "OFFLINE";
  currentJob: {
    id: string;
    orderNumber: string;
    itemName: string;
    progress: number;
  } | null;
  productivity: number;
  hoursWorked: number;
}

interface ActiveJob {
  id: string;
  orderNumber: string;
  itemName: string;
  qtyOrdered: number;
  qtyCompleted: number;
  assignedTo: string;
  status: string;
  priority: number;
  dueDate: Date;
  station: string;
}

export default function ManagerDashboard() {
  const { user } = useAuth();

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery<ManagerMetrics>({
    queryKey: ["/api/dashboard/manager/metrics", user?.id],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  const {
    data: teamData,
    error: teamError,
    refetch: refetchTeam,
  } = useQuery<{ teamMembers: TeamMember[] }>({
    queryKey: ["/api/dashboard/manager/team", user?.id],
    refetchInterval: 30000,
    retry: 3,
  });

  const {
    data: jobsData,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery<{ all: ActiveJob[] }>({
    queryKey: ["/api/dashboard/manager/active-jobs", user?.id],
    refetchInterval: 20000,
    retry: 3,
  });

  const team = teamData?.teamMembers;
  const activeJobs = jobsData?.all;

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading manager dashboard..." fullScreen />;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Failed to load dashboard"
          message={error instanceof Error ? error.message : "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manager Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {metrics?.department || "Department"} Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your team and monitor production progress
        </p>
      </div>

      {/* Critical Alerts */}
      {(metrics?.overdueJobs || 0) > 0 && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">
            <strong>{metrics?.overdueJobs} overdue jobs</strong> in your department require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {metrics?.bottleneckStation && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            <strong>Bottleneck detected:</strong> {metrics.bottleneckStation} is operating at high capacity. Consider reassigning resources.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.pendingJobs || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Status</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.activeOperators || 0}/{metrics?.teamSize || 0}
            </div>
            <p className="text-xs text-muted-foreground">Operators working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics?.efficiency || 0}%</span>
              {(metrics?.efficiencyTrend || 0) !== 0 && (
                <span className={`text-xs font-semibold ${(metrics?.efficiencyTrend || 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {(metrics?.efficiencyTrend || 0) > 0 ? "+" : ""}
                  {metrics?.efficiencyTrend}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg cycle: {metrics?.avgCycleTime || 0}m
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics?.completedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.overdueJobs || 0} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Status */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Real-time operator status</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/users">Manage Team</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!team || team.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No team members assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {team.map((member) => {
                  const statusColors = {
                    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    IDLE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    OFFLINE: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
                  };

                  return (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {member.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{member.name}</span>
                          <Badge className={statusColors[member.status]} variant="secondary">
                            {member.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{member.role}</p>
                        {member.currentJob ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{member.currentJob.orderNumber}</span>
                              <span className="font-medium">{Math.round(member.currentJob.progress)}%</span>
                            </div>
                            <Progress value={member.currentJob.progress} className="h-1.5" />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No active job</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Productivity</p>
                        <p className="text-lg font-bold">{member.productivity}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Production Jobs</CardTitle>
                <CardDescription>Currently in progress</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/manufacturing/production-board">View Board</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!activeJobs || activeJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active jobs</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/manufacturing/production-board">Start a Job</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.slice(0, 4).map((job) => {
                  const progress = (job.qtyCompleted / job.qtyOrdered) * 100;
                  const isHighPriority = job.priority <= 3;
                  const isOverdue = new Date(job.dueDate) < new Date();

                  return (
                    <div
                      key={job.id}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{job.orderNumber}</span>
                            {isHighPriority && <Badge variant="destructive">High</Badge>}
                            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{job.itemName}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/manufacturing/production-board?job=${job.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {job.assignedTo} • {job.station}
                          </span>
                          <span className="font-medium">
                            {job.qtyCompleted}/{job.qtyOrdered}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Today's metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jobs Completed</p>
                    <p className="text-2xl font-bold">{metrics?.completedToday || 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department Efficiency</p>
                    <p className="text-2xl font-bold">{metrics?.efficiency || 0}%</p>
                  </div>
                </div>
                {(metrics?.efficiencyTrend || 0) !== 0 && (
                  <Badge variant={
                    (metrics?.efficiencyTrend || 0) > 0 ? "default" : "secondary"
                  }>
                    {(metrics?.efficiencyTrend || 0) > 0 ? "+" : ""}
                    {metrics?.efficiencyTrend}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Timer className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cycle Time</p>
                    <p className="text-2xl font-bold">{metrics?.avgCycleTime || 0}m</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Operators</p>
                    <p className="text-2xl font-bold">
                      {metrics?.activeOperators || 0}/{metrics?.teamSize || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/manufacturing/production-board">
                <Play className="h-4 w-4 mr-2" />
                Start New Job
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/users?action=assign">
                <Users className="h-4 w-4 mr-2" />
                Assign Operators
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/manufacturing/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/modules/cycle-counts">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Cycle Counts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
