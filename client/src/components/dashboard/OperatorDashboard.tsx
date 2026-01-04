import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ClipboardCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface OperatorStats {
  myActiveJobs: number;
  jobsCompletedToday: number;
  itemsProcessedToday: number;
  pendingCycleCounts: number;
}

interface ActiveJob {
  id: string;
  jobNumber: string;
  description: string;
  status: string;
  progress: number;
  dueDate: string;
}

/**
 * Operator Dashboard - Simplified view for floor workers
 * Focus on assigned tasks and quick actions
 */
export function OperatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OperatorStats>({
    myActiveJobs: 0,
    jobsCompletedToday: 0,
    itemsProcessedToday: 0,
    pendingCycleCounts: 0,
  });
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOperatorData();
  }, []);

  const fetchOperatorData = async () => {
    setIsLoading(true);
    try {
      // Fetch operator-specific data
      const response = await fetch("/api/dashboard/operator");
      const data = await response.json();
      setStats(data.stats);
      setActiveJobs(data.activeJobs || []);
    } catch (error) {
      console.error("Failed to fetch operator dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="text-blue-100 mt-1">Here's what needs your attention today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>My Active Jobs</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              {stats.myActiveJobs}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed Today</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              {stats.jobsCompletedToday}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Items Processed</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              {stats.itemsProcessedToday}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Counts</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-orange-600" />
              {stats.pendingCycleCounts}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>My Active Jobs</CardTitle>
          <CardDescription>Jobs currently assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active jobs assigned. Check with your supervisor for new tasks.
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{job.jobNumber}</span>
                        <Badge
                          variant={
                            job.status === "IN_PROGRESS" ? "default" : "secondary"
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {job.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(job.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{job.progress}%</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      Continue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-24 flex-col">
              <Package className="h-6 w-6 mb-2" />
              Start Job
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <ClipboardCheck className="h-6 w-6 mb-2" />
              Cycle Count
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              Move Items
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <AlertTriangle className="h-6 w-6 mb-2" />
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
