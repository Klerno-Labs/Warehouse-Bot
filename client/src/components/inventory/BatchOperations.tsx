import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  ArrowRight,
  Layers,
  DollarSign,
  Move,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
}

type Operation =
  | "update-costs"
  | "adjust-quantities"
  | "update-reorder-points"
  | "move-locations"
  | "update-categories"
  | "bulk-scrap";

const OPERATIONS = [
  { value: "update-costs", label: "Update Costs", icon: DollarSign },
  { value: "adjust-quantities", label: "Adjust Quantities", icon: Package },
  { value: "update-reorder-points", label: "Update Reorder Points", icon: Layers },
  { value: "move-locations", label: "Move Locations", icon: Move },
  { value: "update-categories", label: "Update Categories", icon: Layers },
  { value: "bulk-scrap", label: "Bulk Scrap", icon: Trash2 },
];

export function BatchOperations() {
  const { toast } = useToast();
  const [operation, setOperation] = useState<Operation>("update-costs");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Sample items - in production, fetch from API
  const [items] = useState<Item[]>([
    { id: "1", sku: "PM-24", name: "Paper Media 24\"", category: "PRODUCTION", currentStock: 150 },
    { id: "2", sku: "EC-001", name: "End Caps", category: "PACKAGING", currentStock: 500 },
    { id: "3", sku: "CORE-M", name: "Core Material", category: "PRODUCTION", currentStock: 75 },
  ]);

  // Form data
  const [formData, setFormData] = useState({
    costBase: "",
    adjustmentQty: "",
    reorderPoint: "",
    fromLocationId: "",
    toLocationId: "",
    qtyToMove: "",
    category: "",
    scrapQty: "",
    reasonCode: "",
    notes: "",
    siteId: "site-1", // Would come from context
    locationId: "loc-1", // Would come from context
  });

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
    setSelectedItems(new Set(items.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleExecute = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/inventory/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          items: Array.from(selectedItems),
          data: formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Batch operation failed");
      }

      toast({
        title: "Batch operation complete",
        description: data.message,
      });

      // Reset
      setSelectedItems(new Set());
      setFormData({
        costBase: "",
        adjustmentQty: "",
        reorderPoint: "",
        fromLocationId: "",
        toLocationId: "",
        qtyToMove: "",
        category: "",
        scrapQty: "",
        reasonCode: "",
        notes: "",
        siteId: "site-1",
        locationId: "loc-1",
      });
    } catch (error: any) {
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOperationForm = () => {
    switch (operation) {
      case "update-costs":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="costBase">New Cost (Base UOM)</Label>
              <Input
                id="costBase"
                type="number"
                step="0.01"
                value={formData.costBase}
                onChange={(e) => setFormData({ ...formData, costBase: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        );

      case "adjust-quantities":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustmentQty">Adjustment Quantity</Label>
              <Input
                id="adjustmentQty"
                type="number"
                value={formData.adjustmentQty}
                onChange={(e) => setFormData({ ...formData, adjustmentQty: e.target.value })}
                placeholder="Positive or negative"
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add, negative to subtract
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reasonCode">Reason Code</Label>
              <Select
                value={formData.reasonCode}
                onValueChange={(v) => setFormData({ ...formData, reasonCode: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADJUST">Adjustment</SelectItem>
                  <SelectItem value="FOUND">Inventory Found</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "update-reorder-points":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">New Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        );

      case "move-locations":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation">From Location</Label>
              <Select
                value={formData.fromLocationId}
                onValueChange={(v) => setFormData({ ...formData, fromLocationId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loc-1">A-01-01</SelectItem>
                  <SelectItem value="loc-2">A-01-02</SelectItem>
                  <SelectItem value="loc-3">B-01-01</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toLocation">To Location</Label>
              <Select
                value={formData.toLocationId}
                onValueChange={(v) => setFormData({ ...formData, toLocationId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loc-1">A-01-01</SelectItem>
                  <SelectItem value="loc-2">A-01-02</SelectItem>
                  <SelectItem value="loc-3">B-01-01</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtyToMove">Quantity to Move</Label>
              <Input
                id="qtyToMove"
                type="number"
                value={formData.qtyToMove}
                onChange={(e) => setFormData({ ...formData, qtyToMove: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        );

      case "update-categories":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">New Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="PACKAGING">Packaging</SelectItem>
                  <SelectItem value="FACILITY">Facility</SelectItem>
                  <SelectItem value="CHEMICAL_MRO">Chemical/MRO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "bulk-scrap":
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation will permanently remove inventory. This cannot be undone.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="scrapQty">Quantity to Scrap</Label>
              <Input
                id="scrapQty"
                type="number"
                value={formData.scrapQty}
                onChange={(e) => setFormData({ ...formData, scrapQty: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scrapReason">Reason Code</Label>
              <Select
                value={formData.reasonCode}
                onValueChange={(v) => setFormData({ ...formData, reasonCode: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCRAP">Scrap</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
    }
  };

  const OperationIcon = OPERATIONS.find((op) => op.value === operation)?.icon || Package;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Batch Operations</h2>
        <p className="text-muted-foreground">Perform bulk updates on multiple items at once</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operation Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Operation</CardTitle>
            <CardDescription>Choose the type of batch operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {OPERATIONS.map((op) => {
              const Icon = op.icon;
              return (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value as Operation)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    operation === op.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{op.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Operation Form & Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <OperationIcon className="h-5 w-5" />
              <CardTitle>
                {OPERATIONS.find((op) => op.value === operation)?.label}
              </CardTitle>
            </div>
            <CardDescription>
              Configure operation parameters and select items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form */}
            {renderOperationForm()}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about this batch operation..."
                rows={2}
              />
            </div>

            {/* Item Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Items ({selectedItems.size} selected)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.sku} • {item.category} • Stock: {item.currentStock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={selectedItems.size === 0 || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  Execute Batch Operation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
