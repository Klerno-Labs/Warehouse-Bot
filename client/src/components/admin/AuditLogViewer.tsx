import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  Shield,
  User,
  Calendar,
  Filter,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure" | "warning";
  details?: string;
}

const ACTION_TYPES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "APPROVE",
  "REJECT",
];

const ENTITY_TYPES = [
  "Item",
  "Location",
  "Job",
  "CycleCount",
  "InventoryEvent",
  "User",
  "PurchaseOrder",
  "ProductionOrder",
];

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  failure: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  warning: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100" },
};

export function AuditLogViewer() {
  const { toast } = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  useEffect(() => {
    fetchAuditLogs();
  }, [page, dateFrom, dateTo, userFilter, actionFilter, entityFilter, statusFilter]);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(userFilter && { userId: userFilter }),
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(entityFilter !== "all" && { entityType: entityFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await response.json();

      setEvents(data.events || sampleEvents);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      // Use sample data
      setEvents(sampleEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(userFilter && { userId: userFilter }),
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(entityFilter !== "all" && { entityType: entityFilter }),
      });

      const response = await fetch(`/api/admin/audit/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Audit log has been downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setUserFilter("");
    setActionFilter("all");
    setEntityFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Log
          </h2>
          <p className="text-muted-foreground">Complete audit trail of all system activities</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter audit events by various criteria</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">Entity Type</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger id="entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ENTITY_TYPES.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events ({events.length} results)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit events found. Try adjusting your filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const config = STATUS_CONFIG[event.status];
                    const StatusIcon = config.icon;

                    return (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(event.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{event.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{event.entityType}</div>
                            <div className="text-xs text-muted-foreground">{event.entityId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${config.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-xs capitalize">{event.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.details || "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => viewDetails(event)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
            <DialogDescription>Complete information about this audit event</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <div className="font-mono text-sm">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <div className="font-medium">{selectedEvent.userName}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <Badge variant="outline">{selectedEvent.action}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entity Type</Label>
                  <div>{selectedEvent.entityType}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Entity ID</Label>
                  <div className="font-mono text-sm">{selectedEvent.entityId}</div>
                </div>
                {selectedEvent.ipAddress && (
                  <div>
                    <Label className="text-xs text-muted-foreground">IP Address</Label>
                    <div className="font-mono text-sm">{selectedEvent.ipAddress}</div>
                  </div>
                )}
              </div>

              {selectedEvent.changes && Object.keys(selectedEvent.changes).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Changes</Label>
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                    {Object.entries(selectedEvent.changes).map(([field, change]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium">{field}:</span>
                        <div className="ml-4 text-muted-foreground">
                          <span className="line-through">{JSON.stringify(change.old)}</span>
                          {" → "}
                          <span className="text-green-600">{JSON.stringify(change.new)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.details && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Details</Label>
                  <div className="border rounded-lg p-4 bg-gray-50 text-sm">
                    {selectedEvent.details}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sample data for demonstration
const sampleEvents: AuditEvent[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    userId: "user-1",
    userName: "John Doe",
    action: "UPDATE",
    entityType: "Item",
    entityId: "item-123",
    status: "success",
    details: "Updated item cost",
    ipAddress: "192.168.1.100",
    changes: {
      costBase: { old: 10.5, new: 12.0 },
    },
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    userId: "user-2",
    userName: "Jane Smith",
    action: "CREATE",
    entityType: "Job",
    entityId: "job-456",
    status: "success",
    details: "Created new job for production",
    ipAddress: "192.168.1.101",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    userId: "user-1",
    userName: "John Doe",
    action: "DELETE",
    entityType: "Location",
    entityId: "loc-789",
    status: "failure",
    details: "Failed to delete: Location has inventory",
    ipAddress: "192.168.1.100",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    userId: "user-3",
    userName: "Admin User",
    action: "APPROVE",
    entityType: "CycleCount",
    entityId: "cc-321",
    status: "success",
    details: "Approved cycle count variance",
    ipAddress: "192.168.1.102",
  },
];
