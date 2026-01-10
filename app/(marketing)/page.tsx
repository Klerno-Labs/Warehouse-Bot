"use client";

import Link from "next/link";
import { ArrowRight, Check, Zap, Shield, Users, BarChart3, Smartphone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-8 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:text-7xl lg:leading-[1.1]">
            Warehouse management
            <br className="hidden sm:inline" />
            {" "}that actually <span className="text-primary">works</span>
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            No more weeks of training. No cluttered interfaces. Be operational in under 15 minutes with role-based dashboards designed for real warehouse work.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-3 mt-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>

        {/* Social Proof */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Trusted by growing manufacturers
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/50 border-2 border-background"
                />
              ))}
            </div>
            <span className="text-muted-foreground">Join 100+ teams</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl font-bold text-primary">&lt; 15 min</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Average onboarding time
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl font-bold text-primary">99.8%</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Pick accuracy
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl font-bold text-primary">40%</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Avg. efficiency increase
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-16 md:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Built for how warehouses actually work
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Not another bloated ERP. Role-based dashboards that show only what matters to each team member.
          </p>
        </div>

        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-none mt-12">
          {/* Feature 1 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">15-Minute Onboarding</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                8-step wizard that actually makes sense. Skip what you don't need. Be operational before lunch.
              </p>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Role-Based Dashboards</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Executives see analytics. Operators see their current job. Each role gets exactly what they need.
              </p>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Mobile-First Design</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built for tablets on the warehouse floor. Large touch targets, offline support, QR scanning built-in.
              </p>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Real-Time Updates</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                WebSocket-powered live updates. See job progress, inventory changes, and team activity instantly.
              </p>
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Drag-and-Drop RBAC</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Assign permissions visually. Multi-role support. Audit trail of all changes. Security made simple.
              </p>
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Actionable Analytics</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                OEE metrics, throughput reports, cost analysis. Executive dashboard that actually drives decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/50">
        <div className="container py-16 md:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              From signup to shipment in 15 minutes
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Our guided wizard walks you through everything. No consultants required.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                step: "1",
                title: "Company & Departments",
                description: "Choose from pre-built department templates or create custom ones. Takes 2 minutes.",
              },
              {
                step: "2",
                title: "Devices & Team",
                description: "Map tablets to stations, invite your team. Visual drag-and-drop interface.",
              },
              {
                step: "3",
                title: "First Job",
                description: "Create your first production job. We'll guide you through every field.",
              },
            ].map((item) => (
              <Card key={item.step} className="relative">
                <CardContent className="p-6">
                  <div className="absolute -top-4 -left-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Not your typical warehouse software
          </h2>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4">
            {[
              {
                legacy: "Weeks of training required",
                us: "Operators productive in hours",
              },
              {
                legacy: "One-size-fits-all interface",
                us: "Role-specific dashboards",
              },
              {
                legacy: "Complex permission matrices",
                us: "Visual drag-and-drop RBAC",
              },
              {
                legacy: "Desktop-only design",
                us: "Touch-first for tablets",
              },
              {
                legacy: "Slow implementation cycles",
                us: "Be live in under 15 minutes",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <span className="text-destructive text-xs">✕</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.legacy}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div className="text-sm font-medium">{item.us}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50">
        <div className="container py-16 md:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              Ready to modernize your warehouse?
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              See how Warehouse Builder can transform your operations. No credit card required.
            </p>
            <Link href="/request-demo">
              <Button size="lg" className="gap-2">
                Request Free Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Or <Link href="/login" className="underline underline-offset-4 hover:text-primary">sign in</Link> if you already have an account
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
