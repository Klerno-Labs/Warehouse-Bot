"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "@/lib/auth-context";
import { OnboardingWizard } from "./OnboardingWizard";

/**
 * Onboarding Provider
 *
 * Manages first-time user onboarding flow.
 * Shows the OnboardingWizard for new users and persists completion state.
 */

const ONBOARDING_KEY = "warehouse-onboarding-complete";

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  showOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: true,
  showOnboarding: () => {},
  resetOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoading && user) {
      // Use user ID to track completion per-user
      const key = `${ONBOARDING_KEY}-${user.id}`;
      const isComplete = localStorage.getItem(key) === "true";
      setIsOnboardingComplete(isComplete);

      // Show wizard for new users after a brief delay
      if (!isComplete) {
        const timer = setTimeout(() => {
          setShowWizard(true);
        }, 500);
        return () => clearTimeout(timer);
      }

      setHasChecked(true);
    }
  }, [user, isLoading]);

  const handleComplete = () => {
    if (user) {
      const key = `${ONBOARDING_KEY}-${user.id}`;
      localStorage.setItem(key, "true");
    }
    setIsOnboardingComplete(true);
    setShowWizard(false);
  };

  const handleSkip = () => {
    if (user) {
      const key = `${ONBOARDING_KEY}-${user.id}`;
      localStorage.setItem(key, "true");
    }
    setIsOnboardingComplete(true);
    setShowWizard(false);
  };

  const showOnboarding = () => {
    setShowWizard(true);
  };

  const resetOnboarding = () => {
    if (user) {
      const key = `${ONBOARDING_KEY}-${user.id}`;
      localStorage.removeItem(key);
    }
    setIsOnboardingComplete(false);
    setShowWizard(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        showOnboarding,
        resetOnboarding,
      }}
    >
      {children}
      {showWizard && user && (
        <OnboardingWizard onComplete={handleComplete} onSkip={handleSkip} />
      )}
    </OnboardingContext.Provider>
  );
}
