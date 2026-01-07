/**
 * PDF Document Generation Service
 * 
 * Server-side PDF generation for:
 * - Sales Orders / Order Confirmations
 * - Invoices
 * - Packing Slips
 * - Purchase Orders
 * - Pick Lists
 * - Cycle Count Sheets
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Company info (could be tenant-configurable)
const COMPANY_INFO = {
  name: "Acme Warehouse",
  address: "123 Industrial Pkwy",
  city: "City, ST 12345",
  phone: "(555) 123-4567",
  email: "orders@acmewarehouse.com",
  website: "www.acmewarehouse.com",
};

// Color scheme (slate-900)
const PRIMARY_COLOR: [number, number, number] = [15, 23, 42];
const SECONDARY_COLOR: [number, number, number] = [71, 85, 105];
const ACCENT_COLOR: [number, number, number] = [59, 130, 246];

export interface Address {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface LineItem {
  sku?: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice?: number;
  total?: number;
  location?: string;
}

// ============================================================================
// SALES ORDER / ORDER CONFIRMATION PDF
// ============================================================================

export interface SalesOrderPDFData {
  orderNumber: string;
  orderDate: Date;
  requestedDate?: Date;
  promisedDate?: Date;
  status: string;
  customerPO?: string;
  customer: {
    name: string;
    code: string;
    email?: string;
    phone?: string;
  };
  billTo: Address;
  shipTo: Address;
  lines: LineItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  notes?: string;
  createdBy?: string;
}

export function generateSalesOrderPDF(data: SalesOrderPDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("SALES ORDER", 14, 25);
  
  // Company Info (right side)
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(COMPANY_INFO.name, 200, 15, { align: "right" });
  doc.text(COMPANY_INFO.address, 200, 20, { align: "right" });
  doc.text(COMPANY_INFO.city, 200, 25, { align: "right" });
  doc.text(COMPANY_INFO.phone, 200, 30, { align: "right" });
  
  // Order Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 25, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`Order #: ${data.orderNumber}`, 20, 43);
  doc.text(`Date: ${formatDate(data.orderDate)}`, 20, 50);
  doc.text(`Status: ${data.status}`, 80, 43);
  if (data.customerPO) {
    doc.text(`Customer PO: ${data.customerPO}`, 80, 50);
  }
  if (data.requestedDate) {
    doc.text(`Requested: ${formatDate(data.requestedDate)}`, 140, 43);
  }
  if (data.promisedDate) {
    doc.text(`Promised: ${formatDate(data.promisedDate)}`, 140, 50);
  }
  
  // Customer & Addresses
  let yPos = 70;
  
  // Bill To
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("BILL TO:", 14, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  doc.text(data.customer.name, 14, yPos);
  yPos += 4;
  if (data.billTo.address1) {
    doc.text(data.billTo.address1, 14, yPos);
    yPos += 4;
  }
  if (data.billTo.city) {
    doc.text(`${data.billTo.city}, ${data.billTo.state} ${data.billTo.zip}`, 14, yPos);
    yPos += 4;
  }
  if (data.customer.email) {
    doc.text(data.customer.email, 14, yPos);
  }
  
  // Ship To
  yPos = 70;
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("SHIP TO:", 110, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  if (data.shipTo.name) doc.text(data.shipTo.name, 110, yPos);
  yPos += 4;
  if (data.shipTo.address1) {
    doc.text(data.shipTo.address1, 110, yPos);
    yPos += 4;
  }
  if (data.shipTo.city) {
    doc.text(`${data.shipTo.city}, ${data.shipTo.state} ${data.shipTo.zip}`, 110, yPos);
  }
  
  // Line Items Table
  autoTable(doc, {
    startY: 105,
    head: [["SKU", "Description", "Qty", "UOM", "Unit Price", "Total"]],
    body: data.lines.map((line) => [
      line.sku || "",
      line.description,
      line.qty.toString(),
      line.uom,
      line.unitPrice ? formatCurrency(line.unitPrice) : "",
      line.total ? formatCurrency(line.total) : "",
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 15 },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
    },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, finalY);
  doc.text(formatCurrency(data.subtotal), 196, finalY, { align: "right" });
  
  doc.text("Tax:", 140, finalY + 6);
  doc.text(formatCurrency(data.taxAmount), 196, finalY + 6, { align: "right" });
  
  doc.text("Shipping:", 140, finalY + 12);
  doc.text(formatCurrency(data.shippingAmount), 196, finalY + 12, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + 22);
  doc.text(formatCurrency(data.total), 196, finalY + 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  
  // Notes
  if (data.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text("Notes:", 14, finalY);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(data.notes, 14, finalY + 5, { maxWidth: 100 });
  }
  
  // Footer
  addFooter(doc, data.createdBy);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// INVOICE PDF
// ============================================================================

export interface InvoicePDFData extends SalesOrderPDFData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTerms: string;
}

export function generateInvoicePDF(data: InvoicePDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(28);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("INVOICE", 14, 25);
  
  // Company Info (right side)
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(COMPANY_INFO.name, 200, 15, { align: "right" });
  doc.text(COMPANY_INFO.address, 200, 20, { align: "right" });
  doc.text(COMPANY_INFO.city, 200, 25, { align: "right" });
  doc.text(COMPANY_INFO.phone, 200, 30, { align: "right" });
  
  // Invoice Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 30, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`Invoice #: ${data.invoiceNumber}`, 20, 43);
  doc.text(`Invoice Date: ${formatDate(data.invoiceDate)}`, 20, 50);
  doc.text(`Due Date: ${formatDate(data.dueDate)}`, 20, 57);
  doc.text(`Order #: ${data.orderNumber}`, 110, 43);
  doc.text(`Terms: ${data.paymentTerms}`, 110, 50);
  if (data.customerPO) {
    doc.text(`Customer PO: ${data.customerPO}`, 110, 57);
  }
  
  // Bill To
  let yPos = 75;
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("BILL TO:", 14, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  doc.text(data.customer.name, 14, yPos);
  yPos += 4;
  if (data.billTo.address1) {
    doc.text(data.billTo.address1, 14, yPos);
    yPos += 4;
  }
  if (data.billTo.city) {
    doc.text(`${data.billTo.city}, ${data.billTo.state} ${data.billTo.zip}`, 14, yPos);
  }
  
  // Ship To
  yPos = 75;
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("SHIP TO:", 110, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  if (data.shipTo.name) doc.text(data.shipTo.name, 110, yPos);
  yPos += 4;
  if (data.shipTo.address1) {
    doc.text(data.shipTo.address1, 110, yPos);
    yPos += 4;
  }
  if (data.shipTo.city) {
    doc.text(`${data.shipTo.city}, ${data.shipTo.state} ${data.shipTo.zip}`, 110, yPos);
  }
  
  // Line Items Table
  autoTable(doc, {
    startY: 110,
    head: [["SKU", "Description", "Qty", "UOM", "Unit Price", "Total"]],
    body: data.lines.map((line) => [
      line.sku || "",
      line.description,
      line.qty.toString(),
      line.uom,
      line.unitPrice ? formatCurrency(line.unitPrice) : "",
      line.total ? formatCurrency(line.total) : "",
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 15 },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
    },
  });
  
  // Totals Box
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(130, finalY, 66, 35, "F");
  
  doc.setFontSize(10);
  doc.text("Subtotal:", 135, finalY + 8);
  doc.text(formatCurrency(data.subtotal), 191, finalY + 8, { align: "right" });
  
  doc.text("Tax:", 135, finalY + 15);
  doc.text(formatCurrency(data.taxAmount), 191, finalY + 15, { align: "right" });
  
  doc.text("Shipping:", 135, finalY + 22);
  doc.text(formatCurrency(data.shippingAmount), 191, finalY + 22, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_COLOR);
  doc.text("AMOUNT DUE:", 135, finalY + 32);
  doc.text(formatCurrency(data.total), 191, finalY + 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  
  // Payment Instructions
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("Payment Instructions:", 14, finalY + 5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("Please include invoice number with your payment.", 14, finalY + 10);
  doc.text(`Payment due by: ${formatDate(data.dueDate)}`, 14, finalY + 15);
  
  // Footer
  addFooter(doc);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// PACKING SLIP PDF
// ============================================================================

export interface PackingSlipPDFData {
  shipmentNumber: string;
  orderNumber: string;
  shipDate: Date;
  carrier?: string;
  trackingNumber?: string;
  customer: {
    name: string;
    code: string;
  };
  shipTo: Address;
  lines: Array<{
    sku?: string;
    description: string;
    qtyOrdered: number;
    qtyShipped: number;
    uom: string;
  }>;
  packages?: Array<{
    packageNumber: number;
    weight?: number;
    trackingNumber?: string;
  }>;
  notes?: string;
}

export function generatePackingSlipPDF(data: PackingSlipPDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("PACKING SLIP", 14, 25);
  
  // Company Info
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(COMPANY_INFO.name, 200, 15, { align: "right" });
  doc.text(COMPANY_INFO.address, 200, 20, { align: "right" });
  doc.text(COMPANY_INFO.city, 200, 25, { align: "right" });
  
  // Shipment Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 20, "F");
  
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`Shipment #: ${data.shipmentNumber}`, 20, 43);
  doc.text(`Order #: ${data.orderNumber}`, 20, 50);
  doc.text(`Ship Date: ${formatDate(data.shipDate)}`, 100, 43);
  if (data.carrier) {
    doc.text(`Carrier: ${data.carrier}`, 100, 50);
  }
  if (data.trackingNumber) {
    doc.text(`Tracking: ${data.trackingNumber}`, 150, 43);
  }
  
  // Ship To Address (large, prominent)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.rect(14, 60, 90, 40, "D");
  
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("SHIP TO:", 18, 66);
  
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  let yPos = 74;
  doc.setFont("helvetica", "bold");
  doc.text(data.customer.name, 18, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 5;
  if (data.shipTo.address1) {
    doc.text(data.shipTo.address1, 18, yPos);
    yPos += 5;
  }
  if (data.shipTo.city) {
    doc.text(`${data.shipTo.city}, ${data.shipTo.state} ${data.shipTo.zip}`, 18, yPos);
  }
  
  // Line Items Table (no prices on packing slip)
  autoTable(doc, {
    startY: 110,
    head: [["SKU", "Description", "Ordered", "Shipped", "UOM"]],
    body: data.lines.map((line) => [
      line.sku || "",
      line.description,
      line.qtyOrdered.toString(),
      line.qtyShipped.toString(),
      line.uom,
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 22 },
    },
  });
  
  // Package Info
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  if (data.packages && data.packages.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text("PACKAGES:", 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 3,
      head: [["Package #", "Weight (lbs)", "Tracking"]],
      body: data.packages.map((pkg) => [
        `Package ${pkg.packageNumber}`,
        pkg.weight?.toFixed(1) || "-",
        pkg.trackingNumber || "-",
      ]),
      headStyles: { fillColor: SECONDARY_COLOR, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 102 },
      },
    });
  }
  
  // Notes
  if (data.notes) {
    const notesY = data.packages ? (doc as any).lastAutoTable.finalY + 10 : finalY;
    doc.setFontSize(9);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text("Notes:", 14, notesY);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(data.notes, 14, notesY + 5, { maxWidth: 180 });
  }
  
  // Signature Line
  const sigY = 260;
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.line(14, sigY, 100, sigY);
  doc.setFontSize(8);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("Received By / Date", 14, sigY + 5);
  
  // Footer
  addFooter(doc);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// PURCHASE ORDER PDF
// ============================================================================

export interface PurchaseOrderPDFData {
  poNumber: string;
  orderDate: Date;
  expectedDate?: Date;
  status: string;
  supplier: {
    name: string;
    code: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  shipTo: Address;
  lines: Array<{
    sku?: string;
    description: string;
    qty: number;
    uom: string;
    unitCost: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  notes?: string;
  createdBy?: string;
}

export function generatePurchaseOrderPDF(data: PurchaseOrderPDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("PURCHASE ORDER", 14, 25);
  
  // Company Info (right side)
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(COMPANY_INFO.name, 200, 15, { align: "right" });
  doc.text(COMPANY_INFO.address, 200, 20, { align: "right" });
  doc.text(COMPANY_INFO.city, 200, 25, { align: "right" });
  doc.text(COMPANY_INFO.phone, 200, 30, { align: "right" });
  
  // PO Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 20, "F");
  
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`PO #: ${data.poNumber}`, 20, 43);
  doc.text(`Date: ${formatDate(data.orderDate)}`, 20, 50);
  doc.text(`Status: ${data.status}`, 90, 43);
  if (data.expectedDate) {
    doc.text(`Expected: ${formatDate(data.expectedDate)}`, 90, 50);
  }
  
  // Supplier Info
  let yPos = 65;
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("VENDOR:", 14, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.supplier.name, 14, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 4;
  if (data.supplier.contactName) {
    doc.text(`Attn: ${data.supplier.contactName}`, 14, yPos);
    yPos += 4;
  }
  if (data.supplier.address1) {
    doc.text(data.supplier.address1, 14, yPos);
    yPos += 4;
  }
  if (data.supplier.city) {
    doc.text(`${data.supplier.city}, ${data.supplier.state} ${data.supplier.zip}`, 14, yPos);
    yPos += 4;
  }
  if (data.supplier.email) {
    doc.text(data.supplier.email, 14, yPos);
  }
  
  // Ship To
  yPos = 65;
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("SHIP TO:", 110, yPos);
  doc.setTextColor(...PRIMARY_COLOR);
  yPos += 5;
  doc.text(COMPANY_INFO.name, 110, yPos);
  yPos += 4;
  if (data.shipTo.address1) {
    doc.text(data.shipTo.address1, 110, yPos);
    yPos += 4;
  }
  if (data.shipTo.city) {
    doc.text(`${data.shipTo.city}, ${data.shipTo.state} ${data.shipTo.zip}`, 110, yPos);
  }
  
  // Line Items Table
  autoTable(doc, {
    startY: 105,
    head: [["SKU", "Description", "Qty", "UOM", "Unit Cost", "Total"]],
    body: data.lines.map((line) => [
      line.sku || "",
      line.description,
      line.qty.toString(),
      line.uom,
      formatCurrency(line.unitCost),
      formatCurrency(line.total),
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 15 },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
    },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, finalY);
  doc.text(formatCurrency(data.subtotal), 196, finalY, { align: "right" });
  
  doc.text("Tax:", 140, finalY + 6);
  doc.text(formatCurrency(data.taxAmount), 196, finalY + 6, { align: "right" });
  
  doc.text("Shipping:", 140, finalY + 12);
  doc.text(formatCurrency(data.shippingAmount), 196, finalY + 12, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + 22);
  doc.text(formatCurrency(data.total), 196, finalY + 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  
  // Notes / Terms
  if (data.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text("Notes/Instructions:", 14, finalY);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(data.notes, 14, finalY + 5, { maxWidth: 100 });
  }
  
  // Authorization
  const authY = 250;
  doc.setFontSize(9);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("Authorized By:", 14, authY);
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.line(14, authY + 10, 80, authY + 10);
  if (data.createdBy) {
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(data.createdBy, 14, authY + 8);
  }
  
  // Footer
  addFooter(doc);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// PICK LIST PDF
// ============================================================================

export interface PickListPDFData {
  taskNumber: string;
  orderNumber: string;
  createdDate: Date;
  priority: number;
  customer: {
    name: string;
    code: string;
  };
  lines: Array<{
    sku?: string;
    description: string;
    location: string;
    qtyToPick: number;
    uom: string;
    lotNumber?: string;
  }>;
  notes?: string;
}

export function generatePickListPDF(data: PickListPDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("PICK LIST", 14, 25);
  
  // Priority Badge
  if (data.priority <= 2) {
    doc.setFillColor(220, 38, 38); // Red for high priority
    doc.rect(150, 15, 46, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("HIGH PRIORITY", 173, 23, { align: "center" });
  }
  
  // Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 25, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`Pick Task: ${data.taskNumber}`, 20, 43);
  doc.text(`Order #: ${data.orderNumber}`, 20, 50);
  doc.text(`Customer: ${data.customer.name}`, 100, 43);
  doc.text(`Date: ${formatDate(data.createdDate)}`, 100, 50);
  
  // Pick Items Table (with checkbox column)
  autoTable(doc, {
    startY: 70,
    head: [["✓", "Location", "SKU", "Description", "Qty", "UOM", "Lot"]],
    body: data.lines.map((line) => [
      "☐", // Checkbox
      line.location,
      line.sku || "",
      line.description,
      line.qtyToPick.toString(),
      line.uom,
      line.lotNumber || "-",
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 30, fontStyle: "bold" },
      2: { cellWidth: 25 },
      3: { cellWidth: 55 },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 15 },
      6: { cellWidth: 29 },
    },
  });
  
  // Picked By Section
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("Picked By:", 14, finalY);
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.line(14, finalY + 15, 80, finalY + 15);
  doc.setFontSize(8);
  doc.text("Name / Badge", 14, finalY + 20);
  
  doc.text("Date/Time:", 100, finalY);
  doc.line(100, finalY + 15, 166, finalY + 15);
  
  // Notes
  if (data.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text("Notes:", 14, finalY + 35);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(data.notes, 14, finalY + 40, { maxWidth: 180 });
  }
  
  // Footer
  addFooter(doc);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// CYCLE COUNT SHEET PDF
// ============================================================================

export interface CycleCountSheetPDFData {
  countName: string;
  countDate: Date;
  assignedTo?: string;
  zone?: string;
  items: Array<{
    sku: string;
    description: string;
    location: string;
    systemQty: number;
    uom: string;
  }>;
}

export function generateCycleCountSheetPDF(data: CycleCountSheetPDFData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("CYCLE COUNT SHEET", 14, 25);
  
  // Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 20, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`Count: ${data.countName}`, 20, 43);
  doc.text(`Date: ${formatDate(data.countDate)}`, 20, 50);
  if (data.zone) {
    doc.text(`Zone: ${data.zone}`, 100, 43);
  }
  if (data.assignedTo) {
    doc.text(`Assigned To: ${data.assignedTo}`, 100, 50);
  }
  
  // Count Table (with blank count column)
  autoTable(doc, {
    startY: 65,
    head: [["Location", "SKU", "Description", "UOM", "System Qty", "Actual Qty", "Variance"]],
    body: data.items.map((item) => [
      item.location,
      item.sku,
      item.description,
      item.uom,
      item.systemQty.toString(),
      "", // Blank for actual count
      "", // Blank for variance
    ]),
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: "bold" },
      1: { cellWidth: 25 },
      2: { cellWidth: 50 },
      3: { cellWidth: 15 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 23, halign: "right" },
    },
  });
  
  // Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY_COLOR);
  
  doc.text("Counted By:", 14, finalY);
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.line(14, finalY + 12, 80, finalY + 12);
  doc.setFontSize(8);
  doc.text("Name / Badge / Date", 14, finalY + 17);
  
  doc.setFontSize(10);
  doc.text("Verified By:", 100, finalY);
  doc.line(100, finalY + 12, 166, finalY + 12);
  doc.setFontSize(8);
  doc.text("Name / Badge / Date", 100, finalY + 17);
  
  // Instructions
  doc.setFontSize(8);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text("Instructions: Count all items at each location. Record the actual quantity found. Calculate variance (Actual - System).", 14, finalY + 30);
  doc.text("For any significant variances, investigate and note the reason on the back of this sheet.", 14, finalY + 35);
  
  // Footer
  addFooter(doc);
  
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function addFooter(doc: jsPDF, createdBy?: string): void {
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFontSize(8);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, pageHeight - 10);
  if (createdBy) {
    doc.text(`By: ${createdBy}`, 14, pageHeight - 6);
  }
  doc.text("Page 1 of 1", 196, pageHeight - 10, { align: "right" });
}
