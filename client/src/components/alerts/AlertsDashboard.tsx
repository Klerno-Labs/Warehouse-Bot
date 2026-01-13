import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Bell,
  BellOff,
  Eye,
  Check,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "OVERSTOCK"
  | "EXPIRING_INVENTORY"
  | "QUALITY_ISSUE"
  | "CYCLE_COUNT_VARIANCE"
  | "SLOW_MOVING"
  | "PRODUCTION_DELAY"
  | "PURCHASE_ORDER_DUE"
  | "REORDER_POINT_REACHED"
  | "SAFETY_STOCK_BREACH"
  | "HIGH_SCRAP_RATE";

type AlertSeverity = "info" | "warning" | "critical";

interface Alert {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  tenantId: string;
}

interface AlertsData {
  alerts: Alert[];
  total: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-300",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-300",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-300",
    label: "Info",
  },
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
  OVERSTOCK: "Overstock",
  EXPIRING_INVENTORY: "Expiring Inventory",
  QUALITY_ISSUE: "Quality Issue",
  CYCLE_COUNT_VARIANCE: "Cycle Count Variance",
  SLOW_MOVING: "Slow Moving",
  PRODUCTION_DELAY: "Production Delay",
  PURCHASE_ORDER_DUE: "Purchase Order Due",
  REORDER_POINT_REACHED: "Reorder Point Reached",
  SAFETY_STOCK_BREACH: "Safety Stock Breach",
  HIGH_SCRAP_RATE: "High Scrap Rate",
};

export function AlertsDashboard() {
  const { toast } = useToast();
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | AlertSeverity>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AlertType>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, typeFilter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAlerts();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, severityFilter, typeFilter]);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        resolved: "false",
        ...(severityFilter !== "all" && { severity: severityFilter }),
        ...(typeFilter !== "all" && { type: typeFilter }),
      });

      const response = await fetch(`/api/alerts?${params.toString()}`);
      const data = await response.json();

      setAlertsData(data);
    } catch (error: any) {
      toast({
        title: "Failed to load alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAlertsNow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alerts?action=check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      toast({
        title: "Alerts checked",
        description: result.message,
      });

      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Failed to check alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?action=acknowledge&id=${alertId}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to acknowledge alert");

      toast({
        title: "Alert acknowledged",
      });

      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Failed to acknowledge alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?action=resolve&id=${alertId}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to resolve alert");

      toast({
        title: "Alert resolved",
      });

      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Failed to resolve alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAlerts = alertsData?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Alert Monitor
          </h2>
          <p className="text-muted-foreground">Real-time inventory and operational alerts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Auto-Refresh ON
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Auto-Refresh OFF
              </>
            )}
          </Button>
          <Button onClick={checkAlertsNow} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Check Now
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {alertsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{alertsData.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Unresolved alerts</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{alertsData.criticalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{alertsData.warningCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Attention needed</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{alertsData.infoCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Informational</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="warning">Warning Only</SelectItem>
                  <SelectItem value="info">Info Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alert Types</SelectItem>
                  {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts ({filteredAlerts.length})</CardTitle>
          <CardDescription>Alerts requiring attention or acknowledgment</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
              <div className="text-xl font-semibold text-emerald-600 mb-2">All Clear!</div>
              <div className="text-muted-foreground">No active alerts at this time</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const config = SEVERITY_CONFIG[alert.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`border-2 rounded-lg p-4 ${config.border} ${config.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <span className="font-semibold text-lg">{alert.title}</span>
                          <Badge variant="outline" className={`${config.bg} ${config.color}`}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ALERT_TYPE_LABELS[alert.type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                          </span>
                          <span>Entity: {alert.entityType}</span>
                          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                            <span>
                              {Object.entries(alert.metadata)
                                .slice(0, 2)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
