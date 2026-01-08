"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Check, ArrowRight } from "lucide-react";

const PLANS = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "Up to 3 users",
      "1 warehouse location",
      "100 SKUs",
      "Basic inventory tracking",
      "Dashboard & reports",
    ],
    popular: false,
  },
  {
    tier: "STARTER",
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For growing businesses",
    features: [
      "Up to 10 users",
      "3 warehouse locations",
      "1,000 SKUs",
      "Barcode scanning",
      "Purchase orders",
      "Email support",
    ],
    popular: false,
  },
  {
    tier: "PROFESSIONAL",
    name: "Professional",
    price: "$149",
    period: "/month",
    description: "For serious operations",
    features: [
      "Up to 50 users",
      "Unlimited locations",
      "Unlimited SKUs",
      "Manufacturing & BOMs",
      "Advanced analytics",
      "API access",
      "Priority support",
    ],
    popular: true,
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    features: [
      "Unlimited everything",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "On-premise option",
      "Custom training",
    ],
    popular: false,
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const handlePlanSelect = (tier: string) => {
    if (tier === "ENTERPRISE") {
      // Redirect to contact sales
      window.location.href = "mailto:sales@warehousebuilder.com?subject=Enterprise%20Plan%20Inquiry";
      return;
    }
    setSelectedPlan(tier);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          planTier: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Redirect to onboarding
      router.push(data.redirectTo || "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "plan") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="h-10 w-10 text-blue-500" />
              <span className="text-3xl font-bold text-white">Warehouse Builder</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Choose your plan
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include a 14-day free trial of premium features.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {PLANS.map((plan) => (
              <Card 
                key={plan.tier}
                className={`relative bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer ${
                  plan.popular ? "ring-2 ring-blue-500 scale-105" : ""
                }`}
                onClick={() => handlePlanSelect(plan.tier)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? "bg-blue-600 hover:bg-blue-700" 
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {plan.tier === "ENTERPRISE" ? "Contact Sales" : "Get Started"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Already have account */}
          <div className="text-center">
            <p className="text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Account Details
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-white">Warehouse Builder</span>
          </div>
          <CardTitle className="text-2xl text-white">Create your account</CardTitle>
          <CardDescription className="text-slate-400">
            {selectedPlan === "FREE" 
              ? "Start with our free plan" 
              : `Starting with ${PLANS.find(p => p.tier === selectedPlan)?.name} plan`
            }
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-200">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Warehouse Inc."
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            
            <Button 
              type="button"
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={() => setStep("plan")}
            >
              ← Back to plans
            </Button>

            <p className="text-xs text-slate-500 text-center">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
