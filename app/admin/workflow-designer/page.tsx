"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  ArrowRight,
  Star,
  Clock,
  AlertCircle,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
}

interface RoutingStep {
  sequence: number;
  required: boolean;
  canSkip: boolean;
  estimatedMinutes?: number;
  department: CustomDepartment;
}

interface ProductionRouting {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  steps: RoutingStep[];
  item?: {
    id: string;
    sku: string;
    name: string;
  };
}

export default function WorkflowDesignerPage() {
  const [selectedRouting, setSelectedRouting] = useState<ProductionRouting | null>(null);

  const { data: routingsData, isLoading: routingsLoading } = useQuery<{
    routings: ProductionRouting[];
  }>({
    queryKey: ["/api/routings"],
  });

  const routings = routingsData?.routings || [];

  if (routingsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const routing = selectedRouting || routings[0];

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Routing List */}
      <div className="w-80 border-r bg-card p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-1">Production Routings</h2>
          <p className="text-sm text-muted-foreground">
            Select a routing to visualize
          </p>
        </div>

        <div className="space-y-2">
          {routings.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No routings configured</p>
              <Button asChild size="sm">
                <a href="/admin/routings">Create Routing</a>
              </Button>
            </div>
          ) : (
            routings.map((r) => (
              <Card
                key={r.id}
                className={`cursor-pointer transition-colors ${
                  routing?.id === r.id ? "border-primary bg-accent" : "hover:bg-accent/50"
                }`}
                onClick={() => setSelectedRouting(r)}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {r.name}
                      </CardTitle>
                      {r.item && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {r.item.sku} - {r.item.name}
                        </p>
                      )}
                    </div>
                    {r.isDefault && (
                      <Badge variant="secondary" className="ml-2 h-5">
                        <Star className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{r.steps.length} steps</span>
                    {!r.isActive && (
                      <Badge variant="outline" className="h-4 text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Visual Workflow */}
      <div className="flex-1 overflow-auto">
        {!routing ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No routing selected</p>
              <p className="text-sm mt-2">Create a routing to visualize workflows</p>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Routing Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{routing.name}</h1>
                {routing.isDefault && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    Default
                  </Badge>
                )}
                {!routing.isActive && <Badge variant="outline">Inactive</Badge>}
              </div>
              {routing.description && (
                <p className="text-muted-foreground">{routing.description}</p>
              )}
              {routing.item && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Item: {routing.item.sku} - {routing.item.name}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/routings?edit=${routing.id}`}>Edit Routing</a>
                </Button>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </div>

            {/* Workflow Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Workflow Visualization
                </CardTitle>
                <CardDescription>
                  Step-by-step production flow ({routing.steps.length} steps)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Horizontal Flow */}
                <div className="relative">
                  {/* Steps Container */}
                  <div className="flex items-stretch gap-4 overflow-x-auto pb-4">
                    {routing.steps.map((step, index) => {
                      const totalEstimatedTime = routing.steps
                        .slice(0, index + 1)
                        .reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

                      return (
                        <div key={index} className="flex items-center">
                          {/* Step Card */}
                          <div
                            className="relative w-64 border-2 rounded-lg p-4 bg-card"
                            style={{
                              borderColor: step.department.color,
                              backgroundColor: `${step.department.color}08`,
                            }}
                          >
                            {/* Step Number Badge */}
                            <div
                              className="absolute -top-3 -left-3 h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md"
                              style={{ backgroundColor: step.department.color }}
                            >
                              {step.sequence}
                            </div>

                            {/* Department Info */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                {step.department.icon && (
                                  <span className="text-2xl">{step.department.icon}</span>
                                )}
                                <div>
                                  <div className="font-semibold text-lg">
                                    {step.department.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {step.department.code}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Step Properties */}
                            <div className="space-y-2 text-sm">
                              {step.estimatedMinutes && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{step.estimatedMinutes} minutes</span>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {step.required && (
                                  <Badge variant="secondary" className="h-5 text-xs">
                                    Required
                                  </Badge>
                                )}
                                {step.canSkip && (
                                  <Badge variant="outline" className="h-5 text-xs">
                                    Skippable
                                  </Badge>
                                )}
                                {step.department.requireQC && (
                                  <Badge
                                    variant="default"
                                    className="h-5 text-xs bg-blue-600"
                                  >
                                    QC Required
                                  </Badge>
                                )}
                              </div>

                              {/* Cumulative Time */}
                              {totalEstimatedTime > 0 && (
                                <div className="pt-2 border-t text-xs text-muted-foreground">
                                  Cumulative: {totalEstimatedTime}m
                                </div>
                              )}
                            </div>

                            {/* Warnings */}
                            {!step.department.allowConcurrent && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Single job only</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Arrow Connector */}
                          {index < routing.steps.length - 1 && (
                            <div className="flex items-center px-4">
                              <ArrowRight
                                className="h-8 w-8 text-muted-foreground"
                                strokeWidth={2}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Stats */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{routing.steps.length}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Required Steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {routing.steps.filter((s) => s.required).length}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Est. Total Time
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {routing.steps.reduce(
                            (sum, s) => sum + (s.estimatedMinutes || 0),
                            0
                          )}
                          m
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          QC Steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {routing.steps.filter((s) => s.department.requireQC).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
