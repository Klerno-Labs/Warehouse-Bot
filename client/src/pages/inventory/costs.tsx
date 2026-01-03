import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, AlertCircle } from "lucide-react";
import type { Item } from "@shared/inventory";

type ItemsResponse = {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const PAGE_SIZE = 50;

export default function CostManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [costBase, setCostBase] = useState("");
  const [avgCostBase, setAvgCostBase] = useState("");
  const [lastCostBase, setLastCostBase] = useState("");

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(PAGE_SIZE));
  queryParams.set("offset", String(page * PAGE_SIZE));
  if (searchTerm) queryParams.set("search", searchTerm);

  const { data, isLoading } = useQuery<ItemsResponse>({
    queryKey: ["/api/inventory/items", { search: searchTerm, page }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/items?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const updateCostMutation = useMutation({
    mutationFn: async (payload: { itemId: string; costBase?: number; avgCostBase?: number; lastCostBase?: number }) => {
      const { itemId, ...costs } = payload;
      return apiRequest("PATCH", `/api/inventory/items/${itemId}`, costs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Item costs updated successfully",
      });
      setEditingItem(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update costs",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setCostBase(item.costBase?.toString() || "");
    setAvgCostBase(item.avgCostBase?.toString() || "");
    setLastCostBase(item.lastCostBase?.toString() || "");
  };

  const resetForm = () => {
    setCostBase("");
    setAvgCostBase("");
    setLastCostBase("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const payload: any = { itemId: editingItem.id };

    if (costBase !== "") {
      const parsed = parseFloat(costBase);
      if (isNaN(parsed) || parsed < 0) {
        toast({
          title: "Invalid Input",
          description: "Standard cost must be a non-negative number",
          variant: "destructive",
        });
        return;
      }
      payload.costBase = parsed;
    }

    if (avgCostBase !== "") {
      const parsed = parseFloat(avgCostBase);
      if (isNaN(parsed) || parsed < 0) {
        toast({
          title: "Invalid Input",
          description: "Average cost must be a non-negative number",
          variant: "destructive",
        });
        return;
      }
      payload.avgCostBase = parsed;
    }

    if (lastCostBase !== "") {
      const parsed = parseFloat(lastCostBase);
      if (isNaN(parsed) || parsed < 0) {
        toast({
          title: "Invalid Input",
          description: "Last cost must be a non-negative number",
          variant: "destructive",
        });
        return;
      }
      payload.lastCostBase = parsed;
    }

    updateCostMutation.mutate(payload);
  };

  const getCostStatus = (item: Item) => {
    if (item.avgCostBase || item.costBase || item.lastCostBase) {
      return <Badge variant="secondary">Has Cost</Badge>;
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-600">No Cost</Badge>;
  };

  const getActiveCost = (item: Item) => {
    return item.avgCostBase || item.costBase || item.lastCostBase || 0;
  };

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Management</h1>
          <p className="text-muted-foreground">
            Manage item costs and pricing
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items With Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter(i => i.avgCostBase || i.costBase || i.lastCostBase).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {items.length > 0 ? Math.round((items.filter(i => i.avgCostBase || i.costBase || i.lastCostBase).length / items.length) * 100) : 0}% coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Missing Costs</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {items.filter(i => !i.avgCostBase && !i.costBase && !i.lastCostBase).length}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per Item</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${items.length > 0 ? (items.reduce((sum, i) => sum + getActiveCost(i), 0) / items.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Across all items</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Costs</CardTitle>
          <CardDescription>
            View and manage costs for all inventory items. Click an item to edit costs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by SKU or name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No items found</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Standard Cost</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Last Cost</TableHead>
                      <TableHead className="text-right">Active Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{getCostStatus(item)}</TableCell>
                        <TableCell className="text-right">
                          {item.costBase ? `$${item.costBase.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.avgCostBase ? `$${item.avgCostBase.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.lastCostBase ? `$${item.lastCostBase.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${getActiveCost(item).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total} items
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item Costs</DialogTitle>
            <DialogDescription>
              {editingItem && (
                <>
                  Update costs for <span className="font-semibold">{editingItem.sku}</span> - {editingItem.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="costBase">Standard Cost (per {editingItem?.baseUom})</Label>
              <Input
                id="costBase"
                type="number"
                step="0.01"
                min="0"
                value={costBase}
                onChange={(e) => setCostBase(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Manual standard cost for planning and budgeting
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgCostBase">Average Cost (per {editingItem?.baseUom})</Label>
              <Input
                id="avgCostBase"
                type="number"
                step="0.01"
                min="0"
                value={avgCostBase}
                onChange={(e) => setAvgCostBase(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Weighted average cost (auto-calculated from PO receipts)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastCostBase">Last Cost (per {editingItem?.baseUom})</Label>
              <Input
                id="lastCostBase"
                type="number"
                step="0.01"
                min="0"
                value={lastCostBase}
                onChange={(e) => setLastCostBase(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Most recent purchase cost (auto-updated from POs)
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-semibold mb-1">Cost Priority:</p>
              <p className="text-muted-foreground">
                1. Average Cost → 2. Standard Cost → 3. Last Cost
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                The system uses the first available cost for valuation calculations.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCostMutation.isPending}>
                {updateCostMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
