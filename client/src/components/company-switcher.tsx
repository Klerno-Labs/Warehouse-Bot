"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  role: string;
  isDefault: boolean;
  isActive: boolean;
  branding: {
    logo?: string;
    color?: string;
  };
}

export function CompanySwitcher() {
  const { user, refetch } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["/api/auth/switch-tenant"],
    enabled: !!user,
  });

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch tenant");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Refetch user data and invalidate all queries
      await refetch();
      queryClient.invalidateQueries();
      setOpen(false);

      // Reload the page to ensure all components use new tenant data
      window.location.reload();
    },
  });

  if (isLoading || !data?.tenants) {
    return null;
  }

  const tenants = data.tenants;
  const activeTenant = tenants.find((t) => t.isActive);

  // Only show switcher if user has access to multiple tenants
  if (tenants.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{activeTenant?.name || "Warehouse Core"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between h-auto py-2"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeTenant?.branding.logo ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={activeTenant.branding.logo} alt={activeTenant.name} />
                <AvatarFallback className="text-[10px]">
                  {activeTenant.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                className="h-6 w-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-white"
                style={{
                  backgroundColor: activeTenant?.branding.color || "#3b82f6",
                }}
              >
                {activeTenant?.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="text-sm font-medium truncate w-full">
                {activeTenant?.name || "Select Company"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activeTenant?.role}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onSelect={() => {
              if (!tenant.isActive) {
                switchTenantMutation.mutate(tenant.id);
              }
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              {tenant.branding.logo ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={tenant.branding.logo} alt={tenant.name} />
                  <AvatarFallback className="text-[10px]">
                    {tenant.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="h-8 w-8 rounded-sm flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    backgroundColor: tenant.branding.color || "#3b82f6",
                  }}
                >
                  {tenant.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{tenant.name}</span>
                <span className="text-[10px] text-muted-foreground">{tenant.role}</span>
              </div>
              {tenant.isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
