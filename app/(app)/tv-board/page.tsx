"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Package,
  Users,
  Target,
  WifiOff,
} from "lucide-react";

interface TVBoardData {
  department: string;
  currentTime: Date;
  activeJobs: Array<{
    id: string;
    orderNumber: string;
    itemName: string;
    qtyOrdered: number;
    qtyCompleted: number;
    assignedTo: string;
    station: string;
    priority: number;
    status: "IN_PROGRESS" | "PAUSED" | "PENDING";
  }>;
  metrics: {
    activeJobsCount: number;
    completedToday: number;
    efficiency: number;
    overdueCount: number;
    avgCycleTime: number;
  };
  teamStatus: Array<{
    name: string;
    status: "ACTIVE" | "IDLE" | "OFFLINE";
    currentJob: string | null;
  }>;
  alerts: Array<{
    type: "warning" | "critical" | "info";
    message: string;
  }>;
}

export default function TVBoardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const {
    data,
    isLoading,
    error,
    isError,
  } = useQuery<TVBoardData>({
    queryKey: ["/api/tv-board/data"],
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 5,
    retryDelay: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-4">Loading...</div>
          <div className="text-xl text-slate-400">Connecting to production board</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <Alert className="max-w-2xl bg-red-900/50 border-2 border-red-500">
          <WifiOff className="h-6 w-6 text-red-400" />
          <AlertDescription className="text-xl text-red-200 ml-2">
            <strong className="text-2xl">Connection Lost</strong>
            <p className="mt-2">
              {error instanceof Error ? error.message : "Unable to connect to production data"}
            </p>
            <p className="mt-2 text-lg">
              Attempting to reconnect automatically...
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      {/* Header Bar */}
      <div className="mb-8 flex items-center justify-between border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-6xl font-bold mb-2">{data.department} Production Board</h1>
          <p className="text-3xl text-slate-400">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <div className="text-7xl font-bold tabular-nums">{formatTime(currentTime)}</div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse" />
            <span className="text-2xl text-slate-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 rounded-2xl p-6 text-2xl font-semibold ${
                alert.type === "critical"
                  ? "bg-red-900/50 border-2 border-red-500 text-red-200"
                  : alert.type === "warning"
                  ? "bg-amber-900/50 border-2 border-amber-500 text-amber-200"
                  : "bg-blue-900/50 border-2 border-blue-500 text-blue-200"
              }`}
            >
              <AlertTriangle className="h-10 w-10 flex-shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Play className="h-12 w-12 text-blue-400" />
            </div>
            <div className="text-6xl font-bold text-blue-400 mb-2">
              {data.metrics.activeJobsCount}
            </div>
            <div className="text-2xl text-slate-400">Active Jobs</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <div className="text-6xl font-bold text-green-400 mb-2">
              {data.metrics.completedToday}
            </div>
            <div className="text-2xl text-slate-400">Completed Today</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="h-12 w-12 text-purple-400" />
            </div>
            <div className="text-6xl font-bold text-purple-400 mb-2">
              {data.metrics.efficiency}%
            </div>
            <div className="text-2xl text-slate-400">Efficiency</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock className="h-12 w-12 text-amber-400" />
            </div>
            <div className="text-6xl font-bold text-amber-400 mb-2">
              {data.metrics.avgCycleTime}m
            </div>
            <div className="text-2xl text-slate-400">Avg Cycle</div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${data.metrics.overdueCount > 0 ? "bg-red-900/50 border-red-500" : "bg-slate-800 border-slate-700"}`}>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className={`h-12 w-12 ${data.metrics.overdueCount > 0 ? "text-red-400" : "text-slate-500"}`} />
            </div>
            <div className={`text-6xl font-bold mb-2 ${data.metrics.overdueCount > 0 ? "text-red-400" : "text-slate-500"}`}>
              {data.metrics.overdueCount}
            </div>
            <div className="text-2xl text-slate-400">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs - Large Cards */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
          <Package className="h-10 w-10" />
          Active Jobs
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {data.activeJobs.slice(0, 6).map((job) => {
            const progress = (job.qtyCompleted / job.qtyOrdered) * 100;
            const statusColors = {
              IN_PROGRESS: "border-blue-500 bg-blue-900/30",
              PAUSED: "border-amber-500 bg-amber-900/30",
              PENDING: "border-slate-500 bg-slate-800",
            };

            return (
              <Card
                key={job.id}
                className={`border-2 ${statusColors[job.status]} transition-all`}
              >
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-5xl font-bold">{job.orderNumber}</div>
                        {job.priority <= 3 && (
                          <Badge className="bg-red-500 text-white text-xl px-4 py-2">
                            HIGH PRIORITY
                          </Badge>
                        )}
                      </div>
                      <div className="text-2xl text-slate-300 mb-2">{job.itemName}</div>
                      <div className="text-xl text-slate-400">
                        Station: {job.station} • Operator: {job.assignedTo}
                      </div>
                    </div>
                    <Badge
                      className={`text-2xl px-6 py-3 ${
                        job.status === "IN_PROGRESS"
                          ? "bg-blue-500"
                          : job.status === "PAUSED"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                      }`}
                    >
                      {job.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-2xl">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold">
                        {job.qtyCompleted} / {job.qtyOrdered}
                      </span>
                    </div>
                    <Progress value={progress} className="h-6" />
                    <div className="flex items-center justify-between text-xl text-slate-400">
                      <span>{job.qtyOrdered - job.qtyCompleted} units remaining</span>
                      <span className="font-bold text-3xl text-white">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team Status */}
      <div>
        <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
          <Users className="h-10 w-10" />
          Team Status
        </h2>
        <div className="grid grid-cols-4 gap-6">
          {data.teamStatus.map((member, index) => {
            const statusConfig = {
              ACTIVE: {
                bg: "bg-green-900/50 border-green-500",
                dot: "bg-green-500",
                text: "text-green-400",
              },
              IDLE: {
                bg: "bg-amber-900/50 border-amber-500",
                dot: "bg-amber-500",
                text: "text-amber-400",
              },
              OFFLINE: {
                bg: "bg-slate-800 border-slate-600",
                dot: "bg-slate-500",
                text: "text-slate-500",
              },
            };

            const config = statusConfig[member.status];

            return (
              <Card key={index} className={`border-2 ${config.bg}`}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`h-8 w-8 rounded-full ${config.dot} animate-pulse`} />
                  </div>
                  <div className="text-3xl font-bold mb-2">{member.name}</div>
                  <div className={`text-2xl font-semibold mb-2 ${config.text}`}>
                    {member.status}
                  </div>
                  {member.currentJob && (
                    <div className="text-xl text-slate-400 truncate">
                      {member.currentJob}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-center">
        <div className="text-2xl text-slate-500">
          Auto-refreshing every 10 seconds • Last updated: {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}
