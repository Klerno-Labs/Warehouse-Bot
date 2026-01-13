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
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  RefreshCw,
  Search,
  XCircle,
  ArrowRight,
  Calendar,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  purchaseOrderNumber: string;
  receiptNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  matchStatus: "MATCHED" | "DISCREPANCY" | "PENDING" | "APPROVED" | "REJECTED";
  discrepancies: Array<{
    type: string;
    expected: number;
    actual: number;
    difference: number;
  }>;
}

interface MatchingStats {
  pending: number;
  matched: number;
  discrepancies: number;
  approved: number;
  totalValue: number;
}

export default function ThreeWayMatchingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const res = await fetch("/api/matching");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        calculateStats(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(invoiceList: Invoice[]) {
    setStats({
      pending: invoiceList.filter((i) => i.matchStatus === "PENDING").length,
      matched: invoiceList.filter((i) => i.matchStatus === "MATCHED").length,
      discrepancies: invoiceList.filter((i) => i.matchStatus === "DISCREPANCY").length,
      approved: invoiceList.filter((i) => i.matchStatus === "APPROVED").length,
      totalValue: invoiceList.reduce((sum, i) => sum + i.total, 0),
    });
  }

  async function approveInvoice(invoiceId: string, override: boolean = false) {
    try {
      await fetch(`/api/matching/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          overrideDiscrepancies: override,
        }),
      });
      setShowApproveDialog(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error("Failed to approve invoice:", error);
    }
  }

  async function rejectInvoice(invoiceId: string, reason: string) {
    try {
      await fetch(`/api/matching/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          reason,
        }),
      });
      setShowRejectDialog(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error("Failed to reject invoice:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "MATCHED":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Matched
          </Badge>
        );
      case "DISCREPANCY":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Discrepancy
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.purchaseOrderNumber.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && invoice.matchStatus === "PENDING";
    if (activeTab === "discrepancies") return matchesSearch && invoice.matchStatus === "DISCREPANCY";
    if (activeTab === "approved") return matchesSearch && invoice.matchStatus === "APPROVED";
    return matchesSearch;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">3-Way Matching</h1>
          <p className="text-muted-foreground">
            Match purchase orders, receipts, and invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600">Matched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.matched}</div>
            </CardContent>
          </Card>
          <Card className={stats.discrepancies > 0 ? "border-red-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600">Discrepancies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.discrepancies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matching Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>3-Way Matching Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center p-4 bg-muted rounded-lg min-w-[150px]">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Purchase Order</p>
              <p className="text-sm text-muted-foreground">What was ordered</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center p-4 bg-muted rounded-lg min-w-[150px]">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Receipt</p>
              <p className="text-sm text-muted-foreground">What was received</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center p-4 bg-muted rounded-lg min-w-[150px]">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">Invoice</p>
              <p className="text-sm text-muted-foreground">What was billed</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center p-4 bg-green-100 rounded-lg min-w-[150px]">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium text-green-800">Matched</p>
              <p className="text-sm text-green-600">Ready for payment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({stats?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="discrepancies">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Discrepancies ({stats?.discrepancies || 0})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({stats?.approved || 0})
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO #</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{invoice.vendorName}</TableCell>
                        <TableCell className="font-mono">
                          {invoice.purchaseOrderNumber}
                        </TableCell>
                        <TableCell className="font-mono">
                          {invoice.receiptNumber}
                        </TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell>{invoice.dueDate}</TableCell>
                        <TableCell className="text-right font-bold">
                          ${invoice.total.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.matchStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(invoice.matchStatus === "PENDING" ||
                              invoice.matchStatus === "MATCHED") && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowApproveDialog(true);
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            {invoice.matchStatus === "DISCREPANCY" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowApproveDialog(true);
                                  }}
                                >
                                  Override
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading..." : "No invoices found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.matchStatus === "DISCREPANCY"
                ? "This invoice has discrepancies. Override and approve?"
                : "Approve this invoice for payment?"}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">${selectedInvoice.total.toLocaleString()}</p>
                </div>
              </div>

              {selectedInvoice.discrepancies.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Discrepancies Found</h4>
                  {selectedInvoice.discrepancies.map((d, i) => (
                    <div key={i} className="text-sm text-red-600">
                      {d.type}: Expected ${d.expected}, Actual ${d.actual} (Diff: ${d.difference})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                approveInvoice(
                  selectedInvoice!.id,
                  selectedInvoice?.matchStatus === "DISCREPANCY"
                )
              }
            >
              {selectedInvoice?.matchStatus === "DISCREPANCY"
                ? "Override & Approve"
                : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this invoice
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason</Label>
            <Textarea
              placeholder="Enter rejection reason..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectInvoice(selectedInvoice!.id, "Discrepancy not resolved")}
            >
              Reject Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
