import {
  Package,
  Briefcase,
  ShoppingCart,
  RefreshCw,
  Wrench,
  TrendingUp,
  LayoutDashboard,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ModuleId } from "@shared/schema";

const moduleConfig: Record<
  ModuleId,
  {
    title: string;
    description: string;
    icon: typeof Package;
    primaryAction: string;
    columns: string[];
    sampleData: Record<string, string>[];
  }
> = {
  inventory: {
    title: "Inventory",
    description: "Manage stock levels, locations, and movements",
    icon: Package,
    primaryAction: "Add Item",
    columns: ["SKU", "Name", "Location", "Quantity", "Status"],
    sampleData: [
      { sku: "WDG-001", name: "Widget A", location: "A-01-01", quantity: "245", status: "In Stock" },
      { sku: "WDG-002", name: "Widget B", location: "A-01-02", quantity: "128", status: "In Stock" },
      { sku: "CMP-001", name: "Component X", location: "B-02-01", quantity: "15", status: "Low Stock" },
      { sku: "CMP-002", name: "Component Y", location: "B-02-02", quantity: "0", status: "Out of Stock" },
      { sku: "ASM-001", name: "Assembly Kit", location: "C-01-01", quantity: "52", status: "In Stock" },
    ],
  },
  jobs: {
    title: "Jobs",
    description: "Track work orders and production jobs",
    icon: Briefcase,
    primaryAction: "Create Job",
    columns: ["Job #", "Product", "Quantity", "Due Date", "Status"],
    sampleData: [
      { "job #": "JOB-1234", product: "Widget Assembly", quantity: "100", "due date": "Jan 15", status: "In Progress" },
      { "job #": "JOB-1235", product: "Component Pack", quantity: "250", "due date": "Jan 16", status: "Pending" },
      { "job #": "JOB-1236", product: "Custom Order", quantity: "50", "due date": "Jan 17", status: "In Progress" },
      { "job #": "JOB-1237", product: "Bulk Production", quantity: "500", "due date": "Jan 20", status: "Scheduled" },
    ],
  },
  "cycle-counts": {
    title: "Cycle Counts",
    description: "Perform inventory audits and reconciliation",
    icon: RefreshCw,
    primaryAction: "Start Count",
    columns: ["Count #", "Area", "Items", "Variance", "Status"],
    sampleData: [
      { "count #": "CC-001", area: "Zone A", items: "45", variance: "0%", status: "Completed" },
      { "count #": "CC-002", area: "Zone B", items: "32", variance: "-2.1%", status: "In Progress" },
      { "count #": "CC-003", area: "Zone C", items: "28", variance: "—", status: "Scheduled" },
    ],
  },
  dashboards: {
    title: "Dashboards",
    description: "Analytics and reporting dashboards",
    icon: LayoutDashboard,
    primaryAction: "New Dashboard",
    columns: ["Dashboard", "Type", "Last Updated", "Owner"],
    sampleData: [
      { dashboard: "Operations Overview", type: "Standard", "last updated": "Today", owner: "System" },
      { dashboard: "Inventory Trends", type: "Custom", "last updated": "Yesterday", owner: "Admin" },
      { dashboard: "Production KPIs", type: "Standard", "last updated": "Today", owner: "System" },
    ],
  },
};

export default function ModulePlaceholderPage({ moduleId }: { moduleId: ModuleId }) {
  
  const config = moduleConfig[moduleId];
  
  if (!config) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Module Not Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The requested module could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-module-title">
              {config.title}
            </h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Button data-testid="button-primary-action">
          <Plus className="mr-2 h-4 w-4" />
          {config.primaryAction}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">All {config.title}</CardTitle>
              <CardDescription>
                {config.sampleData.length} items total
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${config.title.toLowerCase()}...`}
                  className="w-[200px] pl-9"
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="icon" data-testid="button-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map((col) => (
                    <TableHead
                      key={col}
                      className="text-xs font-medium uppercase tracking-wide"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.sampleData.map((row, idx) => (
                  <TableRow key={idx} className="hover-elevate" data-testid={`table-row-${idx}`}>
                    {config.columns.map((col) => {
                      const value = row[col.toLowerCase()];
                      const isStatus = col.toLowerCase() === "status";
                      
                      return (
                        <TableCell key={col} className="text-sm">
                          {isStatus ? (
                            <Badge
                              variant={
                                value === "Completed" || value === "In Stock" || value === "Received"
                                  ? "default"
                                  : value === "In Progress" || value === "In Transit"
                                  ? "secondary"
                                  : value === "Low Stock" || value === "Delayed"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {value}
                            </Badge>
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing 1-{config.sampleData.length} of {config.sampleData.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium">Module Placeholder</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            This is a placeholder page for the {config.title} module. 
            Full functionality will be implemented in future development phases.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
