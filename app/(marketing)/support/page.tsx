"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  Phone,
  Book,
  Clock,
  Check,
  ArrowRight,
  HelpCircle,
  Bug,
  Lightbulb,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supportCategories = [
  {
    icon: HelpCircle,
    title: "General Question",
    description: "Product features, getting started, how-to questions",
  },
  {
    icon: Bug,
    title: "Technical Issue",
    description: "Bug reports, errors, performance problems",
  },
  {
    icon: CreditCard,
    title: "Billing & Account",
    description: "Subscription, invoices, account management",
  },
  {
    icon: Lightbulb,
    title: "Feature Request",
    description: "Suggest new features or improvements",
  },
];

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-6 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-center">We&apos;ve received your message</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Our support team will get back to you within 24 hours. Check your email for a confirmation.
        </p>
        <div className="flex gap-4">
          <Link href="/docs">
            <Button variant="outline">Browse Documentation</Button>
          </Link>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-6 pt-20 pb-12 md:pt-28 md:pb-16">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl text-center">
          How can we help?
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground text-center">
          Our team is here to support you. Reach out and we&apos;ll get back to you as soon as possible.
        </p>
      </section>

      {/* Contact Options */}
      <section className="container pb-12">
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Book className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Documentation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Find answers in our comprehensive docs
              </p>
              <Link href="/docs">
                <Button variant="outline" size="sm" className="gap-2">
                  Browse Docs <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get help from our support team
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@warehousebuilder.com">
                  support@warehousebuilder.com
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with us during business hours
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                <Clock className="h-3 w-3" /> Mon-Fri, 9am-6pm EST
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Support Form */}
      <section className="container pb-16 md:pb-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">Send us a message</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {supportCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.title;
                    return (
                      <button
                        key={cat.title}
                        type="button"
                        onClick={() => setCategory(cat.title)}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-medium text-sm">{cat.title}</div>
                        <div className="text-xs text-muted-foreground">{cat.description}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" required placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required placeholder="you@company.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input id="subject" required placeholder="Brief description of your issue" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question</SelectItem>
                      <SelectItem value="medium">Medium - Need help soon</SelectItem>
                      <SelectItem value="high">High - Blocking my work</SelectItem>
                      <SelectItem value="urgent">Urgent - System down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    required
                    placeholder="Please describe your issue or question in detail..."
                    rows={6}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enterprise Support */}
      <section className="border-t bg-muted/50">
        <div className="container py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Enterprise Support</h2>
            <p className="text-muted-foreground mb-6">
              Enterprise customers get priority support with dedicated account managers,
              24/7 phone support, and guaranteed response times.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/pricing">
                <Button variant="outline">View Plans</Button>
              </Link>
              <Link href="/request-demo">
                <Button>Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
