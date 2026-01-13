/**
 * Three-Way Matching System
 *
 * PO → Receipt → Invoice matching for automated AP processing
 * and purchase order compliance
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type MatchStatus = "MATCHED" | "PARTIAL_MATCH" | "MISMATCH" | "PENDING";
export type MatchType = "PRICE" | "QUANTITY" | "ITEM";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "OVERRIDE";

export interface MatchResult {
  purchaseOrderId: string;
  poNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  receiptId?: string;
  receiptNumber?: string;
  overallStatus: MatchStatus;
  lineMatches: LineMatchResult[];
  discrepancies: Discrepancy[];
  totalPoAmount: number;
  totalReceiptAmount: number;
  totalInvoiceAmount: number;
  varianceAmount: number;
  variancePercent: number;
  canAutoApprove: boolean;
  approvalStatus: ApprovalStatus;
}

export interface LineMatchResult {
  poLineId: string;
  receiptLineId?: string;
  invoiceLineId?: string;
  itemSku: string;
  itemName: string;
  poQuantity: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  poUnitPrice: number;
  invoiceUnitPrice: number;
  quantityMatch: boolean;
  priceMatch: boolean;
  overallMatch: boolean;
  variancePercent: number;
}

export interface Discrepancy {
  type: MatchType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  field: string;
  expected: any;
  actual: any;
  variance: number;
  variancePercent: number;
  lineNumber?: number;
  description: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  vendorCode: string;
  invoiceDate: Date;
  dueDate: Date;
  purchaseOrderId?: string;
  lines: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "DRAFT" | "PENDING" | "MATCHED" | "APPROVED" | "PAID" | "DISPUTED";
  matchResult?: MatchResult;
}

export interface InvoiceLine {
  id: string;
  lineNumber: number;
  itemSku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface MatchingPolicy {
  tolerancePercent: number;
  toleranceAmount: number;
  requireReceiptMatch: boolean;
  autoApproveThreshold: number;
  requireApprovalAbove: number;
  allowPartialReceipt: boolean;
  allowPriceVariance: boolean;
  priceVarianceTolerance: number;
}

// ============================================================
// THREE-WAY MATCHING SERVICE
// ============================================================

export class ThreeWayMatchingService {
  private static invoices: Map<string, Invoice> = new Map();

  // Default matching policy
  private static DEFAULT_POLICY: MatchingPolicy = {
    tolerancePercent: 5,
    toleranceAmount: 100,
    requireReceiptMatch: true,
    autoApproveThreshold: 1000,
    requireApprovalAbove: 5000,
    allowPartialReceipt: true,
    allowPriceVariance: true,
    priceVarianceTolerance: 3,
  };

  /**
   * Create invoice
   */
  static createInvoice(invoice: Omit<Invoice, "id" | "status">): Invoice {
    const newInvoice: Invoice = {
      ...invoice,
      id: `INV-${Date.now()}`,
      status: "PENDING",
    };

    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }

  /**
   * Perform three-way match
   */
  static async performMatch(params: {
    tenantId: string;
    purchaseOrderId: string;
    invoiceId?: string;
    policy?: Partial<MatchingPolicy>;
  }): Promise<MatchResult> {
    const { tenantId, purchaseOrderId, invoiceId, policy } = params;

    const effectivePolicy = { ...this.DEFAULT_POLICY, ...policy };

    // Get purchase order
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        lines: { include: { item: true } },
        supplier: true,
        receipts: {
          include: {
            lines: { include: { item: true } },
          },
        },
      },
    });

    if (!po) throw new Error("Purchase order not found");

    // Get invoice if provided
    const invoice = invoiceId ? this.invoices.get(invoiceId) : undefined;

    // Aggregate receipts
    const receiptsByLine = new Map<string, { qty: number; lines: any[] }>();
    for (const receipt of po.receipts) {
      for (const line of receipt.lines) {
        const existing = receiptsByLine.get(line.purchaseOrderLineId) || { qty: 0, lines: [] };
        existing.qty += line.qtyReceived;
        existing.lines.push(line);
        receiptsByLine.set(line.purchaseOrderLineId, existing);
      }
    }

    // Build line matches
    const lineMatches: LineMatchResult[] = [];
    const discrepancies: Discrepancy[] = [];

    let totalPoAmount = 0;
    let totalReceiptAmount = 0;
    let totalInvoiceAmount = 0;

    for (const poLine of po.lines) {
      const receiptData = receiptsByLine.get(poLine.id);
      const receivedQty = receiptData?.qty || 0;

      // Find matching invoice line
      const invoiceLine = invoice?.lines.find(
        (il) => il.itemSku === poLine.item.sku || il.description.includes(poLine.item.name)
      );

      const invoicedQty = invoiceLine?.quantity || 0;
      const invoiceUnitPrice = invoiceLine?.unitPrice || 0;

      // Calculate amounts
      const poLineAmount = poLine.qtyOrdered * poLine.unitPrice;
      const receiptAmount = receivedQty * poLine.unitPrice;
      const invoiceAmount = invoiceLine?.amount || 0;

      totalPoAmount += poLineAmount;
      totalReceiptAmount += receiptAmount;
      totalInvoiceAmount += invoiceAmount;

      // Check quantity match
      const qtyVariancePercent = poLine.qtyOrdered > 0
        ? Math.abs(receivedQty - poLine.qtyOrdered) / poLine.qtyOrdered * 100
        : 0;

      const quantityMatch = effectivePolicy.allowPartialReceipt
        ? receivedQty <= poLine.qtyOrdered
        : receivedQty === poLine.qtyOrdered;

      // Check price match
      const priceVariancePercent = poLine.unitPrice > 0
        ? Math.abs(invoiceUnitPrice - poLine.unitPrice) / poLine.unitPrice * 100
        : 0;

      const priceMatch = effectivePolicy.allowPriceVariance
        ? priceVariancePercent <= effectivePolicy.priceVarianceTolerance
        : invoiceUnitPrice === poLine.unitPrice;

      const overallMatch = quantityMatch && (invoice ? priceMatch : true);

      lineMatches.push({
        poLineId: poLine.id,
        receiptLineId: receiptData?.lines[0]?.id,
        invoiceLineId: invoiceLine?.id,
        itemSku: poLine.item.sku,
        itemName: poLine.item.name,
        poQuantity: poLine.qtyOrdered,
        receivedQuantity: receivedQty,
        invoicedQuantity: invoicedQty,
        poUnitPrice: poLine.unitPrice,
        invoiceUnitPrice,
        quantityMatch,
        priceMatch,
        overallMatch,
        variancePercent: Math.max(qtyVariancePercent, priceVariancePercent),
      });

      // Record discrepancies
      if (!quantityMatch) {
        discrepancies.push({
          type: "QUANTITY",
          severity: receivedQty === 0 ? "HIGH" : qtyVariancePercent > 10 ? "MEDIUM" : "LOW",
          field: "quantity",
          expected: poLine.qtyOrdered,
          actual: receivedQty,
          variance: receivedQty - poLine.qtyOrdered,
          variancePercent: qtyVariancePercent,
          lineNumber: poLine.lineNumber,
          description: `Quantity mismatch: PO ${poLine.qtyOrdered}, Received ${receivedQty}`,
        });
      }

      if (invoice && !priceMatch) {
        discrepancies.push({
          type: "PRICE",
          severity: priceVariancePercent > 10 ? "HIGH" : priceVariancePercent > 5 ? "MEDIUM" : "LOW",
          field: "unitPrice",
          expected: poLine.unitPrice,
          actual: invoiceUnitPrice,
          variance: invoiceUnitPrice - poLine.unitPrice,
          variancePercent: priceVariancePercent,
          lineNumber: poLine.lineNumber,
          description: `Price mismatch: PO $${poLine.unitPrice}, Invoice $${invoiceUnitPrice}`,
        });
      }
    }

    // Calculate overall status
    const allLinesMatch = lineMatches.every((l) => l.overallMatch);
    const someLinesMatch = lineMatches.some((l) => l.overallMatch);

    let overallStatus: MatchStatus;
    if (allLinesMatch && discrepancies.length === 0) {
      overallStatus = "MATCHED";
    } else if (someLinesMatch) {
      overallStatus = "PARTIAL_MATCH";
    } else if (lineMatches.length === 0) {
      overallStatus = "PENDING";
    } else {
      overallStatus = "MISMATCH";
    }

    // Calculate variance
    const varianceAmount = totalInvoiceAmount - totalPoAmount;
    const variancePercent = totalPoAmount > 0
      ? (varianceAmount / totalPoAmount) * 100
      : 0;

    // Determine if can auto-approve
    const canAutoApprove =
      overallStatus === "MATCHED" &&
      totalInvoiceAmount <= effectivePolicy.autoApproveThreshold &&
      Math.abs(variancePercent) <= effectivePolicy.tolerancePercent;

    // Determine approval status
    let approvalStatus: ApprovalStatus = "PENDING";
    if (canAutoApprove) {
      approvalStatus = "APPROVED";
    } else if (overallStatus === "MISMATCH" && discrepancies.some((d) => d.severity === "HIGH")) {
      approvalStatus = "PENDING";
    }

    return {
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      receiptId: po.receipts[0]?.id,
      receiptNumber: po.receipts[0]?.receiptNumber,
      overallStatus,
      lineMatches,
      discrepancies,
      totalPoAmount,
      totalReceiptAmount,
      totalInvoiceAmount,
      varianceAmount,
      variancePercent,
      canAutoApprove,
      approvalStatus,
    };
  }

  /**
   * Approve invoice with override
   */
  static async approveInvoice(params: {
    invoiceId: string;
    userId: string;
    override?: boolean;
    overrideReason?: string;
  }): Promise<Invoice> {
    const { invoiceId, userId, override, overrideReason } = params;

    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    if (override) {
      invoice.status = "APPROVED";
      // Would log override with reason
    } else if (invoice.matchResult?.canAutoApprove) {
      invoice.status = "APPROVED";
    } else {
      throw new Error("Invoice cannot be auto-approved. Use override if authorized.");
    }

    return invoice;
  }

  /**
   * Reject invoice
   */
  static rejectInvoice(params: {
    invoiceId: string;
    userId: string;
    reason: string;
  }): Invoice {
    const invoice = this.invoices.get(params.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    invoice.status = "DISPUTED";
    return invoice;
  }

  /**
   * Get matching summary for tenant
   */
  static async getMatchingSummary(tenantId: string): Promise<{
    totalInvoices: number;
    pendingMatch: number;
    matched: number;
    disputed: number;
    approved: number;
    totalValue: number;
    pendingValue: number;
  }> {
    const invoices = Array.from(this.invoices.values()).filter(
      (i) => i.tenantId === tenantId
    );

    return {
      totalInvoices: invoices.length,
      pendingMatch: invoices.filter((i) => i.status === "PENDING").length,
      matched: invoices.filter((i) => i.status === "MATCHED").length,
      disputed: invoices.filter((i) => i.status === "DISPUTED").length,
      approved: invoices.filter((i) => i.status === "APPROVED" || i.status === "PAID").length,
      totalValue: invoices.reduce((sum, i) => sum + i.total, 0),
      pendingValue: invoices
        .filter((i) => i.status === "PENDING" || i.status === "MATCHED")
        .reduce((sum, i) => sum + i.total, 0),
    };
  }

  /**
   * Auto-match invoices to POs
   */
  static async autoMatch(tenantId: string): Promise<{
    matched: number;
    failed: number;
    results: MatchResult[];
  }> {
    const pendingInvoices = Array.from(this.invoices.values()).filter(
      (i) => i.tenantId === tenantId && i.status === "PENDING" && i.purchaseOrderId
    );

    let matched = 0;
    let failed = 0;
    const results: MatchResult[] = [];

    for (const invoice of pendingInvoices) {
      try {
        const result = await this.performMatch({
          tenantId,
          purchaseOrderId: invoice.purchaseOrderId!,
          invoiceId: invoice.id,
        });

        invoice.matchResult = result;

        if (result.overallStatus === "MATCHED") {
          invoice.status = "MATCHED";
          matched++;
        }

        results.push(result);
      } catch (error) {
        failed++;
      }
    }

    return { matched, failed, results };
  }

  /**
   * Get discrepancy report
   */
  static async getDiscrepancyReport(tenantId: string): Promise<{
    byType: Record<MatchType, number>;
    bySeverity: Record<string, number>;
    topDiscrepancies: Discrepancy[];
    totalVariance: number;
  }> {
    const invoices = Array.from(this.invoices.values()).filter(
      (i) => i.tenantId === tenantId && i.matchResult
    );

    const allDiscrepancies: Discrepancy[] = [];
    let totalVariance = 0;

    for (const invoice of invoices) {
      if (invoice.matchResult) {
        allDiscrepancies.push(...invoice.matchResult.discrepancies);
        totalVariance += Math.abs(invoice.matchResult.varianceAmount);
      }
    }

    const byType: Record<MatchType, number> = {
      PRICE: 0,
      QUANTITY: 0,
      ITEM: 0,
    };

    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const d of allDiscrepancies) {
      byType[d.type]++;
      bySeverity[d.severity]++;
    }

    return {
      byType,
      bySeverity,
      topDiscrepancies: allDiscrepancies
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
        .slice(0, 10),
      totalVariance,
    };
  }

  /**
   * Process receipt and trigger matching
   */
  static async processReceipt(params: {
    tenantId: string;
    purchaseOrderId: string;
    receiptId: string;
  }): Promise<MatchResult | null> {
    // Find any pending invoice for this PO
    const pendingInvoice = Array.from(this.invoices.values()).find(
      (i) =>
        i.tenantId === params.tenantId &&
        i.purchaseOrderId === params.purchaseOrderId &&
        i.status === "PENDING"
    );

    if (pendingInvoice) {
      return this.performMatch({
        tenantId: params.tenantId,
        purchaseOrderId: params.purchaseOrderId,
        invoiceId: pendingInvoice.id,
      });
    }

    // Just do two-way match (PO to Receipt)
    return this.performMatch({
      tenantId: params.tenantId,
      purchaseOrderId: params.purchaseOrderId,
    });
  }

  /**
   * Get invoices needing attention
   */
  static getInvoicesNeedingAttention(tenantId: string): Invoice[] {
    return Array.from(this.invoices.values())
      .filter(
        (i) =>
          i.tenantId === tenantId &&
          (i.status === "PENDING" || i.status === "DISPUTED") &&
          i.matchResult?.discrepancies &&
          i.matchResult.discrepancies.some((d) => d.severity === "HIGH")
      )
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Calculate payment schedule based on matching
   */
  static async calculatePaymentSchedule(tenantId: string): Promise<{
    dueToday: number;
    dueTomorrow: number;
    dueThisWeek: number;
    dueThisMonth: number;
    overdue: number;
    invoices: { invoiceNumber: string; dueDate: Date; amount: number; status: string }[];
  }> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const approvedInvoices = Array.from(this.invoices.values()).filter(
      (i) =>
        i.tenantId === tenantId &&
        (i.status === "APPROVED" || i.status === "MATCHED")
    );

    let dueToday = 0;
    let dueTomorrow = 0;
    let dueThisWeek = 0;
    let dueThisMonth = 0;
    let overdue = 0;

    for (const invoice of approvedInvoices) {
      const dueDate = new Date(invoice.dueDate);

      if (dueDate < now) {
        overdue += invoice.total;
      } else if (dueDate.toDateString() === now.toDateString()) {
        dueToday += invoice.total;
      } else if (dueDate.toDateString() === tomorrow.toDateString()) {
        dueTomorrow += invoice.total;
      } else if (dueDate <= weekEnd) {
        dueThisWeek += invoice.total;
      } else if (dueDate <= monthEnd) {
        dueThisMonth += invoice.total;
      }
    }

    return {
      dueToday,
      dueTomorrow,
      dueThisWeek,
      dueThisMonth,
      overdue,
      invoices: approvedInvoices
        .map((i) => ({
          invoiceNumber: i.invoiceNumber,
          dueDate: i.dueDate,
          amount: i.total,
          status: i.status,
        }))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
    };
  }
}
