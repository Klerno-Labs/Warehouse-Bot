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
import { useAuth } from "@/lib/auth-context";
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
import { RefreshCw, Plus, Play, CheckCircle, XCircle, Eye, ClipboardCheck } from "lucide-react";
import type { CycleCount, CycleCountLine, CycleCountStatus, CycleCountType } from "@shared/cycle-counts";
import { CYCLE_COUNT_STATUS, CYCLE_COUNT_TYPE } from "@shared/cycle-counts";
import type { Location, Item } from "@shared/inventory";

type CycleCountWithDetails = CycleCount & {
  lines: CycleCountLine[];
  summary: {
    totalLines: number;
    countedLines: number;
    pendingLines: number;
    varianceLines: number;
  };
};

const STATUS_COLORS: Record<CycleCountStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function CycleCountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSite } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState<CycleCountWithDetails | null>(null);
  const [showCountDialog, setShowCountDialog] = useState(false);
  
  // Form state for creating new cycle count
  const [name, setName] = useState("");
  const [type, setType] = useState<CycleCountType>("FULL");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch cycle counts
  const queryParams = new URLSearchParams();
  if (statusFilter && statusFilter !== "all") {
    queryParams.set("status", statusFilter);
  }
  
  const { data: cycleCounts = [], isLoading } = useQuery<CycleCount[]>({
    queryKey: ["/api/cycle-counts", { status: statusFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/cycle-counts?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cycle counts");
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
    mutationFn: async (data: { name: string; type: CycleCountType; scheduledDate: string; notes?: string }) => {
      if (!currentSite?.id) {
        throw new Error("No site selected");
      }
      return apiRequest("POST", "/api/cycle-counts", {
        ...data,
        siteId: currentSite.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Cycle count created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });
  
  // Start count mutation
  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/cycle-counts/${id}`, { status: "IN_PROGRESS" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      toast({ title: "Cycle count started" });
    },
  });
  
  // Complete count mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/cycle-counts/${id}`, { status: "COMPLETED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      setSelectedCount(null);
      toast({ title: "Cycle count completed" });
    },
    onError: (error) => {
      toast({ title: "Cannot complete", description: error.message, variant: "destructive" });
    },
  });
  
  const resetForm = () => {
    setName("");
    setType("FULL");
    setScheduledDate("");
    setNotes("");
  };
  
  const handleCreate = () => {
    if (!name || !scheduledDate) {
      toast({ title: "Name and scheduled date are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name, type, scheduledDate, notes });
  };
  
  const openCountDetail = async (cycleCount: CycleCount) => {
    try {
      const res = await fetch(`/api/cycle-counts/${cycleCount.id}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedCount(data);
      setShowCountDialog(true);
    } catch (error) {
      toast({ title: "Failed to load details", variant: "destructive" });
    }
  };
  
  const getItemName = (itemId: string) => items.find(i => i.id === itemId)?.name || itemId;
  const getLocationName = (locationId: string) => locations.find(l => l.id === locationId)?.label || locationId;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Cycle Counts
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule and perform inventory audits to ensure accuracy.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle Count
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
                  {CYCLE_COUNT_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
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
          <CardTitle className="text-sm font-medium">Cycle Counts</CardTitle>
          <CardDescription>{cycleCounts.length} cycle count(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : cycleCounts.length === 0 ? (
            <p className="text-muted-foreground">No cycle counts found. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleCounts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">{count.name}</TableCell>
                    <TableCell>{count.type}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[count.status]} variant="secondary">
                        {count.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(count.scheduledDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(count.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCountDetail(count)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {count.status === "SCHEDULED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startMutation.mutate(count.id)}
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
            <DialogTitle>Create Cycle Count</DialogTitle>
            <DialogDescription>
              Schedule a new inventory count for auditing purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 2024 Full Count"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CycleCountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_COUNT_TYPE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
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

      {/* Count Detail Dialog */}
      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedCount && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  {selectedCount.name}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex gap-4 mt-2">
                    <Badge className={STATUS_COLORS[selectedCount.status]} variant="secondary">
                      {selectedCount.status.replace("_", " ")}
                    </Badge>
                    <span>Type: {selectedCount.type}</span>
                    <span>Scheduled: {new Date(selectedCount.scheduledDate).toLocaleDateString()}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 py-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedCount.summary.totalLines}</div>
                    <div className="text-xs text-muted-foreground">Total Lines</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{selectedCount.summary.countedLines}</div>
                    <div className="text-xs text-muted-foreground">Counted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-yellow-600">{selectedCount.summary.pendingLines}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">{selectedCount.summary.varianceLines}</div>
                    <div className="text-xs text-muted-foreground">Variances</div>
                  </CardContent>
                </Card>
              </div>

              {/* Lines Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Counted</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCount.lines.map((line) => (
                      <CycleCountLineRow
                        key={line.id}
                        line={line}
                        cycleCountId={selectedCount.id}
                        cycleCountStatus={selectedCount.status}
                        itemName={getItemName(line.itemId)}
                        locationName={getLocationName(line.locationId)}
                        onUpdate={() => openCountDetail(selectedCount)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                {selectedCount.status === "IN_PROGRESS" && selectedCount.summary.pendingLines === 0 && (
                  <Button onClick={() => completeMutation.mutate(selectedCount.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Count
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowCountDialog(false)}>
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

// Line row component for entering counts
function CycleCountLineRow({
  line,
  cycleCountId,
  cycleCountStatus,
  itemName,
  locationName,
  onUpdate,
}: {
  line: CycleCountLine;
  cycleCountId: string;
  cycleCountStatus: CycleCountStatus;
  itemName: string;
  locationName: string;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [countValue, setCountValue] = useState(String(line.countedQtyBase || ""));
  const [isEditing, setIsEditing] = useState(false);
  
  const recordMutation = useMutation({
    mutationFn: async (qty: number) => {
      return apiRequest("POST", `/api/cycle-counts/${cycleCountId}/record`, {
        lineId: line.id,
        countedQtyBase: qty,
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
      toast({ title: "Count recorded" });
    },
    onError: (error) => {
      toast({ title: "Failed to record", description: error.message, variant: "destructive" });
    },
  });
  
  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/cycle-counts/${cycleCountId}/approve`, {
        lineId: line.id,
        adjustInventory: true,
      });
    },
    onSuccess: () => {
      onUpdate();
      toast({ title: "Variance approved and inventory adjusted" });
    },
    onError: (error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });
  
  const handleSubmitCount = () => {
    const qty = parseFloat(countValue);
    if (isNaN(qty) || qty < 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    recordMutation.mutate(qty);
  };
  
  const variance = line.varianceQtyBase;
  const hasVariance = variance !== null && variance !== 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{itemName}</TableCell>
      <TableCell>{locationName}</TableCell>
      <TableCell className="text-right">{line.expectedQtyBase ?? "-"}</TableCell>
      <TableCell className="text-right">
        {cycleCountStatus === "IN_PROGRESS" && line.status === "PENDING" ? (
          isEditing ? (
            <div className="flex gap-2 justify-end">
              <Input
                type="number"
                value={countValue}
                onChange={(e) => setCountValue(e.target.value)}
                className="w-24 text-right"
              />
              <Button size="sm" onClick={handleSubmitCount} disabled={recordMutation.isPending}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Enter Count
            </Button>
          )
        ) : (
          line.countedQtyBase ?? "-"
        )}
      </TableCell>
      <TableCell className={`text-right ${hasVariance ? (variance! > 0 ? "text-green-600" : "text-red-600") : ""}`}>
        {variance !== undefined && variance !== null ? (variance > 0 ? "+" : "") + variance : "-"}
      </TableCell>
      <TableCell>
        <Badge variant={line.status === "VARIANCE_APPROVED" ? "default" : "secondary"}>
          {line.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {line.status === "COUNTED" && hasVariance && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            Approve & Adjust
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
