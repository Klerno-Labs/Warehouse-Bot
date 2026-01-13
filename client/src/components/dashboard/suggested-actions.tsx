"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  ShoppingCart,
  Clock,
  PlayCircle,
  Truck,
  Package,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Archive,
  Star,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Zap,
} from "lucide-react";

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'inventory' | 'purchasing' | 'production' | 'sales' | 'quality' | 'setup';
  href: string;
  icon: string;
  estimatedTime?: string;
  impact?: string;
  data?: any;
}

const ICON_MAP: Record<string, any> = {
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'shopping-cart': ShoppingCart,
  'clock': Clock,
  'play-circle': PlayCircle,
  'truck': Truck,
  'package': Package,
  'clipboard-check': ClipboardCheck,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'archive': Archive,
  'star': Star,
  'trending-up': TrendingUp,
};

export function SuggestedActions() {
  const { data, isLoading, error } = useQuery<{
    suggestions: SuggestedAction[];
    timestamp: string;
  }>({
    queryKey: ["/api/dashboard/suggested-actions"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/suggested-actions");
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (error) {
    return null; // Gracefully hide on error
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">What Should I Do Next?</CardTitle>
          </div>
          <CardDescription>AI-powered suggestions based on system state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const suggestions = data?.suggestions || [];

  if (suggestions.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">All Caught Up!</CardTitle>
          </div>
          <CardDescription>No urgent actions needed right now</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your operations are running smoothly. Check back later for new recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show top 3 suggestions prominently
  const topSuggestions = suggestions.slice(0, 3);
  const moreSuggestions = suggestions.slice(3);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">What Should I Do Next?</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Suggestions
          </Badge>
        </div>
        <CardDescription>Intelligent recommendations based on your current operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top Priority Actions */}
        {topSuggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} prominent />
        ))}

        {/* Additional Suggestions - Collapsed */}
        {moreSuggestions.length > 0 && (
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer rounded-lg border border-dashed p-3 hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                <span className="text-sm font-medium">
                  {moreSuggestions.length} more suggestion{moreSuggestions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Lower priority
              </Badge>
            </summary>
            <div className="mt-3 space-y-3">
              {moreSuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion, prominent = false }: { suggestion: SuggestedAction; prominent?: boolean }) {
  const Icon = ICON_MAP[suggestion.icon] || AlertCircle;

  const priorityConfig = {
    critical: {
      badge: 'destructive' as const,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    high: {
      badge: 'default' as const,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    medium: {
      badge: 'secondary' as const,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    low: {
      badge: 'outline' as const,
      bgColor: 'bg-muted/30',
      borderColor: 'border-muted',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
  };

  const config = priorityConfig[suggestion.priority];

  return (
    <Link href={suggestion.href}>
      <div
        className={`group cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md hover:border-primary/50 ${
          prominent ? config.bgColor + ' ' + config.borderColor : 'border-border hover:bg-accent'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                {suggestion.title}
              </h4>
              {prominent && (
                <Badge variant={config.badge} className="text-[10px] h-5 px-1.5">
                  {suggestion.priority}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            <p className="text-xs text-muted-foreground italic mt-1">
              💡 {suggestion.reason}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {suggestion.estimatedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {suggestion.estimatedTime}
                </div>
              )}
              {suggestion.impact && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {suggestion.impact}
                </div>
              )}
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                {suggestion.category}
              </Badge>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
