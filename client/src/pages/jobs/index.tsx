import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Briefcase, Plus, Play, CheckCircle, XCircle, Eye, Clock, AlertTriangle } from "lucide-react";
import type { Job, JobLine, JobStatus, JobType, JobPriority } from "@shared/jobs";
import { JOB_STATUS, JOB_TYPE, JOB_PRIORITY } from "@shared/jobs";
import type { Location, Item } from "@shared/inventory";

type JobWithDetails = Job & {
  lines: JobLine[];
  summary: {
    totalLines: number;
    completedLines: number;
    pendingLines: number;
    totalQtyOrdered: number;
    totalQtyCompleted: number;
  };
};

const STATUS_COLORS: Record<JobStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const PRIORITY_COLORS: Record<JobPriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-600",
};

export default function JobsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [showJobDialog, setShowJobDialog] = useState(false);
  
  // Form state for creating new job
  const [type, setType] = useState<JobType>("TRANSFER");
  const [priority, setPriority] = useState<JobPriority>("NORMAL");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Fetch jobs
  const queryParams = new URLSearchParams();
  if (statusFilter && statusFilter !== "all") {
    queryParams.set("status", statusFilter);
  }
  if (typeFilter && typeFilter !== "all") {
    queryParams.set("type", typeFilter);
  }
  
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });
  
  // Fetch locations and items for reference
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/inventory/locations"],
  });
  
  const { data: itemsResponse } = useQuery<{ items: Item[] }>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items?limit=1000");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
  const items = itemsResponse?.items || [];
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { type: JobType; priority: JobPriority; description?: string; dueDate?: string }) => {
      return apiRequest("POST", "/api/jobs", {
        ...data,
        siteId: localStorage.getItem("selectedSiteId") || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Job created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });
  
  // Start job mutation
  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/jobs/${id}`, { status: "IN_PROGRESS" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job started" });
    },
  });
  
  // Complete job mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/jobs/${id}`, { status: "COMPLETED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJob(null);
      setShowJobDialog(false);
      toast({ title: "Job completed" });
    },
    onError: (error) => {
      toast({ title: "Cannot complete", description: error.message, variant: "destructive" });
    },
  });
  
  const resetForm = () => {
    setType("TRANSFER");
    setPriority("NORMAL");
    setDescription("");
    setDueDate("");
  };
  
  const handleCreate = () => {
    createMutation.mutate({ type, priority, description: description || undefined, dueDate: dueDate || undefined });
  };
  
  const openJobDetail = async (job: Job) => {
    try {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedJob(data);
      setShowJobDialog(true);
    } catch (error) {
      toast({ title: "Failed to load details", variant: "destructive" });
    }
  };
  
  const getItemName = (itemId: string | null) => itemId ? (items.find(i => i.id === itemId)?.name || itemId) : "-";
  const getLocationName = (locationId: string | null) => locationId ? (locations.find(l => l.id === locationId)?.label || locationId) : "-";

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Jobs
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage warehouse tasks and operations.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {JOB_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {JOB_TYPE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Jobs</CardTitle>
          <CardDescription>{jobs.length} job(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground">No jobs found. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.jobNumber}</TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[job.status]} variant="secondary">
                        {job.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                        {job.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(job.dueDate).toLocaleDateString()}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openJobDetail(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {job.status === "OPEN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startMutation.mutate(job.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job</DialogTitle>
            <DialogDescription>
              Create a new warehouse task or operation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as JobType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITY.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {selectedJob.jobNumber}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex gap-4 mt-2">
                    <Badge className={STATUS_COLORS[selectedJob.status]} variant="secondary">
                      {selectedJob.status.replace("_", " ")}
                    </Badge>
                    <Badge className={PRIORITY_COLORS[selectedJob.priority]} variant="secondary">
                      {selectedJob.priority}
                    </Badge>
                    <span>Type: {selectedJob.type}</span>
                  </div>
                  {selectedJob.description && (
                    <p className="mt-2 text-muted-foreground">{selectedJob.description}</p>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 py-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedJob.summary.totalLines}</div>
                    <div className="text-xs text-muted-foreground">Total Lines</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{selectedJob.summary.completedLines}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-yellow-600">{selectedJob.summary.pendingLines}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {selectedJob.summary.totalQtyCompleted} / {selectedJob.summary.totalQtyOrdered}
                    </div>
                    <div className="text-xs text-muted-foreground">Qty Progress</div>
                  </CardContent>
                </Card>
              </div>

              {/* Lines Table */}
              {selectedJob.lines.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJob.lines.map((line) => (
                        <JobLineRow
                          key={line.id}
                          line={line}
                          jobId={selectedJob.id}
                          jobStatus={selectedJob.status}
                          itemName={getItemName(line.itemId)}
                          fromLocationName={getLocationName(line.fromLocationId)}
                          toLocationName={getLocationName(line.toLocationId)}
                          onUpdate={() => openJobDetail(selectedJob)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No lines added to this job yet.</p>
                </div>
              )}

              <DialogFooter>
                {selectedJob.status === "IN_PROGRESS" && selectedJob.summary.pendingLines === 0 && selectedJob.lines.length > 0 && (
                  <Button onClick={() => completeMutation.mutate(selectedJob.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Job
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowJobDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Line row component for completing work
function JobLineRow({
  line,
  jobId,
  jobStatus,
  itemName,
  fromLocationName,
  toLocationName,
  onUpdate,
}: {
  line: JobLine;
  jobId: string;
  jobStatus: JobStatus;
  itemName: string;
  fromLocationName: string;
  toLocationName: string;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [qtyValue, setQtyValue] = useState(String(line.qtyOrdered));
  const [isEditing, setIsEditing] = useState(false);
  
  const completeMutation = useMutation({
    mutationFn: async (qty: number) => {
      return apiRequest("POST", `/api/jobs/${jobId}/complete`, {
        lineId: line.id,
        qtyCompleted: qty,
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
      toast({ title: "Line completed" });
    },
    onError: (error) => {
      toast({ title: "Failed to complete", description: error.message, variant: "destructive" });
    },
  });
  
  const handleSubmit = () => {
    const qty = parseFloat(qtyValue);
    if (isNaN(qty) || qty < 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    completeMutation.mutate(qty);
  };

  return (
    <TableRow>
      <TableCell>{line.lineNumber}</TableCell>
      <TableCell className="font-medium">{itemName}</TableCell>
      <TableCell>{fromLocationName}</TableCell>
      <TableCell>{toLocationName}</TableCell>
      <TableCell className="text-right">{line.qtyOrdered}</TableCell>
      <TableCell className="text-right">
        {jobStatus === "IN_PROGRESS" && line.status !== "COMPLETED" ? (
          isEditing ? (
            <div className="flex gap-2 justify-end">
              <Input
                type="number"
                value={qtyValue}
                onChange={(e) => setQtyValue(e.target.value)}
                className="w-24 text-right"
              />
              <Button size="sm" onClick={handleSubmit} disabled={completeMutation.isPending}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span>{line.qtyCompleted}</span>
          )
        ) : (
          line.qtyCompleted
        )}
      </TableCell>
      <TableCell>
        <Badge variant={line.status === "COMPLETED" ? "default" : "secondary"}>
          {line.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {jobStatus === "IN_PROGRESS" && line.status !== "COMPLETED" && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Complete
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
