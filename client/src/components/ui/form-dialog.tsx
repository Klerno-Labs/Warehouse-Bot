"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Reusable Form Dialog Component
 *
 * Eliminates duplicate dialog patterns across admin pages.
 * Handles open/close state, submit/cancel actions, and loading states.
 */

interface FormDialogProps {
  // Dialog state
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Header
  title: string;
  description?: string;

  // Form content
  children: React.ReactNode;

  // Actions
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;

  // States
  isSubmitting?: boolean;
  submitDisabled?: boolean;

  // Styling
  size?: "sm" | "default" | "lg" | "xl";
  showFooter?: boolean;
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  default: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  size = "default",
  showFooter = true,
}: FormDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} shadow-premium-lg`}>
        <DialogHeader>
          <DialogTitle className="text-balanced">{title}</DialogTitle>
          {description && <DialogDescription className="text-balanced">{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-4 scrollbar-premium max-h-[60vh] overflow-y-auto">{children}</div>

        {showFooter && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="hover-scale"
            >
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || submitDisabled}
                className="btn-premium btn-primary-glow"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create/Edit Dialog variant
 * Automatically adjusts title based on editing state
 */
interface CreateEditDialogProps<T> extends Omit<FormDialogProps, "title" | "submitLabel"> {
  entityName: string;
  editingItem: T | null;
  createLabel?: string;
  updateLabel?: string;
}

export function CreateEditDialog<T>({
  entityName,
  editingItem,
  createLabel,
  updateLabel,
  ...props
}: CreateEditDialogProps<T>) {
  const isEditing = editingItem !== null;

  return (
    <FormDialog
      {...props}
      title={isEditing ? `Edit ${entityName}` : `Create ${entityName}`}
      submitLabel={isEditing ? (updateLabel || `Update ${entityName}`) : (createLabel || `Create ${entityName}`)}
    />
  );
}

/**
 * Confirm Dialog for delete actions
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-premium-lg">
        <DialogHeader>
          <DialogTitle className="text-balanced">{title}</DialogTitle>
          <DialogDescription className="text-balanced">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="hover-scale"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === "destructive" ? "btn-premium shadow-destructive-glow" : "btn-premium btn-primary-glow"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete Confirm Dialog - preconfigured for delete operations
 */
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onDelete: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  itemName,
  onDelete,
  isDeleting = false,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Item"
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      onConfirm={onDelete}
      confirmLabel="Delete"
      isLoading={isDeleting}
      variant="destructive"
    />
  );
}
