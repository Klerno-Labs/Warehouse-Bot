import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Setup Wizard - Warehouse Builder",
  description: "Get your warehouse operational in under 15 minutes",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Package className="h-6 w-6" />
            <span className="font-bold text-xl">Warehouse Builder</span>
          </Link>
          <div className="ml-auto text-sm text-muted-foreground">
            Need help? <a href="/support" className="text-primary hover:underline">Contact support</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">{children}</main>
    </div>
  );
}
