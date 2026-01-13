"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon, Package, Search, FileQuestion, AlertCircle } from "lucide-react"
import { Button } from "./button"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: LucideIcon
  /** Main heading text */
  title: string
  /** Description text */
  description?: string
  /** Action button text */
  actionLabel?: string
  /** Action button callback */
  onAction?: () => void
  /** Secondary action button text */
  secondaryActionLabel?: string
  /** Secondary action callback */
  onSecondaryAction?: () => void
  /** Variant to control default icon */
  variant?: "default" | "search" | "error" | "no-data"
}

const variantIcons: Record<string, LucideIcon> = {
  default: Package,
  search: Search,
  error: AlertCircle,
  "no-data": FileQuestion,
}

/**
 * Empty state component for displaying when there's no content to show.
 * Provides visual feedback with icon, text, and optional action buttons.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon,
      title,
      description,
      actionLabel,
      onAction,
      secondaryActionLabel,
      onSecondaryAction,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const Icon = icon || variantIcons[variant]

    return (
      <div
        ref={ref}
        role="status"
        aria-label={title}
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
        {...props}
      >
        <div
          className="mb-4 rounded-full bg-muted p-4"
          aria-hidden="true"
        >
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="mb-2 text-lg font-semibold">{title}</h3>

        {description && (
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex gap-3">
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                variant="outline"
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </Button>
            )}
            {actionLabel && onAction && (
              <Button onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

// Alias for backward compatibility
const CardEmptyState = EmptyState

export { EmptyState, CardEmptyState }
