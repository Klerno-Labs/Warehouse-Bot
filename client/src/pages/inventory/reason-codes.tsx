import { useMemo, useState } from "react";
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
import { REASON_TYPES, type ReasonCode } from "@shared/inventory";

export default function InventoryReasonCodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reasons = [] } = useQuery<ReasonCode[]>({
    queryKey: ["/api/inventory/reason-codes"],
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<ReasonCode["type"]>(REASON_TYPES[0]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  // Filter reasons
  const filteredReasons = useMemo(() => {
    return reasons.filter((reason) => {
      const matchesSearch = 
        reason.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reason.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || reason.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [reasons, searchTerm, typeFilter]);

  const resetForm = () => {
    setEditingId(null);
    setType(REASON_TYPES[0]);
    setCode("");
    setDescription("");
  };

  const submit = async () => {
    const payload = { type, code, description };
    try {
      if (editingId) {
        await apiRequest("PATCH", `/api/inventory/reason-codes/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/inventory/reason-codes", payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/reason-codes"] });
      resetForm();
      toast({ title: "Reason code saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const startEdit = (reason: ReasonCode) => {
    setEditingId(reason.id);
    setType(reason.type);
    setCode(reason.code);
    setDescription(reason.description || "");
  };

  return (
    <div className="flex h-full flex-col">
      <InventoryNav />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reason Codes</h1>
          <p className="text-sm text-muted-foreground">
            Reason codes for scrap, adjust, and hold events.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {editingId ? "Edit Reason Code" : "Add Reason Code"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as ReasonCode["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_TYPES.map((reasonType) => (
                    <SelectItem key={reasonType} value={reasonType}>
                      {reasonType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button onClick={submit}>{editingId ? "Update Reason" : "Add Reason"}</Button>
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
              <CardTitle className="text-sm font-medium">
                Reason Code List ({filteredReasons.length} of {reasons.length})
              </CardTitle>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {REASON_TYPES.map((reasonType) => (
                    <SelectItem key={reasonType} value={reasonType}>
                      {reasonType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReasons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No reason codes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReasons.map((reason) => (
                      <TableRow key={reason.id}>
                        <TableCell className="font-medium">{reason.type}</TableCell>
                        <TableCell>{reason.code}</TableCell>
                        <TableCell>{reason.description || "-"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => startEdit(reason)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
