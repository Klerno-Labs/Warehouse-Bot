import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Edit, Copy, CheckCircle } from "lucide-react";

type BOMStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "SUPERSEDED";
type UOM = "EA" | "FT" | "YD" | "ROLL";
type ComponentIssueMethod = "MANUAL" | "BACKFLUSH" | "PREISSUE";

type Item = {
  id: string;
  code: string;
  description: string;
  baseUom: UOM;
};

type BOMComponent = {
  id: string;
  itemId: string;
  sequence: number;
  qtyPer: number;
  uom: UOM;
  scrapFactor: number;
  isOptional: boolean;
  isPurchased: boolean;
  leadTimeOffset: number;
  issueMethod: ComponentIssueMethod;
  notes?: string;
  referenceDesignator?: string;
  item?: Item;
};

type BOM = {
  id: string;
  bomNumber: string;
  version: number;
  description?: string;
  status: BOMStatus;
  baseQty: number;
  baseUom: UOM;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  item: Item;
  components: BOMComponent[];
  _count?: {
    components: number;
    productionOrders: number;
  };
  createdAt: string;
};

type BOMsResponse = {
  boms: BOM[];
};

type ItemsResponse = {
  items: Item[];
};

export default function BOMsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<BOMStatus | "ALL">("ALL");
  const [itemFilter, setItemFilter] = useState<string>("ALL");

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    itemId: "",
    bomNumber: "",
    version: 1,
    description: "",
    baseQty: 1,
    baseUom: "EA" as UOM,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    notes: "",
  });

  const [components, setComponents] = useState<Partial<BOMComponent>[]>([]);
  const [newComponent, setNewComponent] = useState<Partial<BOMComponent>>({
    itemId: "",
    sequence: 1,
    qtyPer: 1,
    uom: "EA" as UOM,
    scrapFactor: 0,
    isOptional: false,
    isPurchased: false,
    leadTimeOffset: 0,
    issueMethod: "BACKFLUSH" as ComponentIssueMethod,
    notes: "",
    referenceDesignator: "",
  });

  // Fetch BOMs
  const { data: bomsData, isLoading: isLoadingBOMs } = useQuery<BOMsResponse>({
    queryKey: ["boms"],
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/boms");
      if (!res.ok) throw new Error("Failed to fetch BOMs");
      return res.json();
    },
  });

  // Fetch items
  const { data: itemsData } = useQuery<ItemsResponse>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const boms = bomsData?.boms || [];
  const items = itemsData?.items || [];

  // Filter BOMs
  const filteredBOMs = boms.filter((bom: BOM) => {
    if (statusFilter !== "ALL" && bom.status !== statusFilter) return false;
    if (itemFilter !== "ALL" && bom.item.id !== itemFilter) return false;
    return true;
  });

  const handleAddComponent = () => {
    if (!newComponent.itemId || !newComponent.qtyPer) {
      toast({
        title: "Validation Error",
        description: "Item and quantity are required",
        variant: "destructive",
      });
      return;
    }

    setComponents([...components, { ...newComponent, sequence: components.length + 1 }]);
    setNewComponent({
      itemId: "",
      sequence: components.length + 2,
      qtyPer: 1,
      uom: "EA" as UOM,
      scrapFactor: 0,
      isOptional: false,
      isPurchased: false,
      leadTimeOffset: 0,
      issueMethod: "BACKFLUSH" as ComponentIssueMethod,
      notes: "",
      referenceDesignator: "",
    });
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleCreateBOM = async () => {
    if (!formData.itemId || !formData.bomNumber || components.length === 0) {
      toast({
        title: "Validation Error",
        description: "Item, BOM number, and at least one component are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/manufacturing/boms", {
        ...formData,
        components: components.map((comp, idx) => ({
          ...comp,
          sequence: idx + 1,
        })),
      });

      toast({
        title: "Success",
        description: "BOM created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["boms"] });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create BOM",
        variant: "destructive",
      });
    }
  };

  const handleActivateBOM = async (bomId: string) => {
    try {
      await apiRequest("PUT", `/api/manufacturing/boms/${bomId}`, {
        status: "ACTIVE",
      });

      toast({
        title: "Success",
        description: "BOM activated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["boms"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate BOM",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBOM = async (bomId: string) => {
    try {
      await apiRequest("DELETE", `/api/manufacturing/boms/${bomId}`);

      toast({
        title: "Success",
        description: "BOM deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["boms"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete BOM",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      itemId: "",
      bomNumber: "",
      version: 1,
      description: "",
      baseQty: 1,
      baseUom: "EA" as UOM,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      notes: "",
    });
    setComponents([]);
    setNewComponent({
      itemId: "",
      sequence: 1,
      qtyPer: 1,
      uom: "EA" as UOM,
      scrapFactor: 0,
      isOptional: false,
      isPurchased: false,
      leadTimeOffset: 0,
      issueMethod: "BACKFLUSH" as ComponentIssueMethod,
      notes: "",
      referenceDesignator: "",
    });
  };

  const getStatusBadgeVariant = (status: BOMStatus) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "DRAFT":
        return "secondary";
      case "INACTIVE":
        return "outline";
      case "SUPERSEDED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bills of Material</h1>
          <p className="text-muted-foreground">
            Manage product structures and component lists
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New BOM</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Finished Good Item *</Label>
                  <Select
                    value={formData.itemId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, itemId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item: Item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>BOM Number *</Label>
                  <Input
                    value={formData.bomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bomNumber: e.target.value })
                    }
                    placeholder="BOM-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    type="number"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: parseInt(e.target.value) })
                    }
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base Quantity</Label>
                  <Input
                    type="number"
                    value={formData.baseQty}
                    onChange={(e) =>
                      setFormData({ ...formData, baseQty: parseFloat(e.target.value) })
                    }
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base UOM</Label>
                  <Select
                    value={formData.baseUom}
                    onValueChange={(value) =>
                      setFormData({ ...formData, baseUom: value as UOM })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">Each</SelectItem>
                      <SelectItem value="FT">Feet</SelectItem>
                      <SelectItem value="YD">Yards</SelectItem>
                      <SelectItem value="ROLL">Roll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveFrom: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveTo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                />
              </div>

              {/* Components Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Components *</h3>

                {components.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seq</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty Per</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Scrap %</TableHead>
                        <TableHead>Issue Method</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {components.map((comp, idx) => {
                        const item = items.find((i: Item) => i.id === comp.itemId);
                        return (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              {item ? `${item.code} - ${item.description}` : "Unknown"}
                            </TableCell>
                            <TableCell>{comp.qtyPer}</TableCell>
                            <TableCell>{comp.uom}</TableCell>
                            <TableCell>{comp.scrapFactor}%</TableCell>
                            <TableCell>{comp.issueMethod}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveComponent(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Add Component</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Component Item *</Label>
                      <Select
                        value={newComponent.itemId}
                        onValueChange={(value) =>
                          setNewComponent({ ...newComponent, itemId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item: Item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.code} - {item.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity Per *</Label>
                      <Input
                        type="number"
                        value={newComponent.qtyPer}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            qtyPer: parseFloat(e.target.value),
                          })
                        }
                        min={0.01}
                        step={0.01}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>UOM</Label>
                      <Select
                        value={newComponent.uom}
                        onValueChange={(value) =>
                          setNewComponent({ ...newComponent, uom: value as UOM })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EA">Each</SelectItem>
                          <SelectItem value="FT">Feet</SelectItem>
                          <SelectItem value="YD">Yards</SelectItem>
                          <SelectItem value="ROLL">Roll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Scrap Factor %</Label>
                      <Input
                        type="number"
                        value={newComponent.scrapFactor}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            scrapFactor: parseFloat(e.target.value),
                          })
                        }
                        min={0}
                        max={100}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Issue Method</Label>
                      <Select
                        value={newComponent.issueMethod}
                        onValueChange={(value) =>
                          setNewComponent({
                            ...newComponent,
                            issueMethod: value as ComponentIssueMethod,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="BACKFLUSH">Backflush</SelectItem>
                          <SelectItem value="PREISSUE">Pre-Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleAddComponent} variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Component
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBOM}>Create BOM</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as BOMStatus | "ALL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUPERSEDED">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item</Label>
              <Select
                value={itemFilter}
                onValueChange={(value) => setItemFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Items</SelectItem>
                  {items.map((item: Item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOMs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bills of Material ({filteredBOMs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBOMs ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredBOMs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No BOMs found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BOM Number</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base Qty</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Production Orders</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBOMs.map((bom: BOM) => (
                  <TableRow key={bom.id}>
                    <TableCell className="font-medium">{bom.bomNumber}</TableCell>
                    <TableCell>{bom.version}</TableCell>
                    <TableCell>
                      {bom.item.code} - {bom.item.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(bom.status)}>
                        {bom.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bom.baseQty} {bom.baseUom}
                    </TableCell>
                    <TableCell>{bom._count?.components || 0}</TableCell>
                    <TableCell>{bom._count?.productionOrders || 0}</TableCell>
                    <TableCell>
                      {new Date(bom.effectiveFrom).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBOM(bom);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {bom.status === "DRAFT" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivateBOM(bom.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBOM(bom.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View BOM Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              BOM {selectedBOM?.bomNumber} v{selectedBOM?.version}
            </DialogTitle>
          </DialogHeader>
          {selectedBOM && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Item</Label>
                  <p className="font-medium">
                    {selectedBOM.item.code} - {selectedBOM.item.description}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={getStatusBadgeVariant(selectedBOM.status)}>
                      {selectedBOM.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Base Quantity</Label>
                  <p className="font-medium">
                    {selectedBOM.baseQty} {selectedBOM.baseUom}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Effective From</Label>
                  <p className="font-medium">
                    {new Date(selectedBOM.effectiveFrom).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Effective To</Label>
                  <p className="font-medium">
                    {selectedBOM.effectiveTo
                      ? new Date(selectedBOM.effectiveTo).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {selectedBOM.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedBOM.description}</p>
                </div>
              )}

              {selectedBOM.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{selectedBOM.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  Components ({selectedBOM.components.length})
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty Per</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Scrap %</TableHead>
                      <TableHead>Issue Method</TableHead>
                      <TableHead>Optional</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBOM.components.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell>{comp.sequence}</TableCell>
                        <TableCell>
                          {comp.item
                            ? `${comp.item.code} - ${comp.item.description}`
                            : "Unknown"}
                        </TableCell>
                        <TableCell>{comp.qtyPer}</TableCell>
                        <TableCell>{comp.uom}</TableCell>
                        <TableCell>{comp.scrapFactor}%</TableCell>
                        <TableCell>{comp.issueMethod}</TableCell>
                        <TableCell>{comp.isOptional ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
