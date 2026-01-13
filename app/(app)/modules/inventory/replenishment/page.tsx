"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Calculator,
  FileText,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Zap,
} from "lucide-react";

interface ReplenishmentItem {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  eoq: number;
  leadTimeDays: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  preferredSupplier: string;
  urgency: "CRITICAL" | "HIGH" | "NORMAL";
}

interface EOQCalculation {
  itemId: string;
  eoq: number;
  safetyStock: number;
  reorderPoint: number;
  annualOrderCost: number;
  annualHoldingCost: number;
  totalCost: number;
}

export default function ReplenishmentPage() {
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showGeneratePO, setShowGeneratePO] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);

  // EOQ Calculator form
  const [eoqForm, setEoqForm] = useState({
    itemId: "",
    annualDemand: "",
    orderingCost: "50",
    holdingCostPercent: "0.25",
  });
  const [eoqResult, setEoqResult] = useState<EOQCalculation | null>(null);

  useEffect(() => {
    fetchReplenishmentItems();
  }, []);

  async function fetchReplenishmentItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/replenishment?includeForecasted=true");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function calculateEOQ() {
    try {
      const res = await fetch("/api/replenishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: eoqForm.itemId,
          annualDemand: parseFloat(eoqForm.annualDemand),
          orderingCost: parseFloat(eoqForm.orderingCost),
          holdingCostPercent: parseFloat(eoqForm.holdingCostPercent),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEoqResult(data.calculation);
      }
    } catch (error) {
      console.error("Failed to calculate EOQ:", error);
    }
  }

  async function generatePurchaseOrders() {
    try {
      const res = await fetch("/api/replenishment/generate-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedItems.length > 0 ? selectedItems : undefined,
          autoApprove: false,
          consolidateBySupplier: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowGeneratePO(false);
        setSelectedItems([]);
        // Show success message
      }
    } catch (error) {
      console.error("Failed to generate POs:", error);
    }
  }

  function getUrgencyBadge(urgency: string) {
    switch (urgency) {
      case "CRITICAL":
        return <Badge variant="destructive">Critical</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500">High</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  }

  const criticalItems = items.filter((i) => i.urgency === "CRITICAL").length;
  const highItems = items.filter((i) => i.urgency === "HIGH").length;
  const totalValue = items.reduce((sum, i) => sum + i.estimatedCost, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auto-Replenishment</h1>
          <p className="text-muted-foreground">
            EOQ optimization and automated purchase order generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReplenishmentItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowCalculator(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            EOQ Calculator
          </Button>
          <Button onClick={() => setShowGeneratePO(true)} disabled={items.length === 0}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Generate POs
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Items to Reorder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card className={criticalItems > 0 ? "border-red-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{highItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Est. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <Package className="h-4 w-4 mr-2" />
            Reorder Dashboard
          </TabsTrigger>
          <TabsTrigger value="parameters">
            <Settings className="h-4 w-4 mr-2" />
            Parameters
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Items Needing Replenishment</CardTitle>
                    <CardDescription>
                      Items below reorder point or forecasted to run out
                    </CardDescription>
                  </div>
                  {selectedItems.length > 0 && (
                    <Badge variant="secondary">
                      {selectedItems.length} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(items.map((i) => i.itemId));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Reorder Pt</TableHead>
                      <TableHead className="text-right">Safety Stock</TableHead>
                      <TableHead className="text-right">EOQ</TableHead>
                      <TableHead className="text-right">Suggested Qty</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Urgency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.itemId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.itemId]);
                              } else {
                                setSelectedItems(selectedItems.filter((id) => id !== item.itemId));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.sku}</div>
                            <div className="text-sm text-muted-foreground">{item.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.currentStock <= item.safetyStock ? "text-red-600 font-bold" : ""}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.reorderPoint}</TableCell>
                        <TableCell className="text-right">{item.safetyStock}</TableCell>
                        <TableCell className="text-right">{item.eoq}</TableCell>
                        <TableCell className="text-right font-bold">
                          {item.suggestedOrderQty}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.estimatedCost.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.preferredSupplier}</TableCell>
                        <TableCell>{getUrgencyBadge(item.urgency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {items.length === 0 && !loading && (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No items currently need replenishment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Stock Settings</CardTitle>
                <CardDescription>
                  Configure service level and safety stock calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Default Service Level</Label>
                  <Select defaultValue="95">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90% (Z = 1.28)</SelectItem>
                      <SelectItem value="95">95% (Z = 1.65)</SelectItem>
                      <SelectItem value="97">97% (Z = 1.88)</SelectItem>
                      <SelectItem value="99">99% (Z = 2.33)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Review Period (days)</Label>
                  <Input type="number" defaultValue="7" />
                </div>
                <div className="grid gap-2">
                  <Label>Default Lead Time (days)</Label>
                  <Input type="number" defaultValue="14" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Replenishment</CardTitle>
                <CardDescription>
                  Configure automatic purchase order generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Auto-Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create POs when items reach reorder point
                    </p>
                  </div>
                  <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
                </div>
                <div className="grid gap-2">
                  <Label>Default Ordering Cost ($)</Label>
                  <Input type="number" defaultValue="50" />
                </div>
                <div className="grid gap-2">
                  <Label>Holding Cost (%)</Label>
                  <Input type="number" defaultValue="25" step="1" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Consolidate by Supplier</Label>
                    <p className="text-sm text-muted-foreground">
                      Combine items into single PO per supplier
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Generated Orders</CardTitle>
              <CardDescription>
                History of automatically generated purchase orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No auto-generated orders yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EOQ Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>EOQ Calculator</DialogTitle>
            <DialogDescription>
              Calculate Economic Order Quantity and optimal reorder parameters
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Annual Demand (units)</Label>
                <Input
                  type="number"
                  value={eoqForm.annualDemand}
                  onChange={(e) => setEoqForm({ ...eoqForm, annualDemand: e.target.value })}
                  placeholder="10000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Ordering Cost ($)</Label>
                <Input
                  type="number"
                  value={eoqForm.orderingCost}
                  onChange={(e) => setEoqForm({ ...eoqForm, orderingCost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Holding Cost (% of item cost)</Label>
              <Input
                type="number"
                value={eoqForm.holdingCostPercent}
                onChange={(e) => setEoqForm({ ...eoqForm, holdingCostPercent: e.target.value })}
                step="0.01"
              />
            </div>
            <Button onClick={calculateEOQ}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>

            {eoqResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Results</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">EOQ</p>
                    <p className="text-2xl font-bold">{eoqResult.eoq} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Safety Stock</p>
                    <p className="text-2xl font-bold">{eoqResult.safetyStock} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reorder Point</p>
                    <p className="text-2xl font-bold">{eoqResult.reorderPoint} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Annual Cost</p>
                    <p className="text-2xl font-bold">${eoqResult.totalCost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalculator(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate PO Dialog */}
      <Dialog open={showGeneratePO} onOpenChange={setShowGeneratePO}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Purchase Orders</DialogTitle>
            <DialogDescription>
              Create purchase orders for {selectedItems.length > 0 ? selectedItems.length : items.length} items
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Consolidate by Supplier</Label>
                <p className="text-sm text-muted-foreground">
                  Create one PO per supplier
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Approve</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve generated POs
                </p>
              </div>
              <Switch />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Estimated Total:</strong> $
                {items
                  .filter((i) => selectedItems.length === 0 || selectedItems.includes(i.itemId))
                  .reduce((sum, i) => sum + i.estimatedCost, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneratePO(false)}>
              Cancel
            </Button>
            <Button onClick={generatePurchaseOrders}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Generate POs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
