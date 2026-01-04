"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileBarChart,
  Package,
  ShoppingCart,
  Factory,
  TrendingUp,
  AlertTriangle,
  Archive,
  BarChart3,
  ClipboardCheck,
  Download,
} from "lucide-react";

const REPORT_CATEGORIES = [
  {
    title: "Inventory Reports",
    description: "Stock levels, valuations, and movement analysis",
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    reports: [
      {
        name: "Inventory Summary",
        description: "Current stock levels and valuations",
        href: "/api/reports?type=inventory-summary",
        type: "inventory-summary",
      },
      {
        name: "Inventory Movements",
        description: "Transaction history and flow analysis",
        href: "/api/reports?type=inventory-movements",
        type: "inventory-movements",
      },
      {
        name: "Low Stock Alert",
        description: "Items below reorder point",
        href: "/api/reports?type=low-stock",
        type: "low-stock",
        badge: "Alert",
      },
      {
        name: "Dead Stock Analysis",
        description: "Items with no movement 90+ days",
        href: "/api/reports?type=dead-stock",
        type: "dead-stock",
      },
      {
        name: "ABC Analysis",
        description: "Classification by value/velocity",
        href: "/api/reports?type=abc-analysis",
        type: "abc-analysis",
      },
    ],
  },
  {
    title: "Purchasing Reports",
    description: "Purchase orders, suppliers, and spend analysis",
    icon: ShoppingCart,
    color: "text-green-500",
    bgColor: "bg-green-50",
    reports: [
      {
        name: "Purchasing Summary",
        description: "PO statistics and totals",
        href: "/api/reports?type=purchasing-summary",
        type: "purchasing-summary",
      },
    ],
  },
  {
    title: "Production Reports",
    description: "Manufacturing orders and cycle times",
    icon: Factory,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    reports: [
      {
        name: "Production Summary",
        description: "Job completion and cycle times",
        href: "/api/reports?type=production-summary",
        type: "production-summary",
      },
    ],
  },
  {
    title: "Cycle Count Reports",
    description: "Count accuracy and variance analysis",
    icon: ClipboardCheck,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    reports: [
      {
        name: "Cycle Count Variance",
        description: "Count discrepancies and adjustments",
        href: "/api/reports?type=cycle-count-variance",
        type: "cycle-count-variance",
      },
    ],
  },
];

export default function ReportsPage() {
  const handleDownload = async (type: string, name: string) => {
    try {
      const res = await fetch(`/api/reports?type=${type}&format=csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileBarChart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Access operational reports and analytics
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/modules/inventory/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Inventory Analytics</h3>
                  <p className="text-sm text-muted-foreground">Interactive dashboards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchasing/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Purchasing Analytics</h3>
                  <p className="text-sm text-muted-foreground">Supplier performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manufacturing/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Factory className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Production Analytics</h3>
                  <p className="text-sm text-muted-foreground">Manufacturing insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {REPORT_CATEGORIES.map((category) => (
          <Card key={category.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                  <category.icon className={`h-5 w-5 ${category.color}`} />
                </div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <div
                    key={report.type}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{report.name}</h4>
                          {report.badge && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                              {report.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(report.type, report.name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
