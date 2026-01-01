import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ITEM_CATEGORIES, UOMS, type Item } from "@shared/inventory";

type ItemsResponse = {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const PAGE_SIZE = 20;

export default function InventoryItemsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  
  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(PAGE_SIZE));
  queryParams.set("offset", String(page * PAGE_SIZE));
  if (searchTerm) queryParams.set("search", searchTerm);
  if (categoryFilter && categoryFilter !== "all") queryParams.set("category", categoryFilter);
  
  const { data, isLoading } = useQuery<ItemsResponse>({
    queryKey: ["/api/inventory/items", { search: searchTerm, category: categoryFilter, page }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/items?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
  
  const items = data?.items || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Item["category"]>(ITEM_CATEGORIES[0]);
  const [baseUom, setBaseUom] = useState<Item["baseUom"]>(UOMS[0]);
  const [allowedUoms, setAllowedUoms] = useState("EA:1");

  const resetForm = () => {
    setEditingId(null);
    setSku("");
    setName("");
    setDescription("");
    setCategory(ITEM_CATEGORIES[0]);
    setBaseUom(UOMS[0]);
    setAllowedUoms("EA:1");
  };

  const parseAllowedUoms = (input: string) => {
    const entries = input
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const parsed = entries.map((entry) => {
      const [uom, factor] = entry.split(":");
      const toBase = Number(factor);
      return { uom: uom?.trim(), toBase };
    });
    if (
      parsed.some(
        (entry) =>
          !entry.uom ||
          Number.isNaN(entry.toBase) ||
          !UOMS.includes(entry.uom as Item["baseUom"]),
      )
    ) {
      return null;
    }
    return parsed;
  };

  const submit = async () => {
    const parsed = parseAllowedUoms(allowedUoms);
    if (!parsed) {
      toast({
        title: "Invalid UoMs",
        description: "Use format like FT:1,YD:3,ROLL:100",
        variant: "destructive",
      });
      return;
    }
    const normalized = parsed.some((entry) => entry.uom === baseUom)
      ? parsed
      : [...parsed, { uom: baseUom, toBase: 1 }];

    const payload = {
      sku,
      name,
      description,
      category,
      baseUom,
      allowedUoms: normalized,
    };
    try {
      if (editingId) {
        await apiRequest("PATCH", `/api/inventory/items/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/inventory/items", payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"], exact: false });
      resetForm();
      toast({ title: "Item saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setSku(item.sku);
    setName(item.name);
    setDescription(item.description || "");
    setCategory(item.category);
    setBaseUom(item.baseUom);
    setAllowedUoms(item.allowedUoms.map((u) => `${u.uom}:${u.toBase}`).join(","));
  };

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
          <p className="text-sm text-muted-foreground">
            Maintain inventory master data.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {editingId ? "Edit Item" : "Add Item"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(event) => setSku(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as Item["category"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Base UoM</Label>
              <Select value={baseUom} onValueChange={(value) => setBaseUom(value as Item["baseUom"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select base UoM" />
                </SelectTrigger>
                <SelectContent>
                  {UOMS.map((uom) => (
                    <SelectItem key={uom} value={uom}>
                      {uom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="allowedUoms">Allowed UoMs</Label>
              <Input
                id="allowedUoms"
                value={allowedUoms}
                onChange={(event) => setAllowedUoms(event.target.value)}
                placeholder="FT:1,YD:3,ROLL:100"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button onClick={submit}>{editingId ? "Update Item" : "Add Item"}</Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Item List ({total} items)</CardTitle>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                placeholder="Search by SKU, name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full sm:w-[250px]"
              />
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Base UoM</TableHead>
                        <TableHead>Allowed UoMs</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.baseUom}</TableCell>
                            <TableCell>
                              {item.allowedUoms.map((u) => u.uom).join(", ")}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
