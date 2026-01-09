"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, XCircle, AlertTriangle, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function QualityDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/quality/metrics"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor inspections, defects, and quality metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Inspection</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics?.awaitingInspection || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs in QC queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Inspections</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.failedInspections || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defect Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.defectRate || 0}%</div>
            <p className="text-xs text-green-600">-2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batches on Hold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics?.batchesOnHold || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting disposition</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inspection Queue</CardTitle>
            <CardDescription>Jobs awaiting quality inspection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-center py-8 text-muted-foreground">
                Inspection queue is empty
              </p>
              <Button className="w-full" asChild>
                <Link href="/quality/inspections">View All Inspections</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defect Trends</CardTitle>
            <CardDescription>Top defects by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Assembly - Alignment Issues</span>
                <Badge variant="destructive">12</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pleating - Inconsistent Spacing</span>
                <Badge variant="destructive">8</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Packaging - Label Errors</span>
                <Badge variant="outline">4</Badge>
              </div>
              <Button className="w-full mt-4" asChild>
                <Link href="/quality/defects">View Detailed Report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
