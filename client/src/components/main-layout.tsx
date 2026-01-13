import { Search, Bell, HelpCircle, Command, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { cn } from "@/lib/utils";

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
  sales: "Sales",
  customers: "Customers",
  orders: "Orders",
  shipments: "Shipments",
  suppliers: "Suppliers",
  receipts: "Receipts",
  "purchase-orders": "Purchase Orders",
  engineering: "Engineering",
  "sales-pit": "Sales Pit",
  reports: "Reports",
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar enabledModules={enabledModules} />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          {/* Premium Header */}
          <header className={cn(
            "sticky top-0 z-50 flex h-14 items-center gap-4 px-4 lg:px-6",
            "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          )}>
            {/* Left Section */}
            <div className="flex items-center gap-3">
              <SidebarTrigger
                data-testid="button-sidebar-toggle"
                className={cn(
                  "h-8 w-8 rounded-lg transition-colors",
                  "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              />

              <div className="hidden md:block h-4 w-px bg-border" />

              <CompanySwitcher />

              <div className="hidden lg:block h-4 w-px bg-border" />

              {/* Breadcrumb */}
              <Breadcrumb className="hidden lg:flex">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        href="/"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathSegments.map((segment, idx) => (
                    <BreadcrumbItem key={segment}>
                      <BreadcrumbSeparator className="text-border" />
                      {idx === pathSegments.length - 1 ? (
                        <BreadcrumbPage className="text-sm font-medium text-foreground">
                          {breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            href={`/${pathSegments.slice(0, idx + 1).join("/")}`}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Right Section */}
            <div className="flex flex-1 items-center justify-end gap-2">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className={cn(
                    "w-[180px] lg:w-[280px] pl-9 pr-12 h-9",
                    "bg-muted/50 border-transparent",
                    "focus:bg-background focus:border-input",
                    "placeholder:text-muted-foreground/70",
                    "transition-all duration-200"
                  )}
                  data-testid="input-global-search"
                />
                <kbd className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2",
                  "pointer-events-none hidden lg:inline-flex",
                  "h-5 select-none items-center gap-1 rounded border",
                  "bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
                )}>
                  <Command className="h-3 w-3" />K
                </kbd>
              </div>

              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <Link href="/help">
                          <HelpCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Help & Documentation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground relative"
                        data-testid="button-notifications"
                      >
                        <Bell className="h-4 w-4" />
                        {/* Notification dot */}
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="h-4 w-px bg-border mx-1" />

                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="h-full p-4 lg:p-6">
              <div className="mx-auto max-w-[1600px] h-full">
                {children ?? null}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
