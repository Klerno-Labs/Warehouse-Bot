"use client";

import Link from "next/link";
import { Book, Boxes, Users, Settings, BarChart3, Smartphone, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const docCategories = [
  {
    title: "Getting Started",
    description: "Set up your warehouse in under 15 minutes",
    icon: Book,
    articles: [
      "Quick Start Guide",
      "Account Setup",
      "Onboarding Wizard",
      "First Job Tutorial",
    ],
  },
  {
    title: "Inventory Management",
    description: "Track stock, locations, and movements",
    icon: Boxes,
    articles: [
      "Adding Products",
      "Location Management",
      "Stock Adjustments",
      "Cycle Counts",
    ],
  },
  {
    title: "Team & Permissions",
    description: "Manage users and role-based access",
    icon: Users,
    articles: [
      "Inviting Team Members",
      "Role Configuration",
      "Permission Settings",
      "Department Setup",
    ],
  },
  {
    title: "Configuration",
    description: "Customize Warehouse Builder for your needs",
    icon: Settings,
    articles: [
      "Company Settings",
      "Warehouse Zones",
      "Workflow Rules",
      "Integration Setup",
    ],
  },
  {
    title: "Reports & Analytics",
    description: "Understand your warehouse performance",
    icon: BarChart3,
    articles: [
      "Dashboard Overview",
      "Inventory Reports",
      "Performance Metrics",
      "Custom Reports",
    ],
  },
  {
    title: "Mobile App",
    description: "Use Warehouse Builder on the floor",
    icon: Smartphone,
    articles: [
      "Mobile Installation",
      "Scanning Setup",
      "Offline Mode",
      "Mobile Workflows",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-6 pt-20 pb-12 md:pt-28 md:pb-16">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl text-center">
          Documentation
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground text-center">
          Everything you need to get the most out of Warehouse Builder
        </p>

        {/* Search */}
        <div className="w-full max-w-md mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container pb-8">
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup">
            <Button variant="outline" size="sm">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/request-demo">
            <Button variant="outline" size="sm">
              Request Demo
            </Button>
          </Link>
          <Link href="/support">
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </Link>
        </div>
      </section>

      {/* Documentation Categories */}
      <section className="container pb-16 md:pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {docCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{category.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {category.description}
                      </p>
                      <ul className="space-y-2">
                        {category.articles.map((article) => (
                          <li key={article}>
                            <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                              {article}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* API Section */}
      <section className="border-t bg-muted/50">
        <div className="container py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">
              API Documentation
            </h2>
            <p className="text-muted-foreground mb-6">
              Integrate Warehouse Builder with your existing systems using our REST API.
              Available on Professional and Enterprise plans.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline">
                API Reference
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline">
                SDK Downloads
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center">
          <h2 className="text-3xl font-bold">
            Need more help?
          </h2>
          <p className="text-muted-foreground">
            Our support team is ready to assist you with any questions.
          </p>
          <div className="flex gap-4">
            <Link href="/support">
              <Button variant="outline">Contact Support</Button>
            </Link>
            <Link href="/request-demo">
              <Button>Schedule a Call</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
