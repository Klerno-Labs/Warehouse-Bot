"use client";

import { usePathname } from "next/navigation";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { getHelpContent } from "@/lib/help-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: React.ReactNode;
  helpKey?: string; // Override help content key
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  badge,
  actions,
  helpKey,
}: PageHeaderProps) {
  const pathname = usePathname();

  // Get contextual help based on current page or override key
  const helpContent = helpKey
    ? getHelpContent(helpKey)
    : getHelpContent(pathname);

  return (
    <div className="flex flex-col gap-4 pb-6 border-b">
      {/* Back navigation */}
      {backHref && (
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {badge && (
              <Badge variant={badge.variant || "secondary"}>
                {badge.label}
              </Badge>
            )}
            {helpContent && <ContextualHelp {...helpContent} />}
          </div>
          {description && (
            <p className="text-muted-foreground max-w-3xl">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// Compact header for modals and dialogs
export function CompactPageHeader({
  title,
  description,
  helpKey,
}: {
  title: string;
  description?: string;
  helpKey?: string;
}) {
  const helpContent = helpKey ? getHelpContent(helpKey) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {helpContent && <ContextualHelp {...helpContent} />}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
