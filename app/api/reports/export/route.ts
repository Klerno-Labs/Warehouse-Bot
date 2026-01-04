import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

/**
 * Universal Export API
 *
 * Supports exporting various data types to multiple formats:
 * - CSV (Excel-compatible)
 * - Excel (.xlsx)
 * - PDF
 *
 * Query params:
 * - type: inventory|jobs|cycle-counts|production-orders|analytics
 * - format: csv|excel|pdf
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - siteId: optional site filter
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "inventory";
    const format = searchParams.get("format") || "csv";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const siteId = searchParams.get("siteId");

    // Build date range filter
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    let data: any[] = [];
    let filename = "";
    let headers: string[] = [];

    // Fetch data based on type
    switch (type) {
      case "inventory":
        const items = await prisma.item.findMany({
          where: { tenantId: context.user.tenantId },
          include: {
            balances: {
              where: siteId ? { siteId } : {},
              include: { location: true, site: true },
            },
          },
        });

        data = items.flatMap(item =>
          item.balances.map(balance => ({
            SKU: item.sku,
            Name: item.name,
            Category: item.category,
            Site: balance.site.name,
            Location: balance.location.label,
            "Qty on Hand": balance.qtyBase,
            UOM: item.baseUom,
            "Unit Cost": item.costBase,
            "Total Value": (balance.qtyBase * (item.costBase || 0)).toFixed(2),
            "Reorder Point": item.reorderPointBase || "N/A",
          }))
        );

        headers = ["SKU", "Name", "Category", "Site", "Location", "Qty on Hand", "UOM", "Unit Cost", "Total Value", "Reorder Point"];
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case "jobs":
        const jobs = await prisma.job.findMany({
          where: {
            tenantId: context.user.tenantId,
            ...(siteId && { siteId }),
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
          include: {
            site: true,
            assignedTo: true,
            lines: { include: { item: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        data = jobs.map(job => ({
          "Job Number": job.jobNumber,
          Site: job.site.name,
          Type: job.type || "N/A",
          Status: job.status,
          "Assigned To": job.assignedTo ? `${job.assignedTo.firstName} ${job.assignedTo.lastName}` : "Unassigned",
          "Created Date": job.createdAt.toISOString().split('T')[0],
          "Scheduled Date": job.scheduledDate ? job.scheduledDate.toISOString().split('T')[0] : "N/A",
          "Started At": job.startedAt ? job.startedAt.toISOString().split('T')[0] : "N/A",
          "Completed At": job.completedAt ? job.completedAt.toISOString().split('T')[0] : "N/A",
          "Line Items": job.lines.length,
        }));

        headers = ["Job Number", "Site", "Type", "Status", "Assigned To", "Created Date", "Scheduled Date", "Started At", "Completed At", "Line Items"];
        filename = `jobs-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case "cycle-counts":
        const cycleCounts = await prisma.cycleCount.findMany({
          where: {
            tenantId: context.user.tenantId,
            ...(siteId && { siteId }),
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
          include: {
            site: true,
            assignedTo: true,
            lines: { include: { item: true, location: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        data = cycleCounts.flatMap(cc =>
          cc.lines.map(line => ({
            "Count ID": cc.name,
            Site: cc.site.name,
            Type: cc.type,
            Status: cc.status,
            "Scheduled Date": cc.scheduledDate.toISOString().split('T')[0],
            Item: line.item.name,
            SKU: line.item.sku,
            Location: line.location.label,
            "Expected Qty": line.expectedQtyBase,
            "Counted Qty": line.countedQtyBase || "N/A",
            Variance: line.varianceQtyBase || "N/A",
            "Line Status": line.status,
          }))
        );

        headers = ["Count ID", "Site", "Type", "Status", "Scheduled Date", "Item", "SKU", "Location", "Expected Qty", "Counted Qty", "Variance", "Line Status"];
        filename = `cycle-counts-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case "production-orders":
        const productionOrders = await prisma.productionOrder.findMany({
          where: {
            tenantId: context.user.tenantId,
            ...(siteId && { siteId }),
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
          include: {
            site: true,
            item: true,
            bom: true,
            jobOperations: true,
          },
          orderBy: { createdAt: "desc" },
        });

        data = productionOrders.map(po => ({
          "Order Number": po.orderNumber,
          Site: po.site.name,
          Item: po.item.name,
          "Qty Ordered": po.qtyOrdered,
          "Qty Completed": po.qtyCompleted,
          "Qty Rejected": po.qtyRejected,
          Status: po.status,
          Priority: po.priority,
          "Scheduled Start": po.scheduledStart.toISOString().split('T')[0],
          "Actual Start": po.actualStart ? po.actualStart.toISOString().split('T')[0] : "N/A",
          "Actual End": po.actualEnd ? po.actualEnd.toISOString().split('T')[0] : "N/A",
          "Operations": po.jobOperations.length,
          "Operations Complete": po.jobOperations.filter(op => op.status === "COMPLETED").length,
        }));

        headers = ["Order Number", "Site", "Item", "Qty Ordered", "Qty Completed", "Qty Rejected", "Status", "Priority", "Scheduled Start", "Actual Start", "Actual End", "Operations", "Operations Complete"];
        filename = `production-orders-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case "analytics":
        const events = await prisma.inventoryEvent.findMany({
          where: {
            tenantId: context.user.tenantId,
            ...(siteId && { siteId }),
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
          include: {
            item: true,
            fromLocation: true,
            toLocation: true,
            site: true,
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5000, // Limit to prevent huge files
        });

        data = events.map(event => ({
          Date: event.createdAt.toISOString().split('T')[0],
          Time: event.createdAt.toISOString().split('T')[1].split('.')[0],
          Type: event.eventType,
          Item: event.item.name,
          SKU: event.item.sku,
          "From Location": event.fromLocation?.label || "N/A",
          "To Location": event.toLocation?.label || "N/A",
          Site: event.site.name,
          Quantity: event.qtyBase,
          UOM: event.item.baseUom,
          "Performed By": event.createdBy ? `${event.createdBy.firstName} ${event.createdBy.lastName}` : "System",
          Reference: event.referenceId || "N/A",
          Notes: event.notes || "",
        }));

        headers = ["Date", "Time", "Type", "Item", "SKU", "Location", "Site", "Quantity", "UOM", "Performed By", "Reference", "Notes"];
        filename = `analytics-report-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Generate export based on format
    switch (format) {
      case "csv":
        const csv = generateCSV(data, headers);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
          },
        });

      case "excel":
        // For now, use CSV format compatible with Excel
        // TODO: Implement true .xlsx format using a library like exceljs
        const excelCSV = generateCSV(data, headers);
        return new NextResponse(excelCSV, {
          headers: {
            "Content-Type": "application/vnd.ms-excel",
            "Content-Disposition": `attachment; filename="${filename}.xls"`,
          },
        });

      case "pdf":
        // For now, return JSON with data - frontend can use jsPDF
        // TODO: Implement server-side PDF generation using puppeteer or pdfkit
        return NextResponse.json({
          data,
          headers,
          filename,
          meta: {
            reportType: type,
            generatedAt: new Date().toISOString(),
            recordCount: data.length,
            filters: { dateFrom, dateTo, siteId },
          },
        });

      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper function to generate CSV
function generateCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    rows.push(values.join(","));
  }

  return rows.join("\n");
}
