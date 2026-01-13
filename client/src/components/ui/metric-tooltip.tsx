"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricTooltipProps {
  title: string;
  description: string;
  formula?: string;
  goodRange?: string;
  learnMoreHref?: string;
}

export function MetricTooltip({
  title,
  description,
  formula,
  goodRange,
  learnMoreHref,
}: MetricTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="sr-only">Learn more about {title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4" sideOffset={5}>
          <div className="space-y-2">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            {formula && (
              <div className="rounded bg-muted p-2">
                <p className="text-xs font-mono">{formula}</p>
              </div>
            )}
            {goodRange && (
              <p className="text-xs">
                <span className="font-medium text-green-600">Good range:</span>{" "}
                {goodRange}
              </p>
            )}
            {learnMoreHref && (
              <a
                href={learnMoreHref}
                className="text-xs text-primary hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Pre-defined metric explanations
export const METRIC_TOOLTIPS = {
  inventoryHealth: {
    title: "Inventory Health Score",
    description:
      "A composite score measuring overall inventory performance based on stock-outs, overstock, aging, and turnover.",
    formula: "Score = 100 - (stock-outs × 5) - (overstock × 2) - (aging × 3)",
    goodRange: "85% or higher",
  },
  turnoverRate: {
    title: "Inventory Turnover Rate",
    description:
      "How many times inventory is sold or used during a period. Higher turnover means efficient inventory use.",
    formula: "Cost of Goods Sold ÷ Average Inventory",
    goodRange: "4-8x annually (varies by industry)",
  },
  abcAnalysis: {
    title: "ABC Analysis",
    description:
      "Classifies inventory by value contribution. Class A items represent ~80% of value with ~20% of SKUs.",
    formula:
      "A = Top 80% value, B = Next 15% value, C = Remaining 5% value",
    goodRange: "Focus on Class A items for maximum impact",
  },
  inventoryAging: {
    title: "Inventory Aging",
    description:
      "Shows how long inventory has been sitting. Older stock may indicate slow-moving or obsolete items.",
    goodRange: "Most stock should be under 60 days old",
  },
  daysOfInventory: {
    title: "Days of Inventory",
    description:
      "How many days current inventory will last at current usage rates.",
    formula: "Current Stock ÷ Average Daily Usage",
    goodRange: "15-45 days depending on lead times",
  },
  fillRate: {
    title: "Order Fill Rate",
    description:
      "Percentage of orders fulfilled completely from available stock.",
    formula: "(Orders Shipped Complete ÷ Total Orders) × 100",
    goodRange: "95% or higher",
  },
} as const;
