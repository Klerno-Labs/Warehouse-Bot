import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

export const dynamic = "force-dynamic";

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
        const excelXML = generateExcelXML(data, headers, filename, type);
        return new NextResponse(excelXML, {
          headers: {
            "Content-Type": "application/vnd.ms-excel",
            "Content-Disposition": `attachment; filename="${filename}.xls"`,
          },
        });

      case "pdf":
        const pdfBuffer = generatePDF(data, headers, filename, type);
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}.pdf"`,
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

// Helper function to generate Excel XML (SpreadsheetML format)
function generateExcelXML(data: any[], headers: string[], filename: string, reportType: string): string {
  const escapeXML = (str: string) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const isNumeric = (value: any): boolean => {
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "number") return true;
    if (typeof value === "string") {
      return !isNaN(parseFloat(value)) && isFinite(Number(value));
    }
    return false;
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:Bold="1" ss:Size="14"/>
    </Style>
    <Style ss:ID="Date">
      <NumberFormat ss:Format="yyyy-mm-dd"/>
    </Style>
    <Style ss:ID="Currency">
      <NumberFormat ss:Format="$#,##0.00"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXML(reportType.charAt(0).toUpperCase() + reportType.slice(1))} Report">
    <Table>
`;

  // Add title row
  xml += `      <Row>
        <Cell ss:StyleID="Title"><Data ss:Type="String">${escapeXML(filename.replace(/-/g, ' ').toUpperCase())}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Generated: ${new Date().toLocaleString()}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Records: ${data.length}</Data></Cell>
      </Row>
      <Row></Row>
`;

  // Add header row
  xml += '      <Row>\n';
  for (const header of headers) {
    xml += `        <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(header)}</Data></Cell>\n`;
  }
  xml += '      </Row>\n';

  // Add data rows
  for (const row of data) {
    xml += '      <Row>\n';
    for (const header of headers) {
      const value = row[header];
      if (value === null || value === undefined || value === "") {
        xml += `        <Cell><Data ss:Type="String"></Data></Cell>\n`;
      } else if (isNumeric(value)) {
        const isCurrency = header.toLowerCase().includes('cost') ||
                          header.toLowerCase().includes('value') ||
                          header.toLowerCase().includes('price') ||
                          header.toLowerCase().includes('total');
        const styleAttr = isCurrency ? ' ss:StyleID="Currency"' : '';
        xml += `        <Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>\n`;
      } else {
        xml += `        <Cell><Data ss:Type="String">${escapeXML(String(value))}</Data></Cell>\n`;
      }
    }
    xml += '      </Row>\n';
  }

  xml += `    </Table>
  </Worksheet>
</Workbook>`;

  return xml;
}

// Helper function to generate PDF
function generatePDF(data: any[], headers: string[], filename: string, reportType: string): Buffer {
  // Generate a simple text-based PDF
  // PDF 1.4 specification - minimal implementation
  const title = filename.replace(/-/g, ' ').toUpperCase();
  const generatedDate = new Date().toLocaleString();

  // Build content lines
  const contentLines: string[] = [];
  contentLines.push(title);
  contentLines.push('');
  contentLines.push(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`);
  contentLines.push(`Generated: ${generatedDate}`);
  contentLines.push(`Total Records: ${data.length}`);
  contentLines.push('');
  contentLines.push('=' .repeat(80));
  contentLines.push('');

  // Add headers
  contentLines.push(headers.join(' | '));
  contentLines.push('-'.repeat(80));

  // Add data (limit to prevent huge PDFs)
  const maxRows = Math.min(data.length, 500);
  for (let i = 0; i < maxRows; i++) {
    const row = data[i];
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      return String(val).substring(0, 30); // Truncate long values
    });
    contentLines.push(values.join(' | '));
  }

  if (data.length > maxRows) {
    contentLines.push('');
    contentLines.push(`... and ${data.length - maxRows} more records (showing first ${maxRows})`);
  }

  const content = contentLines.join('\n');

  // Build PDF structure
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  // Helper to add object
  const addObject = (content: string): number => {
    objectCount++;
    offsets.push(objects.join('').length);
    objects.push(`${objectCount} 0 obj\n${content}\nendobj\n`);
    return objectCount;
  };

  // Object 1: Catalog
  addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Object 2: Pages
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');

  // Object 3: Page
  addObject('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');

  // Object 4: Content stream
  const escapePdfString = (str: string) => str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // Build text content
  let streamContent = 'BT\n/F1 10 Tf\n';
  let y = 750;
  const lineHeight = 12;
  const margin = 50;

  for (const line of contentLines) {
    if (y < 50) break; // Stop if we run out of page space
    streamContent += `${margin} ${y} Td\n(${escapePdfString(line.substring(0, 100))}) Tj\n`;
    streamContent += `-${margin} -${lineHeight} Td\n`;
    y -= lineHeight;
  }
  streamContent += 'ET';

  addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);

  // Object 5: Font
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  // Build final PDF
  let pdf = '%PDF-1.4\n';
  pdf += objects.join('');

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';

  let currentOffset = 9; // After %PDF-1.4\n
  for (let i = 0; i < objectCount; i++) {
    pdf += String(currentOffset).padStart(10, '0') + ' 00000 n \n';
    currentOffset += objects[i].length;
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';

  return Buffer.from(pdf, 'utf-8');
}
