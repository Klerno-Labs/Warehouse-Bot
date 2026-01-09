"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface InteractiveTourProps {
  steps: TourStep[];
  tourId: string; // Unique ID to track if user has seen this tour
  onComplete?: () => void;
  onSkip?: () => void;
}

export function InteractiveTour({
  steps,
  tourId,
  onComplete,
  onSkip,
}: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has already seen this tour
    const hasSeenTour = localStorage.getItem(`tour_completed_${tourId}`);
    if (!hasSeenTour) {
      // Wait a bit for the page to render
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [tourId]);

  useEffect(() => {
    if (!isVisible) return;

    const step = steps[currentStep];
    if (!step) return;

    // Find the target element
    const element = document.querySelector(step.target) as HTMLElement;
    if (!element) {
      console.warn(`Tour target not found: ${step.target}`);
      return;
    }

    setTargetElement(element);

    // Scroll element into view
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Calculate position
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      const cardRect = cardRef.current?.getBoundingClientRect();
      const cardWidth = cardRect?.width || 320;
      const cardHeight = cardRect?.height || 200;
      const padding = 16;

      let top = 0;
      let left = 0;

      switch (step.placement || "bottom") {
        case "top":
          top = rect.top - cardHeight - padding;
          left = rect.left + rect.width / 2 - cardWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - cardWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - cardHeight / 2;
          left = rect.left - cardWidth - padding;
          break;
        case "right":
          top = rect.top + rect.height / 2 - cardHeight / 2;
          left = rect.right + padding;
          break;
      }

      // Keep within viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - cardHeight - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

      setPosition({ top, left });
    };

    updatePosition();

    // Update position on resize/scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    const step = steps[currentStep];

    // Execute step action if provided
    if (step.action) {
      step.action.onClick();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(`tour_completed_${tourId}`, "skipped");
    onSkip?.();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(`tour_completed_${tourId}`, "completed");
    onComplete?.();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return createPortal(
    <>
      {/* Overlay with spotlight */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <div className="absolute inset-0 bg-black/60" />
        {targetElement && (
          <div
            className="absolute border-4 border-primary rounded-lg animate-pulse"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            }}
          />
        )}
      </div>

      {/* Tour Card */}
      <Card
        ref={cardRef}
        className="fixed z-[9999] w-80 shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{step.title}</h3>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                Step {currentStep + 1} of {steps.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">{step.description}</p>

          {/* Progress */}
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-8 text-muted-foreground"
              >
                Skip Tour
              </Button>
              <Button size="sm" onClick={handleNext} className="h-8">
                {currentStep === steps.length - 1 ? (
                  "Finish"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>,
    document.body
  );
}

// Hook to manage tour visibility
export function useTour(tourId: string) {
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(`tour_completed_${tourId}`);
    setHasCompletedTour(!!completed);
  }, [tourId]);

  const resetTour = () => {
    localStorage.removeItem(`tour_completed_${tourId}`);
    setHasCompletedTour(false);
  };

  return {
    shouldShowTour: !hasCompletedTour,
    resetTour,
  };
}
