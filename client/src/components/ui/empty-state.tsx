"use client";

import { LucideIcon, Package, Plus, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  actions = [],
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-6" : "py-12"
      } ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-muted ${
          compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4"
        }`}
      >
        <Icon
          className={`text-muted-foreground ${compact ? "h-5 w-5" : "h-7 w-7"}`}
        />
      </div>
      <h3
        className={`font-semibold text-foreground ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {title}
      </h3>
      <p
        className={`text-muted-foreground max-w-sm mx-auto ${
          compact ? "text-xs mt-1" : "text-sm mt-2"
        }`}
      >
        {description}
      </p>
      {actions.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-center gap-2 ${
            compact ? "mt-3" : "mt-4"
          }`}
        >
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const buttonContent = (
              <>
                {ActionIcon && <ActionIcon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </>
            );

            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={action.variant || (index === 0 ? "default" : "outline")}
                  size={compact ? "sm" : "default"}
                  asChild
                  className={index === 0 ? "btn-premium hover-glow" : "hover-scale"}
                >
                  <Link href={action.href}>{buttonContent}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={index}
                variant={action.variant || (index === 0 ? "default" : "outline")}
                size={compact ? "sm" : "default"}
                onClick={action.onClick}
                className={index === 0 ? "btn-premium hover-glow" : "hover-scale"}
              >
                {buttonContent}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Pre-defined empty states for common scenarios
export const EMPTY_STATES = {
  // Inventory
  noItems: {
    title: "No items yet",
    description: "Add your first item to start tracking inventory.",
    actions: [
      { label: "Add Item", href: "/items/new", icon: Plus },
      { label: "Import Items", href: "/admin/dba-import", icon: Upload },
    ],
  },
  noTransactions: {
    title: "No transactions yet",
    description: "Receive your first shipment to see activity here.",
    actions: [
      { label: "Receive Inventory", href: "/modules/inventory?action=receive", icon: ArrowRight },
    ],
  },
  noLocations: {
    title: "No locations configured",
    description: "Set up warehouse locations to organize inventory.",
    actions: [
      { label: "Add Locations", href: "/admin/facilities", icon: Plus },
    ],
  },

  // Jobs/Production
  noJobs: {
    title: "No active jobs",
    description: "Create a production job to start tracking work.",
    actions: [
      { label: "Create Job", href: "/modules/jobs/new", icon: Plus },
    ],
  },
  noProductionOrders: {
    title: "No production orders",
    description: "Create a production order to start manufacturing.",
    actions: [
      { label: "Create Order", icon: Plus },
    ],
  },
  noBOMs: {
    title: "No bills of materials",
    description: "Create a BOM to define product structure.",
    actions: [
      { label: "Create BOM", icon: Plus },
    ],
  },

  // Sales
  noOrders: {
    title: "No orders found",
    description: "Create your first order to get started.",
    actions: [
      { label: "Create Order", icon: Plus },
    ],
  },
  noCustomers: {
    title: "No customers yet",
    description: "Add your first customer to start selling.",
    actions: [
      { label: "Add Customer", icon: Plus },
    ],
  },
  noShipments: {
    title: "No shipments yet",
    description: "Ship orders to see shipments here.",
    actions: [],
  },

  // Purchasing
  noPurchaseOrders: {
    title: "No purchase orders",
    description: "Create a purchase order to start procuring inventory.",
    actions: [
      { label: "Create PO", href: "/purchasing/purchase-orders/new", icon: Plus },
    ],
  },
  noReceipts: {
    title: "No receipts yet",
    description: "Receive items from purchase orders to create receipts.",
    actions: [],
  },
  noSuppliers: {
    title: "No suppliers yet",
    description: "Add suppliers to start ordering inventory.",
    actions: [
      { label: "Add Supplier", icon: Plus },
    ],
  },

  // Admin
  noUsers: {
    title: "No users found",
    description: "Invite team members to collaborate.",
    actions: [
      { label: "Invite User", icon: Plus },
    ],
  },
  noDepartments: {
    title: "No departments yet",
    description: "Create departments to organize your team.",
    actions: [
      { label: "Create Department", icon: Plus },
    ],
  },
  noBadges: {
    title: "No badges created",
    description: "Create badges to enable mobile access for operators.",
    actions: [
      { label: "Create Badge", icon: Plus },
    ],
  },

  // Generic
  noAlerts: {
    title: "All clear!",
    description: "No issues require your attention right now.",
    actions: [],
  },
  noData: {
    title: "No data available",
    description: "There's nothing to show here yet.",
    actions: [],
  },
  noResults: {
    title: "No results found",
    description: "Try adjusting your search or filters.",
    actions: [],
  },
  noActivity: {
    title: "No recent activity",
    description: "Activity will appear here once actions are taken.",
    actions: [],
  },
  comingSoon: {
    title: "Coming soon",
    description: "This feature is under development.",
    actions: [],
  },
} as const;

// Card-specific empty state with inline styling
export function CardEmptyState({
  message,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon = ArrowRight,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionHref && (
        <Button variant="ghost" size="sm" asChild className="mt-2 text-primary hover:text-primary/80">
          <Link href={actionHref}>
            {actionLabel}
            <ActionIcon className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
