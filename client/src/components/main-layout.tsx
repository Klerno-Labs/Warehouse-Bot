import { Menu, Search, Bell } from "lucide-react";
import { Switch, Route } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

import DashboardPage from "@/pages/dashboard";
import ModulePlaceholderPage from "@/pages/module-placeholder";
import InventoryDashboardPage from "@/pages/inventory";
import InventoryItemsPage from "@/pages/inventory/items";
import InventoryLocationsPage from "@/pages/inventory/locations";
import InventoryBalancesPage from "@/pages/inventory/balances";
import InventoryEventsPage from "@/pages/inventory/events";
import InventoryReasonCodesPage from "@/pages/inventory/reason-codes";
import AdminUsersPage from "@/pages/admin/users";
import AdminFacilitiesPage from "@/pages/admin/facilities";
import AdminAuditPage from "@/pages/admin/audit";
import AdminSettingsPage from "@/pages/admin/settings";
import NotFound from "@/pages/not-found";

const breadcrumbLabels: Record<string, string> = {
  modules: "Modules",
  admin: "Administration",
  inventory: "Inventory",
  jobs: "Jobs",
  purchasing: "Purchasing",
  "cycle-counts": "Cycle Counts",
  maintenance: "Maintenance",
  "sales-atp": "Sales ATP",
  dashboards: "Dashboards",
  users: "Users",
  facilities: "Facilities",
  audit: "Audit Log",
  settings: "Settings",
  items: "Items",
  locations: "Locations",
  balances: "Balances",
  events: "Events",
  "reason-codes": "Reason Codes",
};

export function MainLayout() {
  const [location] = useLocation();
  
  const { data: tenantData, isLoading } = useQuery<{ enabledModules: string[] }>({
    queryKey: ["/api/tenant/modules"],
  });

  const enabledModules = tenantData?.enabledModules || [
    "inventory",
    "jobs",
    "purchasing",
    "cycle-counts",
    "maintenance",
    "sales-atp",
    "dashboards",
  ];

  const pathSegments = location.split("/").filter(Boolean);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar enabledModules={enabledModules} />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {pathSegments.map((segment, idx) => (
                  <BreadcrumbItem key={segment}>
                    <BreadcrumbSeparator />
                    {idx === pathSegments.length - 1 ? (
                      <BreadcrumbPage>
                        {breadcrumbLabels[segment] || segment}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={`/${pathSegments.slice(0, idx + 1).join("/")}`}>
                        {breadcrumbLabels[segment] || segment}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-[200px] pl-9 lg:w-[280px]"
                  data-testid="input-global-search"
                />
              </div>
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/modules/inventory" component={InventoryDashboardPage} />
              <Route path="/modules/inventory/items" component={InventoryItemsPage} />
              <Route path="/modules/inventory/locations" component={InventoryLocationsPage} />
              <Route path="/modules/inventory/balances" component={InventoryBalancesPage} />
              <Route path="/modules/inventory/events" component={InventoryEventsPage} />
              <Route path="/modules/inventory/reason-codes" component={InventoryReasonCodesPage} />
              <Route path="/modules/:moduleId" component={ModulePlaceholderPage} />
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/facilities" component={AdminFacilitiesPage} />
              <Route path="/admin/audit" component={AdminAuditPage} />
              <Route path="/admin/settings" component={AdminSettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
