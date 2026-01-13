"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { HelpCircle, Lightbulb, Keyboard, ExternalLink } from "lucide-react";

/**
 * Stripe-style Contextual Feature Tooltips
 *
 * Features:
 * - Rich content with icons, shortcuts, and links
 * - Animated entrance/exit
 * - Multiple variants (info, tip, shortcut)
 * - Learn more links
 * - Keyboard shortcut display
 */

interface FeatureTooltipProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  shortcut?: string;
  learnMoreUrl?: string;
  variant?: "info" | "tip" | "shortcut" | "new";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
}

export function FeatureTooltip({
  children,
  title,
  description,
  shortcut,
  learnMoreUrl,
  variant = "info",
  side = "top",
  align = "center",
  delayDuration = 300,
}: FeatureTooltipProps) {
  const [open, setOpen] = React.useState(false);

  const variantStyles = {
    info: {
      icon: HelpCircle,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    tip: {
      icon: Lightbulb,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    shortcut: {
      icon: Keyboard,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    new: {
      icon: () => (
        <span className="text-xs font-bold text-emerald-500">NEW</span>
      ),
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  };

  const { icon: Icon, iconColor, bgColor } = variantStyles[variant];

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <AnimatePresence>
          {open && (
            <TooltipPrimitive.Portal forceMount>
              <TooltipPrimitive.Content
                side={side}
                align={align}
                sideOffset={8}
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: side === "top" ? 4 : -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: side === "top" ? 4 : -4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "z-50 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700",
                    "bg-white dark:bg-zinc-900",
                    "shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50",
                    "p-4"
                  )}
                >
                  {/* Header with icon */}
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", bgColor)}>
                      <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {title}
                      </h4>
                      {description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Keyboard shortcut */}
                  {shortcut && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Keyboard shortcut</span>
                        <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                          {shortcut}
                        </kbd>
                      </div>
                    </div>
                  )}

                  {/* Learn more link */}
                  {learnMoreUrl && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <a
                        href={learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Learn more
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Arrow */}
                  <TooltipPrimitive.Arrow
                    className="fill-white dark:fill-zinc-900"
                    width={12}
                    height={6}
                  />
                </motion.div>
              </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
          )}
        </AnimatePresence>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * Simple inline help icon with tooltip
 */
export function HelpTooltip({
  title,
  description,
  ...props
}: Omit<FeatureTooltipProps, "children">) {
  return (
    <FeatureTooltip title={title} description={description} {...props}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        <HelpCircle className="h-3 w-3 text-zinc-500" />
      </button>
    </FeatureTooltip>
  );
}

/**
 * Feature spotlight - highlights new features with a pulsing indicator
 */
export function FeatureSpotlight({
  children,
  title,
  description,
  isNew = true,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
}) {
  if (!isNew) return <>{children}</>;

  return (
    <FeatureTooltip title={title} description={description} variant="new">
      <div className="relative inline-flex">
        {children}
        {/* Pulsing indicator */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      </div>
    </FeatureTooltip>
  );
}

/**
 * Predefined feature tooltips for common elements
 */
export const FEATURE_TOOLTIPS = {
  healthScore: {
    title: "Inventory Health Score",
    description: "A composite score based on stock levels, turnover rate, and accuracy. Aim for 90%+ for optimal operations.",
    learnMoreUrl: "/help#health-score",
  },
  turnoverRate: {
    title: "Turnover Rate",
    description: "How many times your inventory is sold and replaced over a period. Higher is generally better.",
    shortcut: "T",
  },
  quickReceive: {
    title: "Quick Receive",
    description: "Instantly receive inventory without creating a full purchase order. Perfect for walk-in deliveries.",
    shortcut: "⌘R",
  },
  cycleCount: {
    title: "Cycle Count",
    description: "Verify inventory accuracy by counting a subset of items. More efficient than full physical inventories.",
    shortcut: "⌘C",
  },
  abcAnalysis: {
    title: "ABC Classification",
    description: "Items are classified by value: A (top 20% by value), B (next 30%), C (remaining 50%). Focus on A items.",
  },
  lowStockAlert: {
    title: "Low Stock Alert",
    description: "Items at or below their reorder point. Consider creating purchase orders for these items.",
  },
  deadStock: {
    title: "Dead Stock",
    description: "Items with no movement in 90+ days. Consider discounting or removing to free up space and capital.",
  },
} as const;
