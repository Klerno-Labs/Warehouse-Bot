import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Package,
  Briefcase,
  ShoppingCart,
  Wrench,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  ClipboardList,
  LogOut,
  ChevronDown,
  Factory,
  BarChart3,
  ScanLine,
  Database,
  Truck,
  ArrowDownToLine,
  FileText,
  Target,
  Boxes,
  ShoppingBag,
  UserCircle,
  Shield,
  RefreshCw,
  Smartphone,
  Zap,
  Layers,
  Activity,
  TrendingUp,
  PieChart,
  Gauge,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { getRoleTier } from "@shared/permissions";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Core Operations - Primary daily tasks
const coreOperations: NavItem[] = [
  { title: "Inventory", url: "/modules/inventory", icon: Package },
  { title: "Jobs", url: "/modules/jobs", icon: Briefcase },
  { title: "Cycle Counts", url: "/modules/cycle-counts", icon: RefreshCw },
  { title: "Job Scanner", url: "/mobile/job-scanner", icon: Smartphone },
];

// Purchasing
const purchasingItems: NavItem[] = [
  { title: "Overview", url: "/purchasing", icon: ShoppingCart },
  { title: "Purchase Orders", url: "/purchasing/purchase-orders", icon: FileText },
  { title: "Receipts", url: "/purchasing/receipts", icon: ArrowDownToLine },
  { title: "Suppliers", url: "/purchasing/suppliers", icon: Truck },
];

// Sales
const salesItems: NavItem[] = [
  { title: "Overview", url: "/sales", icon: ShoppingBag },
  { title: "Customers", url: "/sales/customers", icon: UserCircle },
  { title: "Sales Orders", url: "/sales/orders", icon: FileText },
  { title: "Shipments", url: "/sales/shipments", icon: Truck },
  { title: "Analytics", url: "/sales/analytics", icon: BarChart3 },
];

// Analytics & Planning
const analyticsItems: NavItem[] = [
  { title: "Dashboards", url: "/modules/dashboards", icon: LayoutDashboard },
  { title: "Reports", url: "/reports", icon: PieChart },
  { title: "Production Board", url: "/manufacturing/production-board", icon: Factory },
  { title: "Analytics", url: "/manufacturing/analytics", icon: TrendingUp },
  { title: "Sales ATP", url: "/modules/inventory?view=atp", icon: Target },
  { title: "Component Tracking", url: "/manufacturing/component-tracking", icon: ScanLine },
];

// Administration
const adminItems: NavItem[] = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Facilities", url: "/admin/facilities", icon: Building2 },
  { title: "Items", url: "/items", icon: Boxes },
  { title: "DBA Import", url: "/admin/dba-import", icon: Database },
  { title: "Audit Log", url: "/admin/audit", icon: ClipboardList },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

// Executive
const executiveItems: NavItem[] = [
  { title: "Custom Roles", url: "/admin/custom-roles", icon: Shield },
  { title: "Departments", url: "/admin/departments", icon: Building2 },
  { title: "Department Users", url: "/admin/department-users", icon: Users },
  { title: "Badge Management", url: "/admin/badges", icon: UserCircle },
];

interface AppSidebarProps {
  enabledModules: string[];
}

function NavSectionComponent({
  section,
  pathname,
  defaultOpen = true
}: {
  section: NavSection;
  pathname: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasActiveItem = section.items.some(
    item => pathname === item.url || pathname.startsWith(item.url.split("?")[0] + "/")
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider",
            "text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50",
            hasActiveItem && "text-foreground"
          )}
        >
          <span>{section.title}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              !isOpen && "-rotate-90"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive = pathname === item.url ||
              (item.url !== "/" && pathname.startsWith(item.url.split("?")[0] + "/")) ||
              (item.url.includes("?") && pathname === item.url.split("?")[0]);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "relative transition-all duration-200",
                    isActive && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <Link
                    href={item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center gap-3"
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                    )}
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar({ enabledModules }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, currentSite, availableSites, selectSite, logout } = useAuth();

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "??";

  // Get user's role tier (1-6)
  const roleTier = user?.role ? getRoleTier(user.role as any) : 0;

  // Tier checks for navigation visibility
  const isSales = roleTier >= 3;
  const isEngineering = roleTier >= 4;
  const isExecutive = roleTier >= 5;
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const sections: { section: NavSection; show: boolean }[] = [
    {
      section: { title: "Operations", items: coreOperations, defaultOpen: true },
      show: true
    },
    {
      section: { title: "Purchasing", items: purchasingItems, defaultOpen: true },
      show: true
    },
    {
      section: { title: "Sales", items: salesItems, defaultOpen: false },
      show: isSales
    },
    {
      section: { title: "Analytics", items: analyticsItems, defaultOpen: true },
      show: true
    },
    {
      section: { title: "Executive", items: executiveItems, defaultOpen: false },
      show: isExecutive
    },
    {
      section: { title: "Administration", items: adminItems, defaultOpen: false },
      show: isExecutive
    },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">Warehouse Core</span>
              <span className="text-xs text-muted-foreground truncate">{user?.tenantName || "Enterprise"}</span>
            </div>
          </div>
        </div>

        {/* Site Selector */}
        {availableSites.length > 1 && (
          <div className="px-4 pb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg",
                    "border border-sidebar-border bg-sidebar px-3 py-2.5 text-sm",
                    "hover:bg-accent transition-colors"
                  )}
                  data-testid="button-site-selector"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{currentSite?.name || "Select Site"}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {availableSites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => selectSite(site)}
                    className={cn(
                      "cursor-pointer",
                      currentSite?.id === site.id && "bg-accent"
                    )}
                    data-testid={`menu-item-site-${site.id}`}
                  >
                    {site.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-4">
        {/* Quick Actions */}
        <div className="px-2 mb-4">
          <div className="flex items-center gap-1">
            <Link
              href="/modules/inventory"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Add
            </Link>
            <Link
              href="/modules/dashboards"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                "bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {sections.map(({ section, show }) =>
            show && (
              <SidebarGroup key={section.title} className="px-1">
                <SidebarGroupContent>
                  <NavSectionComponent
                    section={section}
                    pathname={pathname}
                    defaultOpen={section.defaultOpen}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            )
          )}

          {/* Engineering Dashboard - Special Entry */}
          {isEngineering && (
            <SidebarGroup className="px-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/engineering"}
                      className={cn(
                        "transition-all duration-200",
                        pathname === "/engineering" && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Link href="/engineering" data-testid="link-engineering" className="flex items-center gap-3">
                        <Wrench className={cn(
                          "h-4 w-4",
                          pathname === "/engineering" ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span>Engineering Hub</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Sales Pit Dashboard - Special Entry */}
          {isSales && (
            <SidebarGroup className="px-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/sales-pit"}
                      className={cn(
                        "transition-all duration-200",
                        pathname === "/sales-pit" && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Link href="/sales-pit" data-testid="link-sales-pit" className="flex items-center gap-3">
                        <Gauge className={cn(
                          "h-4 w-4",
                          pathname === "/sales-pit" ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span>Sales Pit</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Super Admin */}
          {isSuperAdmin && (
            <SidebarGroup className="px-1">
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2">
                    Platform Owner
                  </div>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith("/super-admin")}
                        className={cn(
                          "bg-gradient-to-r from-purple-500/10 to-indigo-500/10",
                          "hover:from-purple-500/20 hover:to-indigo-500/20",
                          "border border-purple-500/20"
                        )}
                      >
                        <Link href="/super-admin" data-testid="link-super-admin" className="flex items-center gap-3">
                          <Crown className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold text-purple-600 dark:text-purple-400">Super Admin</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-2",
                "hover:bg-accent transition-colors"
              )}
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user?.role}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
