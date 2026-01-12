"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageLoading, InlineLoading } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ErrorAlert";

interface AdminFormLayoutProps {
  // Header
  title: string;
  description?: string;
  icon?: LucideIcon;

  // Actions
  onAdd?: () => void;
  addLabel?: string;
  addIcon?: LucideIcon;
  extraActions?: ReactNode;

  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Content states
  isLoading?: boolean;
  loadingMessage?: string;
  error?: Error | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;

  // Content
  children: ReactNode;
}

/**
 * Consistent layout for admin management pages (users, departments, badges, etc.)
 * Provides a standard header with search, add button, and handles loading/empty states.
 */
export function AdminFormLayout({
  title,
  description,
  icon: Icon,
  onAdd,
  addLabel = "Add New",
  addIcon: AddIcon = Plus,
  extraActions,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  isLoading = false,
  loadingMessage,
  error = null,
  isEmpty = false,
  emptyTitle = "No items found",
  emptyDescription = "Get started by creating your first item.",
  emptyIcon,
  children,
}: AdminFormLayoutProps) {
  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          icon={Icon}
        />
        <ErrorAlert
          title="Failed to load data"
          message={error.message}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          icon={Icon}
        />
        <PageLoading message={loadingMessage || `Loading ${title.toLowerCase()}...`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={title}
          description={description}
          icon={Icon}
        />
        <div className="flex items-center gap-2">
          {extraActions}
          {onAdd && (
            <Button onClick={onAdd}>
              <AddIcon className="h-4 w-4 mr-2" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && onSearchChange && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Content */}
      {isEmpty ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              actions={onAdd ? [{ label: addLabel, onClick: onAdd, icon: AddIcon }] : []}
            />
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}

function PageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

/**
 * Admin table card wrapper with consistent styling
 */
interface AdminTableCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function AdminTableCard({
  title,
  description,
  children,
  actions,
}: AdminTableCardProps) {
  return (
    <Card>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Admin form dialog content wrapper
 */
interface AdminFormDialogProps {
  children: ReactNode;
  isSubmitting?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function AdminFormDialog({
  children,
  isSubmitting = false,
  onSubmit,
  submitLabel = "Save",
  onCancel,
  cancelLabel = "Cancel",
}: AdminFormDialogProps) {
  return (
    <div className="space-y-4">
      {children}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        )}
        {onSubmit && (
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
