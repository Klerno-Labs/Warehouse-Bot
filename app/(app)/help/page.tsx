"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Book,
  MessageCircle,
  Search,
  Video,
  FileText,
  HelpCircle,
  ExternalLink,
  Keyboard,
  Package,
  Briefcase,
  RefreshCw,
  Settings,
} from "lucide-react";
import Link from "next/link";

const quickLinks = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of Warehouse Core",
    icon: Book,
    href: "#getting-started",
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials",
    icon: Video,
    href: "#tutorials",
  },
  {
    title: "Documentation",
    description: "Browse full documentation",
    icon: FileText,
    href: "#docs",
  },
  {
    title: "Contact Support",
    description: "Get help from our team",
    icon: MessageCircle,
    href: "#support",
  },
];

const keyboardShortcuts = [
  { key: "M", action: "Move Stock" },
  { key: "A", action: "Adjust Stock" },
  { key: "C", action: "Cycle Count" },
  { key: "J", action: "Scan Job" },
  { key: "P", action: "Purchase Order" },
  { key: "S", action: "Sales ATP" },
  { key: "Cmd+K", action: "Global Search" },
];

const faqItems = [
  {
    question: "How do I receive inventory?",
    answer: "Go to Purchasing > Receipts and click 'New Receipt'. You can receive against a purchase order or create an ad-hoc receipt.",
    icon: Package,
  },
  {
    question: "How do I start a production job?",
    answer: "Navigate to Operations > Job Scanner or use the keyboard shortcut 'J'. Scan the job barcode to begin tracking.",
    icon: Briefcase,
  },
  {
    question: "How do I perform a cycle count?",
    answer: "Go to Operations > Cycle Counts. Create a new count, assign locations, and operators can then record their counts.",
    icon: RefreshCw,
  },
  {
    question: "How do I change my settings?",
    answer: "Click your profile in the sidebar footer and select 'Settings', or go to Administration > Settings if you're an admin.",
    icon: Settings,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground mt-2">
          Find answers, tutorials, and resources to help you get the most out of Warehouse Core
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search help articles..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Card key={link.title} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <CardDescription className="text-xs">{link.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{item.question}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              Quick actions from anywhere in the app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {keyboardShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm">{shortcut.action}</span>
                  <kbd className="inline-flex h-7 items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Support */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <MessageCircle className="h-10 w-10 text-primary mb-4" />
          <h3 className="text-lg font-semibold">Still need help?</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Our support team is available Monday-Friday, 9am-5pm EST.
            We typically respond within 2 hours.
          </p>
          <div className="flex gap-3 mt-4">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Knowledge Base
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
