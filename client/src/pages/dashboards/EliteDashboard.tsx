"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  TrendingUp,
  AlertTriangle,
  Zap,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
  BarChart3,
  ArrowRight,
  Search,
  Command,
  Plus,
  ScanLine,
  Truck,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Elite Dashboard - Top 0.01% Design
 *
 * Design principles applied:
 * 1. Bento grid layout (like Apple/Linear)
 * 2. Glassmorphism with subtle depth
 * 3. Micro-interactions on every element
 * 4. Progressive disclosure
 * 5. AI-powered insights prominently displayed
 * 6. Command palette integration
 * 7. Contextual quick actions
 * 8. Real-time indicators
 */

// Animated number component for smooth transitions
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="tabular-nums"
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.span>
  );
}

// Trend indicator with animation
function TrendBadge({ value, positive }: { value: number; positive?: boolean }) {
  const isPositive = positive ?? value >= 0;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
        isPositive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(value)}%
    </motion.div>
  );
}

// Glassmorphic card component
function GlassCard({
  children,
  className,
  hover = true,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-white/50 dark:bg-zinc-900/50",
        "backdrop-blur-xl",
        "border border-zinc-200/50 dark:border-zinc-800/50",
        "shadow-sm shadow-zinc-200/50 dark:shadow-zinc-900/50",
        hover && "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-zinc-200/30 dark:hover:shadow-zinc-900/30",
        className
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />
      <div className="relative">{children}</div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Pulse indicator for live data
function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
        Live
      </span>
    </div>
  );
}

// Quick action button with icon
function QuickAction({
  icon: Icon,
  label,
  shortcut,
  href,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  href: string;
  variant?: "default" | "primary" | "success" | "warning";
}) {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700",
    primary: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    success: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400",
  };

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group",
          variants[variant]
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg",
          variant === "default" ? "bg-zinc-200 dark:bg-zinc-700" : "bg-current/10"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">{label}</span>
        </div>
        {shortcut && (
          <kbd className="hidden sm:flex h-5 items-center gap-1 rounded border bg-zinc-100 dark:bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-500">
            {shortcut}
          </kbd>
        )}
        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
      </motion.div>
    </Link>
  );
}

// AI Insight card with animated gradient border
function AIInsightCard({ insight }: { insight: { title: string; description: string; action: string; href: string; priority: "high" | "medium" | "low" } }) {
  const priorityColors = {
    high: "from-red-500 via-orange-500 to-amber-500",
    medium: "from-blue-500 via-purple-500 to-pink-500",
    low: "from-emerald-500 via-teal-500 to-cyan-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      {/* Animated gradient border */}
      <div className={cn(
        "absolute -inset-0.5 rounded-2xl bg-gradient-to-r opacity-75 blur-sm transition-opacity group-hover:opacity-100",
        priorityColors[insight.priority]
      )} />

      <div className="relative rounded-2xl bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br",
            priorityColors[insight.priority]
          )}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {insight.title}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
              {insight.description}
            </p>
          </div>
        </div>
        <Link
          href={insight.href}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {insight.action}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}

// Main Dashboard Component
export default function EliteDashboard() {
  const { user, currentSite } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);

  // Sample data - in production, this would come from API
  const stats = {
    stockValue: 2847500,
    stockValueChange: 12.4,
    healthScore: 94,
    healthChange: 2.1,
    activeJobs: 23,
    jobsChange: -8,
    alerts: 3,
  };

  const insights = [
    {
      title: "Reorder 8 items now",
      description: "Critical stock levels detected. Auto-generate PO for fastest suppliers.",
      action: "Generate Purchase Order",
      href: "/purchasing/purchase-orders/new",
      priority: "high" as const,
    },
    {
      title: "Job #2847 delayed",
      description: "Missing components from Supplier ABC. ETA slip by 2 days.",
      action: "View alternatives",
      href: "/manufacturing/production-orders",
      priority: "medium" as const,
    },
  ];

  const recentActivity = [
    { action: "Received", item: "Steel Plate 4x8", qty: "500 EA", time: "2m ago", type: "success" },
    { action: "Moved", item: "Aluminum Bar Stock", qty: "200 FT", time: "15m ago", type: "info" },
    { action: "Adjusted", item: "Fastener Kit A", qty: "-12 EA", time: "1h ago", type: "warning" },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen">
      {/* Command Palette Hint */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 right-4 z-50"
      >
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header with greeting and live status */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {greeting()}, {user?.firstName}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
              <span>{currentSite?.name || "All Sites"}</span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <LiveIndicator />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Quick Action
            </motion.button>
          </div>
        </motion.header>

        {/* AI Insights Banner - Most prominent */}
        {insights.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                AI Insights
              </h2>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-medium">
                {insights.length} new
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((insight, i) => (
                <AIInsightCard key={i} insight={insight} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Bento Grid - Key Metrics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Stock Value - Large card */}
          <GlassCard className="sm:col-span-2 p-6" href="/modules/inventory">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Stock Value
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  <AnimatedNumber value={stats.stockValue} prefix="$" />
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <TrendBadge value={stats.stockValueChange} />
                  <span className="text-xs text-zinc-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            {/* Mini chart placeholder */}
            <div className="mt-4 h-16 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-end px-2">
              {[40, 65, 45, 70, 55, 80, 75, 90, 85, 95].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex-1 mx-0.5 rounded-t bg-gradient-to-t from-blue-500/40 to-blue-500/20"
                />
              ))}
            </div>
          </GlassCard>

          {/* Health Score */}
          <GlassCard className="p-6" href="/manufacturing/analytics">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Health Score
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  <AnimatedNumber value={stats.healthScore} suffix="%" />
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <TrendBadge value={stats.healthChange} />
            </div>
            {/* Circular progress */}
            <div className="mt-4 flex justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40" cy="40" r="35"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                  strokeWidth="6" fill="none"
                />
                <motion.circle
                  cx="40" cy="40" r="35"
                  className="stroke-emerald-500"
                  strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 220" }}
                  animate={{ strokeDasharray: `${stats.healthScore * 2.2} 220` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
            </div>
          </GlassCard>

          {/* Alerts */}
          <GlassCard className="p-6" href="/modules/inventory?filter=alerts">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Needs Attention
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  <AnimatedNumber value={stats.alerts} />
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-xl",
                stats.alerts > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  stats.alerts > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                )} />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {stats.alerts > 0 ? "2 low stock, 1 overdue" : "All systems nominal"}
            </p>
            {/* Alert pills */}
            <div className="mt-4 flex flex-wrap gap-1">
              {["Low Stock", "Overdue", "Variance"].slice(0, stats.alerts).map((alert, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {alert}
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.section>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Quick Actions - Left Column */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Quick Actions
              </h2>
            </div>
            <GlassCard className="p-2" hover={false}>
              <div className="space-y-1">
                <QuickAction
                  icon={Package}
                  label="Receive Inventory"
                  shortcut="R"
                  href="/purchasing/receipts/new"
                  variant="success"
                />
                <QuickAction
                  icon={ScanLine}
                  label="Scan Job"
                  shortcut="J"
                  href="/mobile/job-scanner"
                  variant="primary"
                />
                <QuickAction
                  icon={RefreshCw}
                  label="Cycle Count"
                  shortcut="C"
                  href="/modules/cycle-counts"
                />
                <QuickAction
                  icon={Truck}
                  label="Create PO"
                  shortcut="P"
                  href="/purchasing/purchase-orders/new"
                />
              </div>
            </GlassCard>

            {/* Active Jobs Mini-card */}
            <GlassCard className="p-5" href="/modules/jobs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Active Jobs
                    </p>
                    <p className="text-xs text-zinc-500">12 in progress</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stats.activeJobs}
                  </p>
                  <TrendBadge value={stats.jobsChange} />
                </div>
              </div>
            </GlassCard>
          </motion.section>

          {/* Recent Activity - Right Column */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Recent Activity
                </h2>
              </div>
              <Link
                href="/modules/inventory?view=events"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <GlassCard className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50" hover={false}>
              {recentActivity.map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    activity.type === "success" && "bg-emerald-500/10",
                    activity.type === "info" && "bg-blue-500/10",
                    activity.type === "warning" && "bg-amber-500/10"
                  )}>
                    {activity.type === "success" && <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    {activity.type === "info" && <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    {activity.type === "warning" && <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        activity.type === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        activity.type === "info" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        activity.type === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {activity.action}
                      </span>
                      <span className="text-xs text-zinc-400">{activity.time}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                      {activity.item}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {activity.qty}
                    </p>
                  </div>
                </motion.div>
              ))}
            </GlassCard>
          </motion.section>
        </div>

        {/* Full-width Analytics Preview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6" href="/manufacturing/analytics">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Inventory Snapshot
                </h2>
              </div>
              <Link
                href="/manufacturing/analytics"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Full Analytics
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* ABC Distribution */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">ABC Classification</p>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "20%" }}
                    className="bg-emerald-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "30%" }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "50%" }}
                    transition={{ delay: 0.2 }}
                    className="bg-zinc-300 dark:bg-zinc-600"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                  <span>A: 20%</span>
                  <span>B: 30%</span>
                  <span>C: 50%</span>
                </div>
              </div>

              {/* Stock Aging */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Stock Aging</p>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    className="bg-emerald-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "25%" }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "15%" }}
                    transition={{ delay: 0.2 }}
                    className="bg-red-500"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                  <span className="text-emerald-600">Fresh</span>
                  <span className="text-red-600">15% aged</span>
                </div>
              </div>

              {/* Top Value */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Top Value Item</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  $284,500
                </p>
                <p className="text-xs text-zinc-500 truncate">Steel Plate 4x8 Premium</p>
              </div>
            </div>
          </GlassCard>
        </motion.section>
      </div>
    </div>
  );
}
