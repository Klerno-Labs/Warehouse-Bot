"use client";

import { useState, useEffect } from "react";
import { Check, ChevronRight, X, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  required: boolean;
}

interface SetupChecklistProps {
  steps: SetupStep[];
  onDismiss?: () => void;
  className?: string;
}

export function SetupChecklist({ steps, onDismiss, className }: SetupChecklistProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const totalRequired = steps.filter((s) => s.required).length;
  const requiredCompleted = steps.filter((s) => s.required && s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allRequiredComplete = requiredCompleted >= totalRequired;

  // Don't show if all steps are complete
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Get Started</CardTitle>
              <p className="text-xs text-muted-foreground">
                Complete these steps to set up your warehouse
              </p>
            </div>
          </div>
          {onDismiss && allRequiredComplete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {steps.length} complete
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                step.completed
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step.completed
                    ? "bg-green-600 text-white"
                    : "border-2 border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {step.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? "text-green-700 dark:text-green-300" : ""
                  }`}
                >
                  {step.title}
                  {step.required && !step.completed && (
                    <span className="ml-1.5 text-xs text-destructive">*Required</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Link>
          ))}
        </div>

        {!allRequiredComplete && (
          <p className="text-xs text-muted-foreground text-center">
            Complete required steps to unlock all features
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to manage setup checklist state
export function useSetupChecklist() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("setup-checklist-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("setup-checklist-dismissed", "true");
    setIsDismissed(true);
  };

  const reset = () => {
    localStorage.removeItem("setup-checklist-dismissed");
    setIsDismissed(false);
  };

  return { isDismissed, dismiss, reset };
}
