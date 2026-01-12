"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Reusable Dashboard Metric Card Component
 *
 * Eliminates duplicate metric display patterns across dashboard pages.
 * Supports loading states, trends, icons, and various sizes.
 */

interface MetricCardProps {
  // Content
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;

  // Trend
  trend?: {
    value: number;
    label?: string;
    isPositiveGood?: boolean; // Default true - positive trend is green
  };

  // Styling
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  size?: "sm" | "default" | "lg";
  className?: string;

  // States
  isLoading?: boolean;

  // Animation
  animate?: boolean;
  delay?: number;
}

const variantStyles = {
  default: {
    icon: "text-muted-foreground bg-muted",
    value: "text-foreground",
  },
  primary: {
    icon: "text-primary bg-primary/10",
    value: "text-primary",
  },
  success: {
    icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    value: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400 bg-red-500/10",
    value: "text-red-600 dark:text-red-400",
  },
};

const sizeStyles = {
  sm: {
    card: "p-4",
    title: "text-xs",
    value: "text-xl",
    icon: "h-4 w-4",
    iconContainer: "p-2",
  },
  default: {
    card: "p-6",
    title: "text-sm",
    value: "text-2xl",
    icon: "h-5 w-5",
    iconContainer: "p-2.5",
  },
  lg: {
    card: "p-8",
    title: "text-base",
    value: "text-3xl",
    icon: "h-6 w-6",
    iconContainer: "p-3",
  },
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  size = "default",
  className,
  isLoading = false,
  animate = true,
  delay = 0,
}: MetricCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  if (isLoading) {
    return (
      <Card className={cn(sizes.card, className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          {Icon && <Skeleton className="h-10 w-10 rounded-lg" />}
        </div>
      </Card>
    );
  }

  const content = (
    <Card className={cn(
      sizes.card,
      "card-premium shadow-premium transition-all",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className={cn("font-medium text-muted-foreground", sizes.title)}>
            {title}
          </p>
          <p className={cn("font-bold tracking-tight tabular-nums", sizes.value, styles.value)}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {(description || trend) && (
            <div className="flex items-center gap-2">
              {trend && <TrendBadge trend={trend} />}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-lg", sizes.iconContainer, styles.icon)}>
            <Icon className={sizes.icon} />
          </div>
        )}
      </div>
    </Card>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay * 0.1 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Trend Badge Component
 */
function TrendBadge({
  trend,
}: {
  trend: { value: number; label?: string; isPositiveGood?: boolean };
}) {
  const isPositive = trend.value > 0;
  const isNeutral = trend.value === 0;
  const isPositiveGood = trend.isPositiveGood ?? true;

  // Determine color: if positive is good, positive=green, negative=red
  // If positive is bad (like errors), positive=red, negative=green
  const isGood = isPositiveGood ? isPositive : !isPositive;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isNeutral
          ? "text-muted-foreground"
          : isGood
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(trend.value)}%{trend.label && ` ${trend.label}`}
    </span>
  );
}

/**
 * Metric Grid - responsive grid for metric cards
 */
interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({
  children,
  columns = 4,
  className,
}: MetricGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

/**
 * Metric Card Loading Grid
 */
interface MetricGridLoadingProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

export function MetricGridLoading({
  count = 4,
  columns = 4,
}: MetricGridLoadingProps) {
  return (
    <MetricGrid columns={columns}>
      {Array.from({ length: count }).map((_, i) => (
        <MetricCard
          key={i}
          title=""
          value=""
          isLoading
        />
      ))}
    </MetricGrid>
  );
}

/**
 * Stat Card - Simpler variant without card wrapper
 */
interface StatProps {
  label: string;
  value: string | number;
  trend?: number;
  className?: string;
}

export function Stat({ label, value, trend, className }: StatProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {trend !== undefined && (
        <TrendBadge trend={{ value: trend }} />
      )}
    </div>
  );
}
