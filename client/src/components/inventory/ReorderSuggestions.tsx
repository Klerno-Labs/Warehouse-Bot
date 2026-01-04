import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  CheckCircle,
  DollarSign,
  Clock,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface ReorderSuggestion {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  daysUntilStockout: number;
  averageDailyUsage: number;
  leadTimeDays: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
}

interface ReorderAnalysis {
  totalSuggestions: number;
  criticalItems: number;
  estimatedTotalCost: number;
  suggestions: ReorderSuggestion[];
}

const PRIORITY_COLORS = {
  critical: { bg: "bg-red-100", text: "text-red-800", badge: "bg-red-500" },
  high: { bg: "bg-orange-100", text: "text-orange-800", badge: "bg-orange-500" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800", badge: "bg-yellow-500" },
  low: { bg: "bg-blue-100", text: "text-blue-800", badge: "bg-blue-500" },
};

export function ReorderSuggestions() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<ReorderAnalysis | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPO, setIsCreatingPO] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventory/reorder");
      const data = await response.json();
      setAnalysis(data.analysis);

      // Auto-select critical items
      const criticalItems = data.analysis.suggestions
        .filter((s: ReorderSuggestion) => s.priority === "critical")
        .map((s: ReorderSuggestion) => s.itemId);
      setSelectedItems(new Set(criticalItems));
    } catch (error: any) {
      toast({
        title: "Failed to load suggestions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (!analysis) return;
    setSelectedItems(new Set(analysis.suggestions.map((s) => s.itemId)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedTotal = () => {
    if (!analysis) return 0;
    return analysis.suggestions
      .filter((s) => selectedItems.has(s.itemId))
      .reduce((sum, s) => sum + s.estimatedCost, 0);
  };

  const handleCreatePO = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to create a purchase order",
        variant: "destructive",
      });
      return;
    }

    // For demo, we'd need to select supplier
    // This would normally open a modal to select supplier
    const supplierId = "demo-supplier-id"; // Placeholder
    const siteId = "demo-site-id"; // Placeholder

    setIsCreatingPO(true);
    try {
      const response = await fetch("/api/inventory/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          supplierId,
          itemIds: Array.from(selectedItems),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create purchase order");
      }

      toast({
        title: "Purchase order created",
        description: `PO created with ${selectedItems.size} items`,
      });

      // Refresh suggestions
      await fetchSuggestions();
      setSelectedItems(new Set());
    } catch (error: any) {
      toast({
        title: "Failed to create PO",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingPO(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading reorder suggestions...
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.totalSuggestions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            All Stock Levels Healthy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No items currently need reordering. All inventory levels are above reorder points.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Items to Reorder</CardDescription>
            <CardTitle className="text-3xl">{analysis.totalSuggestions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {analysis.criticalItems} critical
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Estimated Total Cost</CardDescription>
            <CardTitle className="text-3xl">
              ${analysis.estimatedTotalCost.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              For all suggested orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Selected Items</CardDescription>
            <CardTitle className="text-3xl">{selectedItems.size}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              ${getSelectedTotal().toLocaleString()} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items Alert */}
      {analysis.criticalItems > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{analysis.criticalItems} critical items</strong> need immediate attention.
            Stock will run out within lead time.
          </AlertDescription>
        </Alert>
      )}

      {/* Reorder Suggestions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reorder Suggestions</CardTitle>
              <CardDescription>
                Intelligent recommendations based on usage patterns and lead times
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
                onClick={handleCreatePO}
                disabled={selectedItems.size === 0 || isCreatingPO}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create PO ({selectedItems.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Days Until Out</TableHead>
                <TableHead className="text-right">Order Qty</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.suggestions.map((suggestion) => (
                <TableRow
                  key={suggestion.itemId}
                  className={PRIORITY_COLORS[suggestion.priority].bg}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(suggestion.itemId)}
                      onCheckedChange={() => toggleItem(suggestion.itemId)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[suggestion.priority].badge}>
                      {suggestion.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-sm text-muted-foreground">{suggestion.sku}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{suggestion.currentStock}</div>
                    <div className="text-xs text-muted-foreground">
                      Reorder: {suggestion.reorderPoint}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{suggestion.daysUntilStockout}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lead: {suggestion.leadTimeDays}d
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{suggestion.suggestedOrderQty}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {suggestion.estimatedCost.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {suggestion.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
