"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Factory,
  Clock,
  User,
  Search,
  Filter,
  MoreVertical,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  allowConcurrent: boolean;
  requireQC: boolean;
  defaultDuration?: number;
  order: number;
  isActive: boolean;
}

interface RoutingStep {
  sequence: number;
  required: boolean;
  canSkip: boolean;
  estimatedMinutes?: number;
  department: CustomDepartment;
}

interface Job {
  id: string;
  orderNumber: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  status: string;
  currentStepSequence?: number;
  completedSteps: number;
  totalSteps: number;
  assignedTo?: string;
  startedAt?: string;
  dueDate?: string;
  routing?: {
    id: string;
    name: string;
    steps: RoutingStep[];
  };
}

interface KanbanColumn {
  department: CustomDepartment;
  jobs: Job[];
  stats: {
    active: number;
    pending: number;
    avgTime?: number;
  };
}

export default function KanbanBoardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch custom departments
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery<{
    departments: CustomDepartment[];
  }>({
    queryKey: ["/api/departments"],
  });

  // Fetch jobs with routing information
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: Job[] }>({
    queryKey: ["/api/production/kanban"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const departments = departmentsData?.departments || [];
  const jobs = jobsData?.jobs || [];

  // Build Kanban columns
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    if (!departments.length || !jobs.length) return [];

    return departments
      .filter((dept) => dept.isActive)
      .sort((a, b) => a.order - b.order)
      .map((dept) => {
        // Find jobs currently at this department
        const deptJobs = jobs.filter((job) => {
          if (!job.routing) return false;

          // Find current step
          const currentStep = job.routing.steps.find(
            (step) => step.sequence === job.currentStepSequence
          );

          return currentStep?.department.id === dept.id;
        });

        const activeJobs = deptJobs.filter(
          (j) => j.status === "IN_PROGRESS" || j.status === "ACTIVE"
        );
        const pendingJobs = deptJobs.filter((j) => j.status === "PENDING");

        return {
          department: dept,
          jobs: deptJobs,
          stats: {
            active: activeJobs.length,
            pending: pendingJobs.length,
          },
        };
      });
  }, [departments, jobs]);

  // Filter jobs by search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery && filterStatus === "all") return kanbanColumns;

    return kanbanColumns.map((column) => ({
      ...column,
      jobs: column.jobs.filter((job) => {
        const matchesSearch =
          !searchQuery ||
          job.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.itemSku.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === "all" || job.status === filterStatus;

        return matchesSearch && matchesStatus;
      }),
    }));
  }, [kanbanColumns, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
      case "ACTIVE":
        return "bg-blue-500";
      case "PENDING":
        return "bg-yellow-500";
      case "PAUSED":
        return "bg-orange-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatElapsedTime = (startedAt?: string) => {
    if (!startedAt) return null;

    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getProgressPercentage = (job: Job) => {
    if (job.totalSteps === 0) return 0;
    return Math.round((job.completedSteps / job.totalSteps) * 100);
  };

  if (departmentsLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Factory className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading production board...</p>
        </div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Departments Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to configure departments before using the Kanban board.
            </p>
            <Button asChild>
              <a href="/admin/departments">Configure Departments</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6 text-primary" />
              Production Kanban Board
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time job tracking across departments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {jobs.length} Active Jobs
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, item, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                All Jobs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("IN_PROGRESS")}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("PENDING")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("PAUSED")}>
                Paused
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="h-full p-4 flex gap-4" style={{ minWidth: "max-content" }}>
          {filteredColumns.map((column) => (
            <div
              key={column.department.id}
              className="flex flex-col w-80 flex-shrink-0"
            >
              {/* Column Header */}
              <Card className="mb-3">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${column.department.color}20` }}
                      >
                        {column.department.icon || "📦"}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {column.department.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {column.stats.active + column.stats.pending} jobs
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {column.stats.active > 0 && (
                        <Badge
                          variant="default"
                          className="bg-blue-600 text-xs h-5"
                        >
                          {column.stats.active}
                        </Badge>
                      )}
                      {column.stats.pending > 0 && (
                        <Badge variant="secondary" className="text-xs h-5">
                          {column.stats.pending}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!column.department.allowConcurrent && column.stats.active > 1 && (
                    <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Multiple active (single concurrent only)
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Jobs List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {column.jobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No jobs in this department
                    </div>
                  ) : (
                    column.jobs.map((job) => (
                      <Card
                        key={job.id}
                        className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                        style={{ borderLeftColor: column.department.color }}
                      >
                        <CardContent className="p-3">
                          {/* Job Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {job.orderNumber}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {job.itemSku}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Assign User</DropdownMenuItem>
                                <DropdownMenuItem>Add Note</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Item Name */}
                          <div className="text-xs mb-2 line-clamp-2">
                            {job.itemName}
                          </div>

                          {/* Quantity */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>Qty: {job.quantity}</span>
                            <span>•</span>
                            <span>
                              {job.completedSteps}/{job.totalSteps} steps
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${getProgressPercentage(job)}%`,
                                  backgroundColor: column.department.color,
                                }}
                              />
                            </div>
                          </div>

                          {/* Status and Timing */}
                          <div className="flex items-center justify-between text-xs">
                            <Badge
                              variant="secondary"
                              className={`${getStatusColor(job.status)} text-white h-5`}
                            >
                              {job.status}
                            </Badge>

                            {job.startedAt && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatElapsedTime(job.startedAt)}</span>
                              </div>
                            )}
                          </div>

                          {/* Assigned User */}
                          {job.assignedTo && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
                              <User className="h-3 w-3" />
                              <span>{job.assignedTo}</span>
                            </div>
                          )}

                          {/* Next Department Preview */}
                          {job.routing && job.currentStepSequence && (
                            (() => {
                              const nextStep = job.routing.steps.find(
                                (s) => s.sequence === (job.currentStepSequence || 0) + 1
                              );
                              return nextStep ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
                                  <ArrowRight className="h-3 w-3" />
                                  <span>Next: {nextStep.department.name}</span>
                                </div>
                              ) : null;
                            })()
                          )}

                          {/* Due Date Warning */}
                          {job.dueDate && new Date(job.dueDate) < new Date() && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-2 pt-2 border-t">
                              <AlertCircle className="h-3 w-3" />
                              <span>Overdue</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}

          {/* Empty State if no departments */}
          {filteredColumns.length === 0 && departments.length > 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs found matching your filters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
