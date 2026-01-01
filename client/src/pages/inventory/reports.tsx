import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryNav } from "@/components/inventory-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BarChart3, ChevronDown, ChevronRight, Download, Package, MapPin, Tag, ArrowRightLeft } from "lucide-react";
import { EVENT_TYPES } from "@shared/inventory";

type ValuationReportItem = {
  groupKey: string;
  groupLabel: string;
  totalQty: number;
  lineCount: number;
  details?: Array<{
    itemId: string;
    locationId: string;
    qtyBase: number;
    itemSku: string;
    itemName: string;
    itemCategory: string;
    locationLabel: string;
  }>;
};

type ValuationResponse = {
  report: ValuationReportItem[];
  totals: {
    totalQty: number;
    groupCount: number;
    lineCount: number;
  };
};

type MovementEvent = {
  id: string;
  eventType: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  fromLocationId: string | null;
  fromLocationLabel: string | null;
  toLocationId: string | null;
  toLocationLabel: string | null;
  qtyBase: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
};

type MovementResponse = {
  events: MovementEvent[];
  total: number;
  summary: Record<string, number>;
};

export default function InventoryReportsPage() {
  const [groupBy, setGroupBy] = useState("item");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Valuation report query
  const { data: valuationData, isLoading: valuationLoading } = useQuery<ValuationResponse>({
    queryKey: ["/api/inventory/reports/valuation", { groupBy }],
    queryFn: async () => {
      const params = new URLSearchParams({ groupBy });
      const res = await fetch(`/api/inventory/reports/valuation?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch valuation report");
      return res.json();
    },
  });

  // Movement report query
  const movementParams = new URLSearchParams();
  if (eventTypeFilter !== "all") movementParams.set("eventType", eventTypeFilter);
  if (startDate) movementParams.set("startDate", startDate);
  if (endDate) movementParams.set("endDate", endDate);
  movementParams.set("limit", "100");

  const { data: movementData, isLoading: movementLoading } = useQuery<MovementResponse>({
    queryKey: ["/api/inventory/reports/movement", { eventType: eventTypeFilter, startDate, endDate }],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/reports/movement?${movementParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch movement report");
      return res.json();
    },
  });

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupIcon = () => {
    switch (groupBy) {
      case "item": return <Package className="h-4 w-4" />;
      case "location": return <MapPin className="h-4 w-4" />;
      case "category": return <Tag className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const exportToCsv = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Inventory Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze inventory levels and movement history.
          </p>
        </div>

        <Tabs defaultValue="valuation" className="flex-1">
          <TabsList>
            <TabsTrigger value="valuation">Inventory Valuation</TabsTrigger>
            <TabsTrigger value="movement">Movement History</TabsTrigger>
          </TabsList>

          {/* Valuation Report */}
          <TabsContent value="valuation" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col gap-2">
                      <Label>Group By</Label>
                      <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="item">Item</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (valuationData?.report) {
                        const exportData = valuationData.report.map((r) => ({
                          Group: r.groupLabel,
                          TotalQty: r.totalQty,
                          Locations: r.lineCount,
                        }));
                        exportToCsv(exportData, "inventory-valuation.csv");
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {valuationData?.totals && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{valuationData.totals.groupCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {groupBy === "item" ? "Items" : groupBy === "location" ? "Locations" : "Categories"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{valuationData.totals.totalQty.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Qty</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{valuationData.totals.lineCount}</div>
                    <div className="text-xs text-muted-foreground">Location Records</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Report Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Inventory by {groupBy}</CardTitle>
                <CardDescription>
                  Click a row to expand and see location details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {valuationLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : !valuationData?.report.length ? (
                  <p className="text-muted-foreground">No inventory data found.</p>
                ) : (
                  <div className="space-y-1">
                    {valuationData.report.map((item) => (
                      <Collapsible
                        key={item.groupKey}
                        open={expandedGroups.has(item.groupKey)}
                        onOpenChange={() => toggleGroup(item.groupKey)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {expandedGroups.has(item.groupKey) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {getGroupIcon()}
                              <span className="font-medium">{item.groupLabel}</span>
                              <Badge variant="secondary">{item.lineCount} location(s)</Badge>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-right">
                                <div className="font-medium">{item.totalQty.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Total Qty</div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-8 mr-4 mb-4 border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {groupBy !== "item" && <TableHead>Item</TableHead>}
                                  {groupBy !== "location" && <TableHead>Location</TableHead>}
                                  {groupBy !== "category" && <TableHead>Category</TableHead>}
                                  <TableHead className="text-right">Qty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.details?.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    {groupBy !== "item" && (
                                      <TableCell>{detail.itemSku} - {detail.itemName}</TableCell>
                                    )}
                                    {groupBy !== "location" && (
                                      <TableCell>{detail.locationLabel}</TableCell>
                                    )}
                                    {groupBy !== "category" && (
                                      <TableCell>{detail.itemCategory}</TableCell>
                                    )}
                                    <TableCell className="text-right">{detail.qtyBase.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Movement Report */}
          <TabsContent value="movement" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end justify-between">
                  <div className="flex gap-4 items-end">
                    <div className="flex flex-col gap-2">
                      <Label>Event Type</Label>
                      <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {EVENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (movementData?.events) {
                        const exportData = movementData.events.map((e) => ({
                          Date: new Date(e.createdAt).toLocaleString(),
                          Type: e.eventType,
                          Item: `${e.itemSku} - ${e.itemName}`,
                          From: e.fromLocationLabel || "",
                          To: e.toLocationLabel || "",
                          Qty: e.qtyBase,
                          Reference: e.referenceType ? `${e.referenceType}: ${e.referenceId}` : "",
                        }));
                        exportToCsv(exportData, "movement-history.csv");
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {movementData?.summary && (
              <div className="flex gap-4 flex-wrap">
                {Object.entries(movementData.summary).map(([type, count]) => (
                  <Card key={type}>
                    <CardContent className="pt-4 px-6">
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground">{type}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Events Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Movement History</CardTitle>
                <CardDescription>
                  {movementData?.total || 0} event(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movementLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : !movementData?.events.length ? (
                  <p className="text-muted-foreground">No movement events found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementData.events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <ArrowRightLeft className="h-3 w-3" />
                              {event.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{event.itemSku}</div>
                            <div className="text-xs text-muted-foreground">{event.itemName}</div>
                          </TableCell>
                          <TableCell>{event.fromLocationLabel || "-"}</TableCell>
                          <TableCell>{event.toLocationLabel || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {event.qtyBase > 0 ? "+" : ""}{event.qtyBase}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {event.referenceType ? `${event.referenceType}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
