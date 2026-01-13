"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Building2,
  Users,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Target,
  BarChart3,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Notion-style Onboarding Wizard
 *
 * Features:
 * - Multi-step flow with progress indicator
 * - Animated transitions between steps
 * - Personalized welcome
 * - Quick setup options
 * - Skip functionality
 */

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  component: React.ComponentType<StepProps>;
}

interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  data: OnboardingData;
  setData: (data: Partial<OnboardingData>) => void;
}

interface OnboardingData {
  companyName: string;
  industry: string;
  teamSize: string;
  primaryUseCase: string;
  locations: string[];
  importMethod: string;
}

// Step 1: Welcome
function WelcomeStep({ onNext, onSkip }: StepProps) {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-8"
    >
      {/* Animated welcome icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6"
      >
        <Rocket className="h-10 w-10 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-zinc-900 dark:text-zinc-100"
      >
        Welcome, {user?.firstName}!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-zinc-500 dark:text-zinc-400 mt-3 max-w-md mx-auto"
      >
        Let's get your warehouse set up in just a few minutes.
        We'll personalize your experience based on your needs.
      </motion.p>

      {/* Feature highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto"
      >
        {[
          { icon: Target, label: "Track Inventory" },
          { icon: BarChart3, label: "Real-time Analytics" },
          { icon: Zap, label: "Automate Tasks" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800"
          >
            <item.icon className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {item.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 flex flex-col gap-3"
      >
        <Button size="lg" onClick={onNext} className="mx-auto px-8">
          Let's Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button
          onClick={onSkip}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Skip setup, I'll explore on my own
        </button>
      </motion.div>
    </motion.div>
  );
}

// Step 2: Company Info
function CompanyStep({ onNext, onBack, data, setData }: StepProps) {
  const industries = [
    { id: "manufacturing", label: "Manufacturing", icon: "🏭" },
    { id: "distribution", label: "Distribution", icon: "📦" },
    { id: "retail", label: "Retail", icon: "🛍️" },
    { id: "ecommerce", label: "E-commerce", icon: "🛒" },
    { id: "healthcare", label: "Healthcare", icon: "🏥" },
    { id: "other", label: "Other", icon: "🏢" },
  ];

  const teamSizes = [
    { id: "1-5", label: "1-5 people" },
    { id: "6-20", label: "6-20 people" },
    { id: "21-50", label: "21-50 people" },
    { id: "51-200", label: "51-200 people" },
    { id: "200+", label: "200+ people" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="py-6"
    >
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Tell us about your company
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">
        This helps us customize your experience
      </p>

      <div className="mt-8 space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input
            value={data.companyName}
            onChange={(e) => setData({ companyName: e.target.value })}
            placeholder="Acme Manufacturing"
            className="h-12"
          />
        </div>

        {/* Industry Selection */}
        <div className="space-y-3">
          <Label>Industry</Label>
          <div className="grid grid-cols-3 gap-2">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setData({ industry: industry.id })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  data.industry === industry.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                )}
              >
                <span className="text-2xl">{industry.icon}</span>
                <span className="text-sm font-medium">{industry.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Team Size */}
        <div className="space-y-3">
          <Label>Team Size</Label>
          <div className="flex flex-wrap gap-2">
            {teamSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setData({ teamSize: size.id })}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  data.teamSize === size.id
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.companyName}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// Step 3: Use Case
function UseCaseStep({ onNext, onBack, data, setData }: StepProps) {
  const useCases = [
    {
      id: "inventory",
      title: "Inventory Management",
      description: "Track stock levels, locations, and movements",
      icon: Package,
      features: ["Stock tracking", "Location management", "Reorder alerts"],
    },
    {
      id: "manufacturing",
      title: "Manufacturing & Production",
      description: "Manage BOMs, work orders, and production",
      icon: Building2,
      features: ["Bill of materials", "Production orders", "Component tracking"],
    },
    {
      id: "fulfillment",
      title: "Order Fulfillment",
      description: "Pick, pack, and ship customer orders",
      icon: MapPin,
      features: ["Pick lists", "Shipping labels", "Order tracking"],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="py-6"
    >
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        What's your primary focus?
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">
        We'll set up the right modules for you
      </p>

      <div className="mt-8 space-y-4">
        {useCases.map((useCase) => (
          <motion.button
            key={useCase.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setData({ primaryUseCase: useCase.id })}
            className={cn(
              "w-full p-5 rounded-xl border-2 text-left transition-all",
              data.primaryUseCase === useCase.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl",
                data.primaryUseCase === useCase.id
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}>
                <useCase.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {useCase.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {useCase.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {useCase.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              {data.primaryUseCase === useCase.id && (
                <CheckCircle2 className="h-6 w-6 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.primaryUseCase}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// Step 4: Import Data
function ImportStep({ onNext, onBack, data, setData }: StepProps) {
  const importOptions = [
    {
      id: "csv",
      title: "Import from CSV/Excel",
      description: "Upload your existing inventory data",
      icon: "📊",
      time: "~5 minutes",
    },
    {
      id: "erp",
      title: "Connect ERP System",
      description: "Sync with your existing ERP (SAP, NetSuite, etc.)",
      icon: "🔗",
      time: "~15 minutes",
    },
    {
      id: "manual",
      title: "Start Fresh",
      description: "Add items manually as you go",
      icon: "✨",
      time: "Anytime",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="py-6"
    >
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        How would you like to get started?
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">
        You can always add more data later
      </p>

      <div className="mt-8 space-y-4">
        {importOptions.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setData({ importMethod: option.id })}
            className={cn(
              "w-full p-5 rounded-xl border-2 text-left transition-all",
              data.importMethod === option.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
            )}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{option.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {option.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {option.description}
                </p>
              </div>
              <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                {option.time}
              </span>
              {data.importMethod === option.id && (
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.importMethod}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// Step 5: Complete
function CompleteStep({ onNext, data }: StepProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate setup
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {isLoading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent"
          />
          <p className="mt-6 text-zinc-500">Setting up your workspace...</p>
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              You're all set!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              Your warehouse is ready. We've configured everything based on your preferences.
            </p>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 max-w-sm mx-auto text-left"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Your Setup
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Company</span>
                <span className="font-medium">{data.companyName || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Industry</span>
                <span className="font-medium capitalize">{data.industry || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Focus</span>
                <span className="font-medium capitalize">{data.primaryUseCase || "Not set"}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <Button size="lg" onClick={onNext} className="px-8">
              <Sparkles className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// Main Wizard Component
export function OnboardingWizard({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    industry: "",
    teamSize: "",
    primaryUseCase: "",
    locations: [],
    importMethod: "",
  });

  const steps: OnboardingStep[] = [
    { id: "welcome", title: "Welcome", subtitle: "Get started", icon: Rocket, component: WelcomeStep },
    { id: "company", title: "Company", subtitle: "Your business", icon: Building2, component: CompanyStep },
    { id: "usecase", title: "Use Case", subtitle: "Your focus", icon: Target, component: UseCaseStep },
    { id: "import", title: "Data", subtitle: "Get started", icon: Package, component: ImportStep },
    { id: "complete", title: "Complete", subtitle: "All done", icon: CheckCircle2, component: CompleteStep },
  ];

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (newData: Partial<OnboardingData>) => {
    setData({ ...data, ...newData });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-10"
        >
          <X className="h-5 w-5 text-zinc-400" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step indicators */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2",
                  index <= currentStep ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-green-500 text-white"
                    : index === currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800"
                )}>
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "hidden sm:block w-12 h-0.5 ml-2",
                    index < currentStep ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">
            <CurrentStepComponent
              key={currentStep}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={onSkip}
              data={data}
              setData={updateData}
            />
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
