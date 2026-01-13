import { Menu, Search, Bell, HelpCircle, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CompanySwitcher } from "@/components/company-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranding } from "@/hooks/useBranding";

const breadcrumbLabels: Record<string, string> = {
  modules: "Modules",
  admin: "Administration",
  manufacturing: "Manufacturing",
  mobile: "Mobile",
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
  "production-board": "Production Board",
  "job-scanner": "Job Scanner",
  analytics: "Analytics",
  "component-tracking": "Component Tracking",
  "dba-import": "DBA Import",
};

export function MainLayout({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();

  // Apply custom branding
  useBranding();

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

  const pathSegments = pathname.split("/").filter(Boolean);

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
      <div className="flex h-screen w-full bg-background">
        <AppSidebar enabledModules={enabledModules} />
        <SidebarInset className="flex flex-1 flex-col">
          {/* Elite Header - Elevated with subtle shadow */}
          <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 shadow-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="hover:bg-accent">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>

            <CompanySwitcher />

            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                      Home
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {pathSegments.map((segment, idx) => (
                  <BreadcrumbItem key={segment}>
                    <BreadcrumbSeparator className="text-border" />
                    {idx === pathSegments.length - 1 ? (
                      <BreadcrumbPage className="text-sm font-semibold text-foreground">
                        {breadcrumbLabels[segment] || segment}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={`/${pathSegments.slice(0, idx + 1).join("/")}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {breadcrumbLabels[segment] || segment}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items, SKUs, orders..."
                  className="w-[200px] pl-9 pr-12 lg:w-[300px] bg-background border-border hover:border-primary/50 focus:border-primary transition-colors"
                  data-testid="input-global-search"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <Command className="h-3 w-3" />K
                </kbd>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground" asChild>
                      <Link href="/help">
                        <HelpCircle className="h-5 w-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Help & Documentation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Main Content - Premium Spacing */}
          <main className="flex-1 overflow-auto bg-background p-6 md:p-8">
            <div className="mx-auto max-w-[1600px]">
              {children ?? null}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
