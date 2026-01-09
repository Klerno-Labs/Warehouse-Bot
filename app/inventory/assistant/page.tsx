"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Package,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AnalysisResult {
  item: {
    id: string;
    sku: string;
    name: string;
    baseUom: string;
  };
  discrepancy: {
    expected: number;
    actual: number;
    variance: number;
    percentage: string;
  };
  analysis: {
    summary: string;
    severity: 'high' | 'medium' | 'low';
    possibleCauses: Array<{
      cause: string;
      likelihood: 'high' | 'medium' | 'low';
      evidence: string[];
      suggestedAction: string;
    }>;
    recommendedNextSteps: string[];
  };
  recentActivity: {
    events: any[];
    consumptions: any[];
    cycleCounts: any[];
    shipments: any[];
    receipts: any[];
  };
}

export default function InventoryAssistantPage() {
  const { toast } = useToast();
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [description, setDescription] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Fetch items for dropdown
  const { data: itemsData } = useQuery<{ items: any[] }>({
    queryKey: ["/api/items"],
  });

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery<{ locations: any[] }>({
    queryKey: ["/api/locations"],
  });

  // AI Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ai/inventory-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze discrepancy");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed the inventory discrepancy.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!itemId || !expectedQty || !actualQty) {
      toast({
        title: "Validation Error",
        description: "Please fill in item, expected quantity, and actual quantity.",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate({
      itemId,
      locationId: locationId || undefined,
      expectedQty: parseFloat(expectedQty),
      actualQty: parseFloat(actualQty),
      description,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLikelihoodBadge = (likelihood: string) => {
    const variants: Record<string, any> = {
      high: { variant: "destructive", label: "High Likelihood" },
      medium: { variant: "secondary", label: "Medium" },
      low: { variant: "outline", label: "Low" },
    };
    const config = variants[likelihood] || variants.low;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Inventory Assistant</h1>
          <p className="text-muted-foreground">
            Quickly identify and resolve inventory discrepancies with AI-powered analysis
          </p>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Report Discrepancy
          </CardTitle>
          <CardDescription>
            Enter the details of the inventory discrepancy and let AI help you find the cause
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item">Item*</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger id="item">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {itemsData?.items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locationsData?.locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected">Expected Quantity*</Label>
              <Input
                id="expected"
                type="number"
                step="0.01"
                placeholder="100"
                value={expectedQty}
                onChange={(e) => setExpectedQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                What the system says you should have
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual">Actual Quantity*</Label>
              <Input
                id="actual"
                type="number"
                step="0.01"
                placeholder="95"
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                What you physically counted
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Input
              id="description"
              placeholder="E.g., Found during cycle count, noticed after production run..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full"
            size="lg"
          >
            {analyzeMutation.isPending ? (
              <>
                <Bot className="mr-2 h-5 w-5 animate-pulse" />
                AI is Analyzing...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-5 w-5" />
                Analyze Discrepancy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className={`border-2 ${getSeverityColor(analysisResult.analysis.severity)}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Analysis Summary</CardTitle>
                  <CardDescription>
                    {analysisResult.item.sku} - {analysisResult.item.name}
                  </CardDescription>
                </div>
                <Badge className={getSeverityColor(analysisResult.analysis.severity)}>
                  {analysisResult.analysis.severity.toUpperCase()} SEVERITY
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium text-lg">
                  {analysisResult.analysis.summary}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">Expected</span>
                  <span className="text-2xl font-bold">{analysisResult.discrepancy.expected}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">Actual</span>
                  <span className="text-2xl font-bold">{analysisResult.discrepancy.actual}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">Variance</span>
                  <span className={`text-2xl font-bold ${
                    analysisResult.discrepancy.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {analysisResult.discrepancy.variance > 0 ? '-' : '+'}{Math.abs(analysisResult.discrepancy.variance)}
                    <span className="text-sm ml-1">({analysisResult.discrepancy.percentage}%)</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Possible Causes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Possible Causes
              </CardTitle>
              <CardDescription>
                AI-identified reasons ranked by likelihood
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResult.analysis.possibleCauses.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No specific causes identified. Recommend performing a physical cycle count and reviewing recent transactions.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {analysisResult.analysis.possibleCauses.map((cause, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-lg">{cause.cause}</h3>
                          {getLikelihoodBadge(cause.likelihood)}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Evidence:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {cause.evidence.map((ev, i) => (
                                <li key={i} className="text-sm">{ev}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              Suggested Action:
                            </h4>
                            <p className="text-sm text-blue-800">{cause.suggestedAction}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Recommended Next Steps
              </CardTitle>
              <CardDescription>
                Follow these steps to resolve the discrepancy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {analysisResult.analysis.recommendedNextSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Transactions that may be related to this discrepancy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {analysisResult.recentActivity.events.length > 0 && (
                  <AccordionItem value="events">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Inventory Events ({analysisResult.recentActivity.events.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {analysisResult.recentActivity.events.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{event.type}</Badge>
                              <span className="font-medium">{event.qty} units</span>
                              {event.from && <span className="text-muted-foreground">from {event.from}</span>}
                              {event.to && <span className="text-muted-foreground">to {event.to}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {event.user}
                              <Calendar className="h-3 w-3 ml-2" />
                              {new Date(event.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {analysisResult.recentActivity.consumptions.length > 0 && (
                  <AccordionItem value="consumptions">
                    <AccordionTrigger>
                      Production Consumptions ({analysisResult.recentActivity.consumptions.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {analysisResult.recentActivity.consumptions.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{c.qty} units</span>
                              <span className="text-muted-foreground">used in {c.productionOrder}</span>
                            </div>
                            <span className="text-muted-foreground">{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {analysisResult.recentActivity.cycleCounts.length > 0 && (
                  <AccordionItem value="counts">
                    <AccordionTrigger>
                      Cycle Counts ({analysisResult.recentActivity.cycleCounts.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {analysisResult.recentActivity.cycleCounts.map((cc) => (
                          <div key={cc.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-3">
                              <span>Expected: {cc.expected}</span>
                              <span>Counted: {cc.counted}</span>
                              <Badge variant={cc.variance === 0 ? "default" : "destructive"}>
                                Variance: {cc.variance}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">{new Date(cc.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
