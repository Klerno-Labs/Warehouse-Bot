import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  X,
  Save,
  Star,
  Plus,
  ChevronDown,
  ChevronUp,
  Package,
  Briefcase,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchFilter {
  field: string;
  operator: string;
  value: any;
  label?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  options: any;
  isDefault: boolean;
}

const ENTITY_TYPES = [
  { value: "items", label: "Items", icon: Package },
  { value: "jobs", label: "Jobs", icon: Briefcase },
  { value: "events", label: "Events", icon: MapPin },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "in", label: "In List" },
  { value: "between", label: "Between" },
];

const ITEM_FIELDS = [
  { value: "sku", label: "SKU", type: "text" },
  { value: "name", label: "Name", type: "text" },
  { value: "category", label: "Category", type: "select" },
  { value: "costBase", label: "Cost", type: "number" },
  { value: "reorderPointBase", label: "Reorder Point", type: "number" },
];

export function AdvancedSearch() {
  const { toast } = useToast();
  const [entityType, setEntityType] = useState("items");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      // In production, fetch from API
      setSavedSearches([
        {
          id: "1",
          name: "Low Stock Items",
          description: "Items below reorder point",
          entityType: "items",
          options: {},
          isDefault: false,
        },
      ]);
    } catch (error) {
      console.error("Failed to load saved searches:", error);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: entityType,
        query,
        filters: JSON.stringify(filters),
        sort: `${sortField}:${sortDirection}`,
        page: "1",
        limit: "50",
      });

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setResults(data);

      toast({
        title: "Search complete",
        description: `Found ${data.total} results`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        field: ITEM_FIELDS[0].value,
        operator: "eq",
        value: "",
      },
    ]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const handleSaveSearch = async () => {
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: searchName,
          entityType,
          options: {
            query,
            filters,
            sort: { field: sortField, direction: sortDirection },
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save search");

      toast({
        title: "Search saved",
        description: `"${searchName}" has been saved`,
      });

      setSaveDialogOpen(false);
      setSearchName("");
      loadSavedSearches();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadSavedSearch = (search: SavedSearch) => {
    setEntityType(search.entityType);
    setQuery(search.options.query || "");
    setFilters(search.options.filters || []);
    if (search.options.sort) {
      setSortField(search.options.sort.field);
      setSortDirection(search.options.sort.direction);
    }
    handleSearch();
  };

  const EntityIcon = ENTITY_TYPES.find((t) => t.value === entityType)?.icon || Package;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Advanced Search</h2>
          <p className="text-muted-foreground">Search with filters and save your queries</p>
        </div>
        {savedSearches.length > 0 && (
          <div className="flex gap-2">
            {savedSearches.slice(0, 3).map((search) => (
              <Button
                key={search.id}
                variant="outline"
                size="sm"
                onClick={() => loadSavedSearch(search)}
              >
                <Star className="h-3 w-3 mr-1" />
                {search.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search..."
                    className="pl-10"
                  />
                </div>

                <Button onClick={handleSearch} disabled={isLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? "Searching..." : "Search"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {filters.length > 0 && `(${filters.length})`}
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </Button>

                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Search</DialogTitle>
                      <DialogDescription>
                        Save this search for quick access later
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="searchName">Search Name</Label>
                        <Input
                          id="searchName"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          placeholder="e.g., Low Stock Items"
                        />
                      </div>
                      <Button onClick={handleSaveSearch} className="w-full">
                        Save Search
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Filters Panel */}
        {showFilters && (
          <CardContent className="border-t">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Filters</Label>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Filter
                </Button>
              </div>

              {filters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No filters applied. Click "Add Filter" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {filters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={filter.field}
                        onValueChange={(v) => updateFilter(index, { field: v })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(v) => updateFilter(index, { operator: v })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sort Options */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortDirection} onValueChange={(v: any) => setSortDirection(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EntityIcon className="h-5 w-5" />
              Search Results
            </CardTitle>
            <CardDescription>
              Found {results.total} results (Page {results.page} of {results.totalPages})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found. Try adjusting your search criteria.
              </div>
            ) : (
              <div className="space-y-2">
                {results.data.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{item.name || item.jobNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.sku || item.description}
                        </div>
                        {item.category && (
                          <Badge variant="secondary" className="mt-1">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      {item.costBase && (
                        <div className="text-right">
                          <div className="font-semibold">${item.costBase}</div>
                          <div className="text-xs text-muted-foreground">Base Cost</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.hasMore && (
              <div className="mt-4 text-center">
                <Button variant="outline">Load More Results</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
