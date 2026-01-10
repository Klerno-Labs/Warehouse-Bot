"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Import step components (we'll create these)
import { CompanyInfoStep } from "./steps/CompanyInfoStep";
import { DepartmentsStep } from "./steps/DepartmentsStep";
import { StationsStep } from "./steps/StationsStep";
import { FirstJobStep } from "./steps/FirstJobStep";
import { TeamStep } from "./steps/TeamStep";
import { ContactsStep } from "./steps/ContactsStep";
import { RolesStep } from "./steps/RolesStep";
import { CompletionStep } from "./steps/CompletionStep";

const STEPS = [
  { id: 1, title: "Company", description: "Basic info" },
  { id: 2, title: "Departments", description: "Structure" },
  { id: 3, title: "Stations", description: "Devices" },
  { id: 4, title: "First Job", description: "Walkthrough" },
  { id: 5, title: "Team", description: "Invite users" },
  { id: 6, title: "Contacts", description: "Suppliers" },
  { id: 7, title: "Roles", description: "Permissions" },
  { id: 8, title: "Complete", description: "Launch" },
];

// Define the shape of our wizard data
interface WizardData {
  company: {
    name: string;
    industry: string;
    size: string;
    timezone: string;
  };
  departments: string[];
  stations: Array<{ name: string; deviceType: string; department: string }>;
  firstJob: {
    name: string;
    sku: string;
    quantity: number;
    department: string;
  };
  team: Array<{ email: string; role: string; name: string }>;
  contacts: Array<{ name: string; type: string; email: string }>;
  roles: Record<string, string[]>;
}

export default function SetupWizardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
  const [isSaving, setIsSaving] = useState(false);

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...stepData }));
    // Auto-save to localStorage
    localStorage.setItem("wizardData", JSON.stringify({ ...wizardData, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSkip = () => {
    toast({
      title: "Step skipped",
      description: "You can always complete this later in settings.",
    });
    handleNext();
  };

  const handleComplete = async () => {
    setIsSaving(true);

    try {
      // Submit wizard data to API
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardData),
      });

      if (!response.ok) throw new Error("Failed to complete setup");

      // Clear saved data
      localStorage.removeItem("wizardData");

      toast({
        title: "Setup complete!",
        description: "Welcome to Warehouse Builder. Let's get started.",
      });

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Setup error:", error);
      toast({
        title: "Setup failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: wizardData,
      onUpdate: updateWizardData,
      onNext: handleNext,
    };

    switch (currentStep) {
      case 1:
        return <CompanyInfoStep {...stepProps} />;
      case 2:
        return <DepartmentsStep {...stepProps} />;
      case 3:
        return <StationsStep {...stepProps} />;
      case 4:
        return <FirstJobStep {...stepProps} />;
      case 5:
        return <TeamStep {...stepProps} />;
      case 6:
        return <ContactsStep {...stepProps} />;
      case 7:
        return <RolesStep {...stepProps} />;
      case 8:
        return <CompletionStep data={wizardData} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  const canSkip = currentStep >= 5 && currentStep <= 7; // Team, Contacts, Roles are optional

  return (
    <div className="mx-auto max-w-5xl">
      {/* Progress Bar */}
      <div className="mb-12">
        <ProgressBar steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <Card className="border-2">
        <CardContent className="p-8">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSaving}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          {canSkip && (
            <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
              Skip for now
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={isSaving}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? "Completing..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {currentStep < STEPS.length && (
          <p>
            Step {currentStep} of {STEPS.length} • Your progress is automatically saved
          </p>
        )}
      </div>
    </div>
  );
}
