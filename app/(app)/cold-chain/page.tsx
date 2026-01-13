"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Thermometer,
  Snowflake,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Droplets,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface TemperatureZone {
  zone: {
    id: string;
    name: string;
    code: string;
    minTemp: number;
    maxTemp: number;
    unit: string;
  };
  currentTemp: number;
  currentHumidity?: number;
  status: string;
  lastReading: string;
}

interface Excursion {
  id: string;
  zoneId: string;
  zoneName: string;
  startTime: string;
  endTime?: string;
  minTemp: number;
  maxTemp: number;
  duration: number;
  severity: string;
  status: string;
  affectedItems: Array<{
    itemSku: string;
    quantity: number;
    disposition?: string;
  }>;
}

interface ColdChainDashboard {
  zones: TemperatureZone[];
  activeExcursions: number;
  todayAlerts: number;
  complianceRate: number;
}

export default function ColdChainPage() {
  const [dashboard, setDashboard] = useState<ColdChainDashboard | null>(null);
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monitoring");
  const [selectedZone, setSelectedZone] = useState<string>("all");

  useEffect(() => {
    fetchDashboard();
    fetchExcursions();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/cold-chain");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExcursions() {
    try {
      const res = await fetch("/api/cold-chain?view=excursions");
      if (res.ok) {
        const data = await res.json();
        setExcursions(data.excursions || []);
      }
    } catch (error) {
      console.error("Failed to fetch excursions:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "NORMAL":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Normal</Badge>;
      case "WARNING":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case "CRITICAL":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
      case "DEVICE_ERROR":
        return <Badge variant="outline">Device Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getExcursionStatusBadge(status: string) {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive">Open</Badge>;
      case "INVESTIGATING":
        return <Badge className="bg-yellow-500">Investigating</Badge>;
      case "RESOLVED":
        return <Badge className="bg-blue-500">Resolved</Badge>;
      case "CLOSED":
        return <Badge className="bg-green-500">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getTempColor(temp: number, min: number, max: number): string {
    if (temp < min - 2 || temp > max + 2) return "text-red-600";
    if (temp < min || temp > max) return "text-yellow-600";
    return "text-green-600";
  }

  // Mock temperature history data
  const tempHistory = [
    { time: "00:00", frozen: -21, refrigerated: 4, controlled: 20 },
    { time: "04:00", frozen: -20, refrigerated: 5, controlled: 21 },
    { time: "08:00", frozen: -19, refrigerated: 5, controlled: 22 },
    { time: "12:00", frozen: -18, refrigerated: 6, controlled: 23 },
    { time: "16:00", frozen: -19, refrigerated: 5, controlled: 22 },
    { time: "20:00", frozen: -20, refrigerated: 4, controlled: 21 },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cold Chain Management</h1>
          <p className="text-muted-foreground">
            Temperature monitoring and compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.zones.length}</div>
              <p className="text-sm text-muted-foreground">monitored zones</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Active Excursions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${dashboard.activeExcursions > 0 ? "text-red-600" : "text-green-600"}`}>
                {dashboard.activeExcursions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{dashboard.todayAlerts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Compliance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboard.complianceRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="monitoring">
            <Thermometer className="h-4 w-4 mr-2" />
            Live Monitoring
          </TabsTrigger>
          <TabsTrigger value="excursions">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Excursions
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Zone Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboard?.zones.map((zone) => (
              <Card key={zone.zone.id} className={zone.status !== "NORMAL" ? "border-red-500" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {zone.zone.code === "FROZEN" && <Snowflake className="h-5 w-5 text-blue-500" />}
                        {zone.zone.code === "REFRIG" && <Thermometer className="h-5 w-5 text-cyan-500" />}
                        {zone.zone.code === "CRT" && <Thermometer className="h-5 w-5 text-green-500" />}
                        {zone.zone.name}
                      </CardTitle>
                      <CardDescription>
                        Target: {zone.zone.minTemp}°{zone.zone.unit} to {zone.zone.maxTemp}°{zone.zone.unit}
                      </CardDescription>
                    </div>
                    {getStatusBadge(zone.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className={`text-3xl font-bold ${getTempColor(zone.currentTemp, zone.zone.minTemp, zone.zone.maxTemp)}`}>
                        {zone.currentTemp}°{zone.zone.unit}
                      </p>
                    </div>
                    {zone.currentHumidity !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          Humidity
                        </p>
                        <p className="text-3xl font-bold">{zone.currentHumidity}%</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Last reading: {format(new Date(zone.lastReading), "HH:mm:ss")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Temperature Chart */}
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Temperature Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tempHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="frozen" stroke="#3b82f6" name="Frozen" />
                  <Line type="monotone" dataKey="refrigerated" stroke="#06b6d4" name="Refrigerated" />
                  <Line type="monotone" dataKey="controlled" stroke="#22c55e" name="Controlled" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excursions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Excursions</CardTitle>
              <CardDescription>Events where temperature exceeded acceptable ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Min/Max Temp</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Affected Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excursions.length > 0 ? (
                    excursions.map((excursion) => (
                      <TableRow key={excursion.id}>
                        <TableCell className="font-medium">{excursion.zoneName}</TableCell>
                        <TableCell>
                          {format(new Date(excursion.startTime), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>{excursion.duration} min</TableCell>
                        <TableCell>
                          {excursion.minTemp}° / {excursion.maxTemp}°
                        </TableCell>
                        <TableCell>
                          <Badge variant={excursion.severity === "CRITICAL" ? "destructive" : "outline"}>
                            {excursion.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{excursion.affectedItems?.length || 0} items</TableCell>
                        <TableCell>{getExcursionStatusBadge(excursion.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            Investigate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No excursions recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Temperature History</CardTitle>
              <CardDescription>Historical temperature readings by zone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {dashboard?.zones.map((zone) => (
                      <SelectItem key={zone.zone.id} value={zone.zone.id}>
                        {zone.zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">Export Data</Button>
              </div>
              <p className="text-center py-12 text-muted-foreground">
                Temperature history chart would be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
