import { ClipboardList, Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const auditEvents = [
  {
    id: "1",
    timestamp: "2024-01-15 14:32:15",
    user: "John Admin",
    action: "CREATE",
    entityType: "Job",
    entityId: "JOB-1234",
    details: "Created new production job",
  },
  {
    id: "2",
    timestamp: "2024-01-15 14:28:42",
    user: "Sarah Johnson",
    action: "UPDATE",
    entityType: "Inventory",
    entityId: "WDG-001",
    details: "Updated stock quantity from 200 to 245",
  },
  {
    id: "3",
    timestamp: "2024-01-15 14:15:30",
    user: "Mike Wilson",
    action: "LOGIN",
    entityType: "Session",
    entityId: null,
    details: "User logged in successfully",
  },
  {
    id: "4",
    timestamp: "2024-01-15 13:55:18",
    user: "System",
    action: "ALERT",
    entityType: "Inventory",
    entityId: "CMP-001",
    details: "Low stock threshold triggered",
  },
  {
    id: "5",
    timestamp: "2024-01-15 13:42:05",
    user: "Emily Davis",
    action: "COMPLETE",
    entityType: "Job",
    entityId: "JOB-1233",
    details: "Job marked as completed",
  },
  {
    id: "6",
    timestamp: "2024-01-15 12:30:00",
    user: "Tom Brown",
    action: "VIEW",
    entityType: "Report",
    entityId: "RPT-001",
    details: "Viewed inventory summary report",
  },
  {
    id: "7",
    timestamp: "2024-01-15 11:15:22",
    user: "John Admin",
    action: "UPDATE",
    entityType: "User",
    entityId: "USR-005",
    details: "Changed user role from Viewer to Operator",
  },
];

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  ALERT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  VIEW: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

export default function AdminAuditPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-audit-title">
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground">
              Track all system events and user actions
            </p>
          </div>
        </div>
        <Button variant="outline" data-testid="button-export-audit">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Event Timeline</CardTitle>
              <CardDescription>Showing recent activity</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  className="w-[200px] pl-9"
                  data-testid="input-search-audit"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[130px]" data-testid="select-action-filter">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[130px]" data-testid="select-entity-filter">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="flex gap-4 rounded-md border p-4 hover-elevate"
                data-testid={`audit-event-${event.id}`}
              >
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1 w-px bg-border mt-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        actionColors[event.action] || actionColors.VIEW
                      }`}
                    >
                      {event.action}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {event.entityType}
                    </Badge>
                    {event.entityId && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {event.entityId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{event.details}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{event.user}</span>
                    <span>·</span>
                    <span className="font-mono">{event.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <Button variant="outline" data-testid="button-load-more">
              Load More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
