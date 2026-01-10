"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Package,
  ArrowRight,
  Info,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface CurrentJob {
  id: string;
  orderNumber: string;
  itemName: string;
  sku: string;
  qtyOrdered: number;
  qtyCompleted: number;
  currentStep: string;
  status: "IN_PROGRESS" | "PAUSED" | "PENDING";
  startedAt: Date;
  dueDate: Date;
  priority: number;
  notes: string;
  checklist: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
}

interface NextJob {
  id: string;
  orderNumber: string;
  itemName: string;
  qtyOrdered: number;
  priority: number;
}

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);

  const {
    data: currentJob,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useQuery<CurrentJob | null>({
    queryKey: ["/api/dashboard/operator/current-job", user?.id],
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  const {
    data: nextJobs,
    error: nextJobsError,
    refetch: refetchNextJobs,
  } = useQuery<NextJob[]>({
    queryKey: ["/api/dashboard/operator/next-jobs", user?.id],
    enabled: !currentJob,
    retry: 3,
  });

  if (jobLoading) {
    return <LoadingSpinner size="lg" message="Loading your job..." fullScreen />;
  }

  if (jobError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          <ErrorAlert
            title="Failed to load job"
            message={jobError instanceof Error ? jobError.message : "An unexpected error occurred"}
            onRetry={refetchJob}
          />
        </div>
      </div>
    );
  }

  // No active job - show scanner to start new job
  if (!currentJob) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <ScanLine className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Ready to start?</h1>
            <p className="text-lg text-muted-foreground">
              Scan a job QR code to begin working
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <Button size="lg" className="w-full gap-2 h-16 text-lg" asChild>
                <Link href="/mobile/job-scanner">
                  <ScanLine className="h-6 w-6" />
                  Scan Job QR Code
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Next Jobs in Queue */}
          {nextJobs && nextJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next in Queue</CardTitle>
                <CardDescription>Upcoming jobs waiting for you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {nextJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{job.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{job.itemName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{job.qtyOrdered} units</Badge>
                        {job.priority <= 3 && (
                          <Badge variant="destructive" className="ml-2">High</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> You can also manually select a job from the production board if needed.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Active job view - full screen focus
  const progress = (currentJob.qtyCompleted / currentJob.qtyOrdered) * 100;
  const remainingQty = currentJob.qtyOrdered - currentJob.qtyCompleted;
  const elapsedTime = Math.floor((new Date().getTime() - new Date(currentJob.startedAt).getTime()) / 60000);
  const isPaused = currentJob.status === "PAUSED";
  const isHighPriority = currentJob.priority <= 3;

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Current Job Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Current Job</h1>
            <p className="text-sm text-muted-foreground">Stay focused on this task</p>
          </div>
          <Badge variant={isPaused ? "secondary" : "default"} className="text-lg px-4 py-2">
            {isPaused ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Paused
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                In Progress
              </>
            )}
          </Badge>
        </div>

        {/* High Priority Alert */}
        {isHighPriority && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              <strong>High Priority Job:</strong> This order is urgent and needs immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Job Card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{currentJob.orderNumber}</CardTitle>
                  {isHighPriority && <Badge variant="destructive">High Priority</Badge>}
                </div>
                <CardDescription className="text-lg">{currentJob.itemName}</CardDescription>
                <p className="text-sm text-muted-foreground">SKU: {currentJob.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-lg font-semibold">
                  {new Date(currentJob.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Progress</span>
                <span className="text-2xl font-bold">
                  {currentJob.qtyCompleted} / {currentJob.qtyOrdered}
                </span>
              </div>
              <Progress value={progress} className="h-4" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{remainingQty} units remaining</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
            </div>

            {/* Current Step */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">Current Step</span>
              </div>
              <p className="text-2xl font-bold text-primary">{currentJob.currentStep}</p>
            </div>

            {/* Time Tracking */}
            <div className="flex items-center gap-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Time Elapsed</p>
                  <p className="text-xl font-bold">
                    {Math.floor(elapsedTime / 60)}h {elapsedTime % 60}m
                  </p>
                </div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Started At</p>
                <p className="font-medium">
                  {new Date(currentJob.startedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Checklist */}
            {currentJob.checklist && currentJob.checklist.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  <span className="font-semibold">Task Checklist</span>
                </div>
                <div className="space-y-2">
                  {currentJob.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 flex-shrink-0" />
                      )}
                      <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {currentJob.notes && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Job Notes:</strong> {currentJob.notes}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="lg"
                className="h-14 text-lg"
              >
                {isPaused ? (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Resume Job
                  </>
                ) : (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause Job
                  </>
                )}
              </Button>
              <Button size="lg" className="h-14 text-lg gap-2" asChild>
                <Link href={`/manufacturing/production-board?job=${currentJob.id}`}>
                  View Details
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
              disabled={remainingQty > 0}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Complete Job
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" asChild>
            <Link href="/mobile/job-scanner">
              <ScanLine className="h-5 w-5 mr-2" />
              Scan Next Job
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/manufacturing/production-board">
              View All Jobs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
