"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Webhook,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  Link,
  Send,
} from "lucide-react";

interface WebhookDashboard {
  totalEndpoints: number;
  activeEndpoints: number;
  eventsToday: number;
  successRate: number;
  recentDeliveries: Array<{
    id: string;
    endpointUrl: string;
    status: string;
    responseCode?: number;
  }>;
  eventsByType: Array<{ type: string; count: number }>;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  events: string[];
  lastTriggered?: string;
  successRate?: number;
}

interface EventType {
  type: string;
  category: string;
  description: string;
}

export default function WebhooksPage() {
  const [dashboard, setDashboard] = useState<WebhookDashboard | null>(null);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchEndpoints();
    fetchEventTypes();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch webhook dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEndpoints() {
    try {
      const res = await fetch("/api/webhooks?view=endpoints");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.endpoints || []);
      }
    } catch (error) {
      console.error("Failed to fetch endpoints:", error);
    }
  }

  async function fetchEventTypes() {
    try {
      const res = await fetch("/api/webhooks?view=types");
      if (res.ok) {
        const data = await res.json();
        setEventTypes(data.types || []);
      }
    } catch (error) {
      console.error("Failed to fetch event types:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "PENDING":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "RETRYING":
        return <Badge className="bg-yellow-500"><RefreshCw className="h-3 w-3 mr-1" />Retrying</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Group event types by category
  const eventsByCategory = eventTypes.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, EventType[]>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhook Management</h1>
          <p className="text-muted-foreground">
            Event notifications and integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Link className="h-4 w-4" />
                Total Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.totalEndpoints}</div>
              <p className="text-sm text-green-600">{dashboard.activeEndpoints} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Events Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.eventsToday}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboard.successRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Event Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{eventTypes.length}</div>
              <p className="text-sm text-muted-foreground">available</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="endpoints">
            <Link className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="events">
            <Zap className="h-4 w-4 mr-2" />
            Event Types
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Send className="h-4 w-4 mr-2" />
            Deliveries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Events by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.eventsByType.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recentDeliveries.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No recent deliveries
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard?.recentDeliveries.map((delivery) => (
                      <div key={delivery.id} className="flex justify-between items-center p-2 border rounded">
                        <div className="truncate max-w-[200px]">
                          <span className="text-sm text-muted-foreground">{delivery.endpointUrl}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {delivery.responseCode && (
                            <Badge variant="outline">{delivery.responseCode}</Badge>
                          )}
                          {getStatusBadge(delivery.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.length > 0 ? (
                    endpoints.map((endpoint) => (
                      <TableRow key={endpoint.id}>
                        <TableCell className="font-medium">{endpoint.name}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {endpoint.url}
                        </TableCell>
                        <TableCell>{endpoint.events.length} events</TableCell>
                        <TableCell>
                          {endpoint.successRate !== undefined ? (
                            <span className={endpoint.successRate >= 95 ? "text-green-600" : "text-yellow-600"}>
                              {endpoint.successRate}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {endpoint.isActive ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline">Test</Button>
                          <Button size="sm" variant="outline">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No webhook endpoints configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Event Types</CardTitle>
              <CardDescription>Events you can subscribe to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category}>
                    <h3 className="font-medium text-lg mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {events.map((event) => (
                        <div key={event.type} className="p-3 border rounded">
                          <code className="text-sm font-mono text-blue-600">{event.type}</code>
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery History</CardTitle>
              <CardDescription>Recent webhook delivery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Delivery history will appear here once webhooks are configured
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Endpoint Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a new endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="My Integration" />
            </div>
            <div>
              <label className="text-sm font-medium">Endpoint URL</label>
              <Input placeholder="https://api.example.com/webhooks" />
            </div>
            <div>
              <label className="text-sm font-medium">Events to Subscribe</label>
              <p className="text-sm text-muted-foreground">
                Event selection would go here
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button>Create Endpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
