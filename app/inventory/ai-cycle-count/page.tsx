"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Target,
  Sparkles,
  Calendar,
  ListChecks,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface Recommendation {
  item: {
    id: string;
    sku: string;
    name: string;
    category: string;
    baseUom: string;
  };
  priorityScore: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  abcClass: 'A' | 'B' | 'C';
  reasons: string[];
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  metrics: {
    daysSinceLastCount: number;
    transactionVelocity: number;
    varianceRate: string;
    inventoryValue: string;
    totalQty: number;
    recentConsumption: number;
    openSalesOrders: number;
  };
  recommendedFrequency: string;
  locations: Array<{
    id: string;
    label: string;
    qty: number;
  }>;
}

interface AnalysisResult {
  recommendations: Recommendation[];
  summary: {
    totalInventoryValue: string;
    averagePriorityScore: string;
    abcBreakdown: { A: number; B: number; C: number };
    priorityBreakdown: { critical: number; high: number; medium: number; low: number };
    topRiskFactors: Array<{
      factor: string;
      occurrences: number;
      avgImpact: string;
    }>;
    estimatedCountTime: string;
  };
  analysis: {
    totalItemsAnalyzed: number;
    recommendedForCount: number;
    countType: string;
    timestamp: string;
  };
}

export default function AICycleCountPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentSite, availableSites } = useAuth();
  const [countType, setCountType] = useState("ABC");
  const [maxItems, setMaxItems] = useState("20");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // AI Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ai/cycle-count-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: `${data.recommendations.length} items recommended for counting`,
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
    analyzeMutation.mutate({
      maxItems: parseInt(maxItems),
      countType,
    });
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (analysisResult) {
      setSelectedItems(new Set(analysisResult.recommendations.map(r => r.item.id)));
    }
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const createCycleCount = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to count",
        variant: "destructive",
      });
      return;
    }

    if (!currentSite?.id) {
      toast({
        title: "No Site Selected",
        description: "Please select a site before creating a cycle count",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/cycle-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          name: `AI Cycle Count - ${new Date().toLocaleDateString()}`,
          type: countType === "ABC" ? "ABC" : countType === "HIGH_RISK" ? "ABC" : "RANDOM",
          scheduledDate: new Date().toISOString(),
          notes: `AI-recommended cycle count with ${selectedItems.size} items. Strategy: ${countType}`,
          itemIds: Array.from(selectedItems),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create cycle count");
      }

      const cycleCount = await response.json();

      toast({
        title: "Cycle Count Created",
        description: `Created cycle count with ${selectedItems.size} items`,
      });

      // Invalidate cycle counts query and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/cycle-counts"] });
      router.push("/modules/cycle-counts");
    } catch (error: any) {
      toast({
        title: "Failed to Create Cycle Count",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getABCColor = (abcClass: string) => {
    switch (abcClass) {
      case 'A':
        return 'bg-blue-600 text-white';
      case 'B':
        return 'bg-blue-400 text-white';
      case 'C':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Cycle Count Analyzer</h1>
          <p className="text-muted-foreground">
            Intelligent prioritization of items that need counting
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Analysis Configuration
          </CardTitle>
          <CardDescription>
            Configure how AI should prioritize items for cycle counting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="countType">Count Strategy</Label>
              <Select value={countType} onValueChange={setCountType}>
                <SelectTrigger id="countType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABC">ABC Analysis (High-Value Items)</SelectItem>
                  <SelectItem value="HIGH_RISK">High Risk Items Only</SelectItem>
                  <SelectItem value="RANDOM">Random Sampling</SelectItem>
                  <SelectItem value="ALL">All Items Ranked</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {countType === 'ABC' && 'Focus on Class A and B items (high value, high activity)'}
                {countType === 'HIGH_RISK' && 'Only items with risk score ≥70'}
                {countType === 'RANDOM' && 'Weighted random sample across all items'}
                {countType === 'ALL' && 'All items ranked by priority'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxItems">Maximum Items</Label>
              <Select value={maxItems} onValueChange={setMaxItems}>
                <SelectTrigger id="maxItems">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 items</SelectItem>
                  <SelectItem value="20">20 items</SelectItem>
                  <SelectItem value="50">50 items</SelectItem>
                  <SelectItem value="100">100 items</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Estimated time: {parseInt(maxItems) * 5} - {parseInt(maxItems) * 10} minutes
              </p>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full"
            size="lg"
          >
            {analyzeMutation.isPending ? (
              <>
                <Brain className="mr-2 h-5 w-5 animate-pulse" />
                AI is Analyzing Inventory...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Analyze & Generate Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Items to Count</p>
                    <p className="text-3xl font-bold">{analysisResult.recommendations.length}</p>
                  </div>
                  <ListChecks className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-3xl font-bold">
                      ${parseFloat(analysisResult.summary.totalInventoryValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Priority</p>
                    <p className="text-3xl font-bold">{analysisResult.summary.averagePriorityScore}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Time</p>
                    <p className="text-xl font-bold">{analysisResult.summary.estimatedCountTime}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ABC Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Class A (High Value)</span>
                    <span className="font-bold">{analysisResult.summary.abcBreakdown.A}</span>
                  </div>
                  <Progress value={(analysisResult.summary.abcBreakdown.A / analysisResult.recommendations.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Class B (Medium Value)</span>
                    <span className="font-bold">{analysisResult.summary.abcBreakdown.B}</span>
                  </div>
                  <Progress value={(analysisResult.summary.abcBreakdown.B / analysisResult.recommendations.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Class C (Low Value)</span>
                    <span className="font-bold">{analysisResult.summary.abcBreakdown.C}</span>
                  </div>
                  <Progress value={(analysisResult.summary.abcBreakdown.C / analysisResult.recommendations.length) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.summary.topRiskFactors.map((rf, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{rf.factor}</span>
                      <Badge variant="secondary">{rf.occurrences} items</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recommended Items for Counting</CardTitle>
                  <CardDescription>
                    {selectedItems.size} of {analysisResult.recommendations.length} selected
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                  <Button
                    size="sm"
                    onClick={createCycleCount}
                    disabled={selectedItems.size === 0 || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-4 w-4" />
                        Create Cycle Count ({selectedItems.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>ABC</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Last Count</TableHead>
                      <TableHead>Risk Factors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.recommendations.map((rec) => (
                      <TableRow key={rec.item.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(rec.item.id)}
                            onChange={() => toggleItemSelection(rec.item.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{rec.item.sku}</div>
                          <div className="text-sm text-muted-foreground">{rec.item.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(rec.priorityLevel)}>
                              {rec.priorityLevel}
                            </Badge>
                            <span className="text-sm font-medium">{rec.priorityScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getABCColor(rec.abcClass)}>
                            {rec.abcClass}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${parseFloat(rec.metrics.inventoryValue).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {rec.metrics.daysSinceLastCount} days ago
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rec.reasons.slice(0, 2).map((reason, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
