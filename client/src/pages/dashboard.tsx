import { Package, Briefcase, AlertTriangle, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

const stats = [
  {
    title: "Active Jobs",
    value: "24",
    change: "+3 from yesterday",
    changeType: "positive" as const,
    icon: Briefcase,
  },
  {
    title: "Inventory Items",
    value: "1,847",
    change: "98% accuracy",
    changeType: "neutral" as const,
    icon: Package,
  },
  {
    title: "Pending Orders",
    value: "12",
    change: "5 urgent",
    changeType: "warning" as const,
    icon: Clock,
  },
  {
    title: "Completed Today",
    value: "38",
    change: "+12% vs avg",
    changeType: "positive" as const,
    icon: CheckCircle,
  },
];

const recentActivity = [
  { id: 1, action: "Job #1234 completed", user: "John Smith", time: "2 min ago", type: "success" },
  { id: 2, action: "Inventory count started", user: "Sarah Johnson", time: "15 min ago", type: "info" },
  { id: 3, action: "Low stock alert: Widget A", user: "System", time: "1 hour ago", type: "warning" },
  { id: 4, action: "New purchase order created", user: "Mike Wilson", time: "2 hours ago", type: "info" },
  { id: 5, action: "Maintenance scheduled", user: "Tech Team", time: "3 hours ago", type: "info" },
];

export default function DashboardPage() {
  const { user, currentSite } = useAuth();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName}. Here's what's happening at{" "}
          <span className="font-medium">{currentSite?.name}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <p className={`mt-1 text-xs ${
                stat.changeType === "positive"
                  ? "text-green-600 dark:text-green-400"
                  : stat.changeType === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QuickActionCard
                  icon={Package}
                  title="View Inventory"
                  description="Check stock levels"
                  href="/modules/inventory"
                />
                <QuickActionCard
                  icon={Briefcase}
                  title="Manage Jobs"
                  description="View active jobs"
                  href="/modules/jobs"
                />
                <QuickActionCard
                  icon={TrendingUp}
                  title="Sales ATP"
                  description="Available to promise"
                  href="/modules/sales-atp"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} · {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </div>
          <Badge variant="secondary">3 new</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AlertItem
              title="Low Stock Alert"
              description="Widget A is below minimum threshold (15 remaining)"
              severity="warning"
            />
            <AlertItem
              title="Maintenance Due"
              description="Pleater 1 scheduled maintenance in 2 days"
              severity="info"
            />
            <AlertItem
              title="Order Delayed"
              description="PO-2024-0892 shipment delayed by supplier"
              severity="error"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate"
      data-testid={`link-quick-action-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}

function AlertItem({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: "warning" | "info" | "error";
}) {
  const colors = {
    warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
    error: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  };

  return (
    <div className={`rounded-r-md border-l-4 p-4 ${colors[severity]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
