/**
 * Centralized status color definitions for consistent styling across the app.
 * Use these constants to ensure status badges, indicators, and labels
 * display with consistent colors everywhere.
 */

export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral" | "purple";

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

// Base color classes for each variant
export const STATUS_VARIANTS: Record<StatusVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  error: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  neutral: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
};

// Order statuses (Purchase Orders, Sales Orders, Production Orders)
export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  // Draft/Initial states
  DRAFT: { label: "Draft", variant: "neutral", bgColor: STATUS_VARIANTS.neutral.bg, textColor: STATUS_VARIANTS.neutral.text },
  NEW: { label: "New", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },

  // Pending/Waiting states
  PENDING: { label: "Pending", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  AWAITING_APPROVAL: { label: "Awaiting Approval", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  ON_HOLD: { label: "On Hold", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },

  // Active/In Progress states
  APPROVED: { label: "Approved", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  CONFIRMED: { label: "Confirmed", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  ACTIVE: { label: "Active", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  IN_PROGRESS: { label: "In Progress", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  PROCESSING: { label: "Processing", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  PICKING: { label: "Picking", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  PACKING: { label: "Packing", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },

  // Shipping states
  SHIPPED: { label: "Shipped", variant: "purple", bgColor: STATUS_VARIANTS.purple.bg, textColor: STATUS_VARIANTS.purple.text },
  IN_TRANSIT: { label: "In Transit", variant: "purple", bgColor: STATUS_VARIANTS.purple.bg, textColor: STATUS_VARIANTS.purple.text },
  DELIVERED: { label: "Delivered", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },

  // Completion states
  COMPLETED: { label: "Completed", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  CLOSED: { label: "Closed", variant: "neutral", bgColor: STATUS_VARIANTS.neutral.bg, textColor: STATUS_VARIANTS.neutral.text },

  // Negative states
  CANCELLED: { label: "Cancelled", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
  REJECTED: { label: "Rejected", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
  FAILED: { label: "Failed", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },

  // Partial states
  PARTIAL: { label: "Partial", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  PARTIALLY_RECEIVED: { label: "Partially Received", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  PARTIALLY_SHIPPED: { label: "Partially Shipped", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
};

// Inventory event types
export const INVENTORY_EVENT_CONFIG: Record<string, StatusConfig> = {
  RECEIVE: { label: "Receive", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  ISSUE: { label: "Issue", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  MOVE: { label: "Move", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  ADJUST: { label: "Adjust", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  SCRAP: { label: "Scrap", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
  CYCLE_COUNT: { label: "Cycle Count", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  TRANSFER: { label: "Transfer", variant: "purple", bgColor: STATUS_VARIANTS.purple.bg, textColor: STATUS_VARIANTS.purple.text },
};

// Cycle count statuses
export const CYCLE_COUNT_STATUS_CONFIG: Record<string, StatusConfig> = {
  SCHEDULED: { label: "Scheduled", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  IN_PROGRESS: { label: "In Progress", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  PENDING_REVIEW: { label: "Pending Review", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  COMPLETED: { label: "Completed", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  CANCELLED: { label: "Cancelled", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
};

// Job statuses
export const JOB_STATUS_CONFIG: Record<string, StatusConfig> = {
  QUEUED: { label: "Queued", variant: "neutral", bgColor: STATUS_VARIANTS.neutral.bg, textColor: STATUS_VARIANTS.neutral.text },
  STARTED: { label: "Started", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  IN_PROGRESS: { label: "In Progress", variant: "info", bgColor: STATUS_VARIANTS.info.bg, textColor: STATUS_VARIANTS.info.text },
  PAUSED: { label: "Paused", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
  COMPLETED: { label: "Completed", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  BLOCKED: { label: "Blocked", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
};

// User statuses
export const USER_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Active", variant: "success", bgColor: STATUS_VARIANTS.success.bg, textColor: STATUS_VARIANTS.success.text },
  INACTIVE: { label: "Inactive", variant: "neutral", bgColor: STATUS_VARIANTS.neutral.bg, textColor: STATUS_VARIANTS.neutral.text },
  SUSPENDED: { label: "Suspended", variant: "error", bgColor: STATUS_VARIANTS.error.bg, textColor: STATUS_VARIANTS.error.text },
  PENDING: { label: "Pending", variant: "warning", bgColor: STATUS_VARIANTS.warning.bg, textColor: STATUS_VARIANTS.warning.text },
};

/**
 * Get status configuration for a given status string.
 * Falls back to neutral if status is not recognized.
 */
export function getStatusConfig(status: string, configMap: Record<string, StatusConfig> = ORDER_STATUS_CONFIG): StatusConfig {
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, "_");
  return configMap[normalizedStatus] || {
    label: status,
    variant: "neutral" as StatusVariant,
    bgColor: STATUS_VARIANTS.neutral.bg,
    textColor: STATUS_VARIANTS.neutral.text,
  };
}

/**
 * Get combined className for a status badge.
 */
export function getStatusClasses(status: string, configMap?: Record<string, StatusConfig>): string {
  const config = getStatusConfig(status, configMap);
  return `${config.bgColor} ${config.textColor}`;
}
