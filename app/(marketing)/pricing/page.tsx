"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Plan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  pricing: {
    monthly: number | null;
    yearly: number | null;
    monthlyWhenYearly: number | null;
    yearlyDiscount: number;
  };
  limits: {
    maxUsers: number | null;
    maxSites: number | null;
    maxItems: number | null;
    maxStorageGb: number | null;
    maxApiCallsPerMonth: number | null;
  };
  features: string[];
  hasStripeIntegration: boolean;
}

// Default plans to show if API fails or while loading
const defaultPlans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tier: "STARTER",
    description: "Perfect for small warehouses getting started",
    pricing: {
      monthly: 49,
      yearly: 470,
      monthlyWhenYearly: 39,
      yearlyDiscount: 20,
    },
    limits: {
      maxUsers: 5,
      maxSites: 1,
      maxItems: 1000,
      maxStorageGb: 5,
      maxApiCallsPerMonth: 10000,
    },
    features: [
      "Up to 5 users",
      "1 warehouse location",
      "1,000 SKUs",
      "Basic inventory tracking",
      "Mobile app access",
      "Email support",
    ],
    hasStripeIntegration: true,
  },
  {
    id: "professional",
    name: "Professional",
    tier: "PROFESSIONAL",
    description: "For growing operations that need more power",
    pricing: {
      monthly: 149,
      yearly: 1430,
      monthlyWhenYearly: 119,
      yearlyDiscount: 20,
    },
    limits: {
      maxUsers: 25,
      maxSites: 3,
      maxItems: 10000,
      maxStorageGb: 25,
      maxApiCallsPerMonth: 100000,
    },
    features: [
      "Up to 25 users",
      "3 warehouse locations",
      "10,000 SKUs",
      "Advanced analytics",
      "Role-based access control",
      "API access",
      "Priority support",
      "Custom reports",
    ],
    hasStripeIntegration: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tier: "ENTERPRISE",
    description: "Full-featured solution for large operations",
    pricing: {
      monthly: null,
      yearly: null,
      monthlyWhenYearly: null,
      yearlyDiscount: 0,
    },
    limits: {
      maxUsers: null,
      maxSites: null,
      maxItems: null,
      maxStorageGb: null,
      maxApiCallsPerMonth: null,
    },
    features: [
      "Unlimited users",
      "Unlimited locations",
      "Unlimited SKUs",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantees",
      "On-premise option",
      "24/7 phone support",
      "Training & onboarding",
    ],
    hasStripeIntegration: false,
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch("/api/billing/plans");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data);
          }
        }
      } catch (error) {
        // Use default plans on error
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const getPrice = (plan: Plan) => {
    if (!plan.pricing.monthly && !plan.pricing.yearly) {
      return null;
    }
    if (isYearly && plan.pricing.monthlyWhenYearly) {
      return plan.pricing.monthlyWhenYearly;
    }
    return plan.pricing.monthly;
  };

  const isProfessional = (plan: Plan) => {
    return plan.tier === "PROFESSIONAL" || plan.name.toLowerCase() === "professional";
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-6 pt-20 pb-12 md:pt-28 md:pb-16">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl text-center">
          Simple, transparent pricing
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground text-center">
          Start free for 14 days. No credit card required. Choose the plan that fits your warehouse.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>
            Yearly
          </span>
          {isYearly && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Save 20%
            </span>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container pb-16 md:pb-24">
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const isPopular = isProfessional(plan);

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  isPopular ? "border-primary shadow-lg scale-[1.02]" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  {/* Price */}
                  <div className="mb-6">
                    {price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold">Custom</div>
                    )}
                    {isYearly && plan.pricing.yearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${plan.pricing.yearly}/year)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-auto">
                    {price !== null ? (
                      <Link href="/signup" className="w-full">
                        <Button
                          className="w-full gap-2"
                          variant={isPopular ? "default" : "outline"}
                        >
                          Start Free Trial
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/request-demo" className="w-full">
                        <Button variant="outline" className="w-full gap-2">
                          Contact Sales
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ or Additional Info */}
      <section className="border-t bg-muted/50">
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              All plans include
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 mt-8">
              {[
                "14-day free trial",
                "No credit card required",
                "Cancel anytime",
                "Free data migration",
                "Onboarding support",
                "99.9% uptime SLA",
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center">
          <h2 className="text-3xl font-bold">
            Still have questions?
          </h2>
          <p className="text-muted-foreground">
            Our team is here to help you find the right plan for your warehouse.
          </p>
          <div className="flex gap-4">
            <Link href="/request-demo">
              <Button variant="outline">Request a Demo</Button>
            </Link>
            <Link href="/signup">
              <Button>Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
