/**
 * Advanced Reporting System
 *
 * Custom report builder, scheduled reports, and email distribution
 * for enterprise-grade business intelligence
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type ReportType =
  | "INVENTORY_VALUATION"
  | "INVENTORY_AGING"
  | "INVENTORY_TURNOVER"
  | "STOCK_STATUS"
  | "PURCHASE_ANALYSIS"
  | "SALES_ANALYSIS"
  | "VENDOR_PERFORMANCE"
  | "ABC_ANALYSIS"
  | "DEAD_STOCK"
  | "REORDER_REPORT"
  | "PRODUCTION_ANALYSIS"
  | "CYCLE_COUNT_ACCURACY"
  | "CUSTOM";

export type ReportFormat = "PDF" | "EXCEL" | "CSV" | "JSON";
export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  config: ReportConfig;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportConfig {
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: { field: string; direction: "ASC" | "DESC" }[];
  aggregations?: ReportAggregation[];
  charts?: ReportChart[];
  dateRange?: {
    type: "FIXED" | "RELATIVE";
    start?: Date;
    end?: Date;
    relativeDays?: number;
  };
}

export interface ReportColumn {
  field: string;
  label: string;
  type: "STRING" | "NUMBER" | "DATE" | "CURRENCY" | "PERCENTAGE";
  format?: string;
  width?: number;
  visible: boolean;
  sortable?: boolean;
}

export interface ReportFilter {
  field: string;
  operator: "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "IN" | "BETWEEN";
  value: any;
}

export interface ReportAggregation {
  field: string;
  function: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "COUNT_DISTINCT";
  label: string;
}

export interface ReportChart {
  type: "BAR" | "LINE" | "PIE" | "AREA" | "SCATTER";
  title: string;
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm
  format: ReportFormat;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  startedAt: Date;
  completedAt?: Date;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  rowCount?: number;
  fileUrl?: string;
  error?: string;
}

export interface ReportResult {
  reportId: string;
  reportName: string;
  generatedAt: Date;
  parameters: any;
  summary: {
    totalRows: number;
    aggregations: Record<string, number>;
  };
  columns: ReportColumn[];
  data: any[];
  charts?: any[];
}

// ============================================================
// REPORT BUILDER SERVICE
// ============================================================

export class ReportBuilderService {
  private static reports: Map<string, ReportDefinition> = new Map();
  private static schedules: Map<string, ReportSchedule> = new Map();

  /**
   * Create a new report definition
   */
  static createReport(report: Omit<ReportDefinition, "id" | "createdAt" | "updatedAt">): ReportDefinition {
    const newReport: ReportDefinition = {
      ...report,
      id: `RPT-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reports.set(newReport.id, newReport);
    return newReport;
  }

  /**
   * Get report definitions for tenant
   */
  static getReports(tenantId: string, userId?: string): ReportDefinition[] {
    return Array.from(this.reports.values()).filter(
      (r) => r.tenantId === tenantId && (r.isPublic || r.createdBy === userId)
    );
  }

  /**
   * Execute a report
   */
  static async executeReport(params: {
    reportId: string;
    tenantId: string;
    parameters?: Record<string, any>;
  }): Promise<ReportResult> {
    const report = this.reports.get(params.reportId);
    if (!report) throw new Error("Report not found");

    const startTime = Date.now();

    // Get data based on report type
    let data: any[];
    let aggregations: Record<string, number> = {};

    switch (report.type) {
      case "INVENTORY_VALUATION":
        data = await this.getInventoryValuationData(params.tenantId, report.config);
        break;
      case "INVENTORY_AGING":
        data = await this.getInventoryAgingData(params.tenantId, report.config);
        break;
      case "ABC_ANALYSIS":
        data = await this.getABCAnalysisData(params.tenantId, report.config);
        break;
      case "STOCK_STATUS":
        data = await this.getStockStatusData(params.tenantId, report.config);
        break;
      case "VENDOR_PERFORMANCE":
        data = await this.getVendorPerformanceData(params.tenantId, report.config);
        break;
      case "SALES_ANALYSIS":
        data = await this.getSalesAnalysisData(params.tenantId, report.config);
        break;
      case "PURCHASE_ANALYSIS":
        data = await this.getPurchaseAnalysisData(params.tenantId, report.config);
        break;
      case "DEAD_STOCK":
        data = await this.getDeadStockData(params.tenantId, report.config);
        break;
      case "REORDER_REPORT":
        data = await this.getReorderData(params.tenantId, report.config);
        break;
      default:
        data = [];
    }

    // Apply filters
    data = this.applyFilters(data, report.config.filters);

    // Apply sorting
    if (report.config.sortBy) {
      data = this.applySorting(data, report.config.sortBy);
    }

    // Calculate aggregations
    if (report.config.aggregations) {
      aggregations = this.calculateAggregations(data, report.config.aggregations);
    }

    return {
      reportId: report.id,
      reportName: report.name,
      generatedAt: new Date(),
      parameters: params.parameters,
      summary: {
        totalRows: data.length,
        aggregations,
      },
      columns: report.config.columns,
      data,
    };
  }

  /**
   * Get inventory valuation data
   */
  private static async getInventoryValuationData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: true,
      },
    });

    return items.map((item) => {
      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const totalValue = totalQty * (item.costBase || 0);

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: totalQty,
        unitCost: item.costBase || 0,
        totalValue,
        reorderPoint: item.reorderPointBase || 0,
      };
    });
  }

  /**
   * Get inventory aging data
   */
  private static async getInventoryAgingData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: true,
      },
    });

    const now = new Date();
    const results: any[] = [];

    for (const item of items) {
      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      if (totalQty <= 0) continue;

      // Get oldest receipt
      const oldestReceipt = await prisma.inventoryEvent.findFirst({
        where: {
          itemId: item.id,
          eventType: "RECEIVE",
        },
        orderBy: { createdAt: "asc" },
      });

      const ageInDays = oldestReceipt
        ? Math.floor((now.getTime() - oldestReceipt.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let ageBucket: string;
      if (ageInDays <= 30) ageBucket = "0-30 days";
      else if (ageInDays <= 60) ageBucket = "31-60 days";
      else if (ageInDays <= 90) ageBucket = "61-90 days";
      else if (ageInDays <= 180) ageBucket = "91-180 days";
      else ageBucket = ">180 days";

      results.push({
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: totalQty,
        totalValue: totalQty * (item.costBase || 0),
        ageInDays,
        ageBucket,
        oldestReceiptDate: oldestReceipt?.createdAt,
      });
    }

    return results;
  }

  /**
   * Get ABC analysis data
   */
  private static async getABCAnalysisData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: true,
      },
    });

    const itemData: any[] = [];

    for (const item of items) {
      const movements = await prisma.inventoryEvent.count({
        where: {
          itemId: item.id,
          createdAt: { gte: thirtyDaysAgo },
          eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        },
      });

      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const value = totalQty * (item.costBase || 0);

      itemData.push({
        sku: item.sku,
        name: item.name,
        category: item.category,
        movements,
        quantity: totalQty,
        value,
      });
    }

    // Sort by value descending
    itemData.sort((a, b) => b.value - a.value);

    // Calculate cumulative percentage and assign class
    const totalValue = itemData.reduce((sum, i) => sum + i.value, 0);
    let cumulativeValue = 0;

    return itemData.map((item) => {
      cumulativeValue += item.value;
      const cumulativePercent = (cumulativeValue / totalValue) * 100;

      let abcClass: string;
      if (cumulativePercent <= 80) abcClass = "A";
      else if (cumulativePercent <= 95) abcClass = "B";
      else abcClass = "C";

      return {
        ...item,
        valuePercent: (item.value / totalValue) * 100,
        cumulativePercent,
        abcClass,
      };
    });
  }

  /**
   * Get stock status data
   */
  private static async getStockStatusData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: {
          include: { location: true },
        },
      },
    });

    return items.map((item) => {
      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const reorderPoint = item.reorderPointBase || 0;
      const minQty = item.minQtyBase || 0;
      const maxQty = item.maxQtyBase || 0;

      let status: string;
      if (totalQty <= 0) status = "OUT_OF_STOCK";
      else if (totalQty <= reorderPoint) status = "LOW_STOCK";
      else if (maxQty > 0 && totalQty > maxQty) status = "OVERSTOCK";
      else status = "ADEQUATE";

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: totalQty,
        reorderPoint,
        minQty,
        maxQty,
        status,
        locations: item.balances.filter((b) => b.qtyBase > 0).map((b) => b.location.label),
      };
    });
  }

  /**
   * Get vendor performance data
   */
  private static async getVendorPerformanceData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        purchaseOrders: {
          where: {
            status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
          },
          include: {
            lines: true,
          },
        },
      },
    });

    return suppliers.map((supplier) => {
      const totalOrders = supplier.purchaseOrders.length;
      const totalLines = supplier.purchaseOrders.reduce((sum, po) => sum + po.lines.length, 0);
      const totalSpend = supplier.purchaseOrders.reduce((sum, po) => sum + po.total, 0);

      // Calculate on-time delivery (simplified)
      const onTimeOrders = supplier.purchaseOrders.filter((po) => {
        if (!po.expectedDelivery) return true;
        // Would need actual receipt date for accurate calculation
        return true;
      }).length;

      const onTimeRate = totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0;

      return {
        supplierCode: supplier.code,
        supplierName: supplier.name,
        totalOrders,
        totalLines,
        totalSpend,
        averageOrderValue: totalOrders > 0 ? totalSpend / totalOrders : 0,
        onTimeRate,
        leadTimeDays: supplier.leadTimeDays || 0,
      };
    });
  }

  /**
   * Get sales analysis data
   */
  private static async getSalesAnalysisData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        tenantId,
        orderDate: { gte: thirtyDaysAgo },
      },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    });

    return salesOrders.map((order) => ({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerCode: order.customer.code,
      customerName: order.customer.name,
      status: order.status,
      lineCount: order.lines.length,
      totalQuantity: order.lines.reduce((sum, l) => sum + l.qtyOrdered, 0),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      total: order.total,
    }));
  }

  /**
   * Get purchase analysis data
   */
  private static async getPurchaseAnalysisData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        orderDate: { gte: thirtyDaysAgo },
      },
      include: {
        supplier: true,
        lines: { include: { item: true } },
      },
    });

    return purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      supplierCode: po.supplier.code,
      supplierName: po.supplier.name,
      status: po.status,
      lineCount: po.lines.length,
      totalQuantity: po.lines.reduce((sum, l) => sum + l.qtyOrdered, 0),
      subtotal: po.subtotal,
      total: po.total,
      expectedDelivery: po.expectedDelivery,
    }));
  }

  /**
   * Get dead stock data
   */
  private static async getDeadStockData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const inactiveDays = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: true,
      },
    });

    const deadStock: any[] = [];

    for (const item of items) {
      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      if (totalQty <= 0) continue;

      const lastMovement = await prisma.inventoryEvent.findFirst({
        where: {
          itemId: item.id,
          eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!lastMovement || lastMovement.createdAt < cutoffDate) {
        const daysSinceLastMovement = lastMovement
          ? Math.floor((Date.now() - lastMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 9999;

        deadStock.push({
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: totalQty,
          value: totalQty * (item.costBase || 0),
          lastMovementDate: lastMovement?.createdAt,
          daysSinceLastMovement,
        });
      }
    }

    return deadStock;
  }

  /**
   * Get reorder data
   */
  private static async getReorderData(
    tenantId: string,
    config: ReportConfig
  ): Promise<any[]> {
    const items = await prisma.item.findMany({
      where: {
        tenantId,
        reorderPointBase: { not: null },
      },
      include: {
        balances: true,
      },
    });

    return items
      .map((item) => {
        const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
        const reorderPoint = item.reorderPointBase || 0;

        if (totalQty > reorderPoint) return null;

        const suggestedOrderQty = Math.max(0, reorderPoint * 2 - totalQty);

        return {
          sku: item.sku,
          name: item.name,
          category: item.category,
          currentStock: totalQty,
          reorderPoint,
          suggestedOrderQty,
          estimatedCost: suggestedOrderQty * (item.costBase || 0),
          leadTimeDays: item.leadTimeDays || 7,
          priority: totalQty <= 0 ? "CRITICAL" : totalQty <= reorderPoint / 2 ? "HIGH" : "MEDIUM",
        };
      })
      .filter(Boolean);
  }

  /**
   * Apply filters to data
   */
  private static applyFilters(data: any[], filters: ReportFilter[]): any[] {
    return data.filter((row) => {
      for (const filter of filters) {
        const value = row[filter.field];

        switch (filter.operator) {
          case "EQ":
            if (value !== filter.value) return false;
            break;
          case "NE":
            if (value === filter.value) return false;
            break;
          case "GT":
            if (value <= filter.value) return false;
            break;
          case "GTE":
            if (value < filter.value) return false;
            break;
          case "LT":
            if (value >= filter.value) return false;
            break;
          case "LTE":
            if (value > filter.value) return false;
            break;
          case "CONTAINS":
            if (!String(value).toLowerCase().includes(String(filter.value).toLowerCase())) return false;
            break;
          case "IN":
            if (!Array.isArray(filter.value) || !filter.value.includes(value)) return false;
            break;
          case "BETWEEN":
            if (!Array.isArray(filter.value) || value < filter.value[0] || value > filter.value[1]) return false;
            break;
        }
      }
      return true;
    });
  }

  /**
   * Apply sorting to data
   */
  private static applySorting(
    data: any[],
    sortBy: { field: string; direction: "ASC" | "DESC" }[]
  ): any[] {
    return data.sort((a, b) => {
      for (const sort of sortBy) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        if (aVal === bVal) continue;

        const comparison = aVal < bVal ? -1 : 1;
        return sort.direction === "ASC" ? comparison : -comparison;
      }
      return 0;
    });
  }

  /**
   * Calculate aggregations
   */
  private static calculateAggregations(
    data: any[],
    aggregations: ReportAggregation[]
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const agg of aggregations) {
      const values = data.map((row) => row[agg.field]).filter((v) => typeof v === "number");

      switch (agg.function) {
        case "SUM":
          result[agg.label] = values.reduce((sum, v) => sum + v, 0);
          break;
        case "AVG":
          result[agg.label] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        case "MIN":
          result[agg.label] = values.length > 0 ? Math.min(...values) : 0;
          break;
        case "MAX":
          result[agg.label] = values.length > 0 ? Math.max(...values) : 0;
          break;
        case "COUNT":
          result[agg.label] = data.length;
          break;
        case "COUNT_DISTINCT":
          result[agg.label] = new Set(data.map((row) => row[agg.field])).size;
          break;
      }
    }

    return result;
  }

  /**
   * Schedule a report
   */
  static scheduleReport(schedule: Omit<ReportSchedule, "id" | "nextRunAt">): ReportSchedule {
    const newSchedule: ReportSchedule = {
      ...schedule,
      id: `SCHED-${Date.now()}`,
      nextRunAt: this.calculateNextRun(schedule),
    };

    this.schedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  /**
   * Calculate next run time
   */
  private static calculateNextRun(schedule: Omit<ReportSchedule, "id" | "nextRunAt">): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(":").map(Number);

    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (schedule.frequency) {
      case "WEEKLY":
        while (next.getDay() !== schedule.dayOfWeek) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case "MONTHLY":
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      case "QUARTERLY":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
        next.setMonth(quarterMonth);
        next.setDate(1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 3);
        }
        break;
    }

    return next;
  }

  /**
   * Export report to format
   */
  static async exportReport(
    result: ReportResult,
    format: ReportFormat
  ): Promise<{ content: string; mimeType: string; filename: string }> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeReportName = result.reportName.replace(/[^a-zA-Z0-9]/g, "_");

    switch (format) {
      case "CSV":
        return {
          content: this.toCSV(result),
          mimeType: "text/csv",
          filename: `${safeReportName}_${timestamp}.csv`,
        };
      case "JSON":
        return {
          content: JSON.stringify(result, null, 2),
          mimeType: "application/json",
          filename: `${safeReportName}_${timestamp}.json`,
        };
      case "EXCEL":
        // Would use a library like exceljs in production
        return {
          content: this.toCSV(result),
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          filename: `${safeReportName}_${timestamp}.xlsx`,
        };
      case "PDF":
        // Would use a library like pdfkit in production
        return {
          content: this.toCSV(result),
          mimeType: "application/pdf",
          filename: `${safeReportName}_${timestamp}.pdf`,
        };
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert to CSV
   */
  private static toCSV(result: ReportResult): string {
    const headers = result.columns.filter((c) => c.visible).map((c) => c.label);
    const fields = result.columns.filter((c) => c.visible).map((c) => c.field);

    const rows = result.data.map((row) =>
      fields.map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }
}
