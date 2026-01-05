import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Briefcase,
  ShoppingCart,
  RefreshCw,
  Wrench,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  ClipboardList,
  LogOut,
  ChevronDown,
  Factory,
  Smartphone,
  BarChart3,
  ScanLine,
  Database,
  Truck,
  ArrowDownToLine,
  FileText,
  Target,
  Boxes,
  CalendarClock,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import type { ModuleId } from "@shared/schema";

// Operations - Day-to-day tasks that floor workers and warehouse staff use frequently
const operationsItems = [
  { title: "Inventory", url: "/modules/inventory", icon: Package },
  { title: "Jobs", url: "/modules/jobs", icon: Briefcase },
  { title: "Cycle Counts", url: "/modules/cycle-counts", icon: RefreshCw },
  { title: "Job Scanner", url: "/mobile/job-scanner", icon: Smartphone },
];

// Purchasing - Supply chain and procurement
const purchasingItems = [
  { title: "Overview", url: "/purchasing", icon: ShoppingCart },
  { title: "Purchase Orders", url: "/purchasing/purchase-orders", icon: FileText },
  { title: "Receipts", url: "/purchasing/receipts", icon: ArrowDownToLine },
  { title: "Suppliers", url: "/purchasing/suppliers", icon: Truck },
];

// Sales - Customer orders and fulfillment
const salesItems = [
  { title: "Overview", url: "/sales", icon: ShoppingBag },
  { title: "Customers", url: "/sales/customers", icon: UserCircle },
  { title: "Sales Orders", url: "/sales/orders", icon: FileText },
  { title: "Shipments", url: "/sales/shipments", icon: Truck },
  { title: "Analytics", url: "/sales/analytics", icon: BarChart3 },
];

// Planning - Analytics, forecasting, and production planning
const planningItems = [
  { title: "Dashboard", url: "/modules/dashboards", icon: LayoutDashboard },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Production Board", url: "/manufacturing/production-board", icon: Factory },
  { title: "Analytics", url: "/manufacturing/analytics", icon: BarChart3 },
  { title: "Sales ATP", url: "/modules/inventory?view=atp", icon: Target },
  { title: "Component Tracking", url: "/manufacturing/component-tracking", icon: ScanLine },
];

// Admin - Settings and configuration
const adminItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Facilities", url: "/admin/facilities", icon: Building2 },
  { title: "Items", url: "/items", icon: Boxes },
  { title: "DBA Import", url: "/admin/dba-import", icon: Database },
  { title: "Audit Log", url: "/admin/audit", icon: ClipboardList },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

interface AppSidebarProps {
  enabledModules: string[];
}

export function AppSidebar({ enabledModules }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, currentSite, availableSites, selectSite, logout } = useAuth();

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "??";

  const isAdmin = user?.role === "Admin" || user?.role === "Supervisor";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Warehouse Core</span>
              <span className="text-xs text-muted-foreground">{user?.tenantName}</span>
            </div>
          </div>
        </div>
        
        {availableSites.length > 1 && (
          <div className="px-3 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex w-full items-center justify-between rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-sm hover-elevate"
                  data-testid="button-site-selector"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{currentSite?.name || "Select Site"}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {availableSites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => selectSite(site)}
                    className={currentSite?.id === site.id ? "bg-accent" : ""}
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

      <SidebarContent>
        {/* Operations - Most frequently used by floor workers */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-ops-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        
        {/* Purchasing - Supply chain and procurement */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Purchasing
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {purchasingItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/purchasing" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-purchasing-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Sales - Customer orders and fulfillment */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sales
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/sales" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-sales-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        
        {/* Planning - Analytics and production planning */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Planning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planningItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url.split("?")[0] + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-planning-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Administration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover-elevate"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col items-start text-left">
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {user?.role}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
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
                className="text-destructive focus:text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
