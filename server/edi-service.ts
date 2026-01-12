/**
 * EDI (Electronic Data Interchange) Service
 *
 * Supports ANSI X12 EDI documents: 850 (PO), 856 (ASN), 810 (Invoice), 997 (FA)
 * for enterprise B2B integrations
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type EDIDocumentType = "850" | "856" | "810" | "997" | "855" | "860" | "824";
export type EDIStatus = "PENDING" | "PROCESSING" | "SENT" | "ACKNOWLEDGED" | "ERROR";

export interface EDITradingPartner {
  id: string;
  tenantId: string;
  name: string;
  isaId: string; // Interchange Sender ID
  gsId: string; // Group Sender ID
  qualifierId: string;
  protocol: "AS2" | "SFTP" | "VAN" | "API";
  endpoint?: string;
  certificates?: string;
  isActive: boolean;
  documentTypes: EDIDocumentType[];
  settings: {
    testMode: boolean;
    autoAcknowledge: boolean;
    segmentTerminator: string;
    elementSeparator: string;
    subelementSeparator: string;
  };
}

export interface EDIDocument {
  id: string;
  tenantId: string;
  tradingPartnerId: string;
  documentType: EDIDocumentType;
  direction: "INBOUND" | "OUTBOUND";
  controlNumber: string;
  referenceNumber?: string;
  status: EDIStatus;
  rawContent?: string;
  parsedContent?: any;
  errors?: string[];
  acknowledgmentId?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface EDI850PurchaseOrder {
  poNumber: string;
  poDate: Date;
  buyerCode: string;
  shipToCode: string;
  requestedDeliveryDate?: Date;
  lines: {
    lineNumber: number;
    buyerPartNumber: string;
    vendorPartNumber?: string;
    upc?: string;
    description: string;
    quantity: number;
    uom: string;
    unitPrice: number;
  }[];
  totalAmount: number;
}

export interface EDI856ASN {
  shipmentId: string;
  shipDate: Date;
  carrierCode: string;
  trackingNumber: string;
  poNumber: string;
  items: {
    lineNumber: number;
    partNumber: string;
    quantity: number;
    lotNumber?: string;
    serialNumbers?: string[];
  }[];
  packages: {
    packageId: string;
    weight: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  }[];
}

export interface EDI810Invoice {
  invoiceNumber: string;
  invoiceDate: Date;
  poNumber: string;
  vendorCode: string;
  buyerCode: string;
  lines: {
    lineNumber: number;
    partNumber: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

// ============================================================
// EDI PARSER
// ============================================================

export class EDIParser {
  /**
   * Parse raw EDI content
   */
  static parse(content: string, documentType: EDIDocumentType): any {
    // Detect segment terminator (usually ~ or newline)
    const segmentTerminator = content.includes("~") ? "~" : "\n";
    const elementSeparator = "*";

    const segments = content.split(segmentTerminator).filter((s) => s.trim());
    const parsed: any = { segments: [] };

    for (const segment of segments) {
      const elements = segment.split(elementSeparator);
      const segmentId = elements[0];

      parsed.segments.push({
        id: segmentId,
        elements: elements.slice(1),
      });
    }

    switch (documentType) {
      case "850":
        return this.parse850(parsed);
      case "856":
        return this.parse856(parsed);
      case "810":
        return this.parse810(parsed);
      default:
        return parsed;
    }
  }

  /**
   * Parse 850 Purchase Order
   */
  private static parse850(parsed: any): EDI850PurchaseOrder {
    const po: Partial<EDI850PurchaseOrder> = {
      lines: [],
    };

    for (const segment of parsed.segments) {
      switch (segment.id) {
        case "BEG":
          po.poNumber = segment.elements[2];
          po.poDate = this.parseDate(segment.elements[4]);
          break;
        case "N1":
          if (segment.elements[0] === "BY") {
            po.buyerCode = segment.elements[3];
          } else if (segment.elements[0] === "ST") {
            po.shipToCode = segment.elements[3];
          }
          break;
        case "DTM":
          if (segment.elements[0] === "002") {
            po.requestedDeliveryDate = this.parseDate(segment.elements[1]);
          }
          break;
        case "PO1":
          po.lines!.push({
            lineNumber: parseInt(segment.elements[0], 10),
            buyerPartNumber: segment.elements[6] || "",
            vendorPartNumber: segment.elements[8],
            description: "",
            quantity: parseFloat(segment.elements[1]),
            uom: segment.elements[2],
            unitPrice: parseFloat(segment.elements[3]),
          });
          break;
        case "PID":
          if (po.lines!.length > 0) {
            po.lines![po.lines!.length - 1].description = segment.elements[4];
          }
          break;
        case "CTT":
          // Line count summary
          break;
        case "AMT":
          if (segment.elements[0] === "TT") {
            po.totalAmount = parseFloat(segment.elements[1]);
          }
          break;
      }
    }

    return po as EDI850PurchaseOrder;
  }

  /**
   * Parse 856 ASN
   */
  private static parse856(parsed: any): EDI856ASN {
    const asn: Partial<EDI856ASN> = {
      items: [],
      packages: [],
    };

    for (const segment of parsed.segments) {
      switch (segment.id) {
        case "BSN":
          asn.shipmentId = segment.elements[1];
          asn.shipDate = this.parseDate(segment.elements[2]);
          break;
        case "TD5":
          asn.carrierCode = segment.elements[2];
          break;
        case "REF":
          if (segment.elements[0] === "BM") {
            asn.trackingNumber = segment.elements[1];
          } else if (segment.elements[0] === "PO") {
            asn.poNumber = segment.elements[1];
          }
          break;
        case "SN1":
          asn.items!.push({
            lineNumber: asn.items!.length + 1,
            partNumber: segment.elements[1],
            quantity: parseFloat(segment.elements[2]),
          });
          break;
        case "LIN":
          if (asn.items!.length > 0) {
            asn.items![asn.items!.length - 1].partNumber = segment.elements[2];
          }
          break;
      }
    }

    return asn as EDI856ASN;
  }

  /**
   * Parse 810 Invoice
   */
  private static parse810(parsed: any): EDI810Invoice {
    const invoice: Partial<EDI810Invoice> = {
      lines: [],
    };

    for (const segment of parsed.segments) {
      switch (segment.id) {
        case "BIG":
          invoice.invoiceDate = this.parseDate(segment.elements[0]);
          invoice.invoiceNumber = segment.elements[1];
          invoice.poNumber = segment.elements[3];
          break;
        case "N1":
          if (segment.elements[0] === "VN") {
            invoice.vendorCode = segment.elements[3];
          } else if (segment.elements[0] === "BY") {
            invoice.buyerCode = segment.elements[3];
          }
          break;
        case "IT1":
          invoice.lines!.push({
            lineNumber: parseInt(segment.elements[0], 10),
            partNumber: segment.elements[6] || "",
            description: "",
            quantity: parseFloat(segment.elements[1]),
            unitPrice: parseFloat(segment.elements[3]),
            amount: parseFloat(segment.elements[1]) * parseFloat(segment.elements[3]),
          });
          break;
        case "TDS":
          invoice.total = parseFloat(segment.elements[0]) / 100;
          break;
        case "TXI":
          invoice.taxAmount = parseFloat(segment.elements[1]);
          break;
      }
    }

    invoice.subtotal = invoice.lines!.reduce((sum, l) => sum + l.amount, 0);

    return invoice as EDI810Invoice;
  }

  /**
   * Parse EDI date format (YYYYMMDD or YYMMDD)
   */
  private static parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    if (dateStr.length === 8) {
      return new Date(
        parseInt(dateStr.substr(0, 4), 10),
        parseInt(dateStr.substr(4, 2), 10) - 1,
        parseInt(dateStr.substr(6, 2), 10)
      );
    } else if (dateStr.length === 6) {
      const year = parseInt(dateStr.substr(0, 2), 10);
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      return new Date(
        fullYear,
        parseInt(dateStr.substr(2, 2), 10) - 1,
        parseInt(dateStr.substr(4, 2), 10)
      );
    }

    return new Date();
  }
}

// ============================================================
// EDI GENERATOR
// ============================================================

export class EDIGenerator {
  private static controlNumber = 1;

  /**
   * Generate ISA/GS envelope
   */
  private static generateEnvelope(
    partner: EDITradingPartner,
    documentType: EDIDocumentType,
    content: string[]
  ): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "").slice(2);
    const time = now.toTimeString().slice(0, 5).replace(":", "");
    const controlNum = (this.controlNumber++).toString().padStart(9, "0");

    const segments: string[] = [];
    const sep = partner.settings.elementSeparator || "*";
    const term = partner.settings.segmentTerminator || "~";
    const sub = partner.settings.subelementSeparator || ":";

    // ISA - Interchange Control Header
    segments.push(
      `ISA${sep}00${sep}          ${sep}00${sep}          ${sep}ZZ${sep}${partner.isaId.padEnd(15)}${sep}ZZ${sep}${partner.gsId.padEnd(15)}${sep}${date}${sep}${time}${sep}${sub}${sep}00501${sep}${controlNum}${sep}0${sep}${partner.settings.testMode ? "T" : "P"}${sep}>${term}`
    );

    // GS - Functional Group Header
    const gsCode = this.getGSCode(documentType);
    segments.push(
      `GS${sep}${gsCode}${sep}${partner.isaId}${sep}${partner.gsId}${sep}${date}${sep}${time}${sep}${controlNum.slice(-4)}${sep}X${sep}005010${term}`
    );

    // ST - Transaction Set Header
    segments.push(`ST${sep}${documentType}${sep}${controlNum.slice(-4)}${term}`);

    // Add document content
    segments.push(...content);

    // SE - Transaction Set Trailer
    segments.push(`SE${sep}${content.length + 2}${sep}${controlNum.slice(-4)}${term}`);

    // GE - Functional Group Trailer
    segments.push(`GE${sep}1${sep}${controlNum.slice(-4)}${term}`);

    // IEA - Interchange Control Trailer
    segments.push(`IEA${sep}1${sep}${controlNum}${term}`);

    return segments.join("\n");
  }

  /**
   * Get GS functional identifier code
   */
  private static getGSCode(documentType: EDIDocumentType): string {
    const codes: Record<EDIDocumentType, string> = {
      "850": "PO",
      "855": "PR",
      "856": "SH",
      "810": "IN",
      "860": "PC",
      "997": "FA",
      "824": "AG",
    };
    return codes[documentType] || "XX";
  }

  /**
   * Generate 856 ASN
   */
  static generate856(
    partner: EDITradingPartner,
    shipment: any
  ): string {
    const sep = partner.settings.elementSeparator || "*";
    const term = partner.settings.segmentTerminator || "~";
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 5).replace(":", "");

    const content: string[] = [];

    // BSN - Beginning Segment for Ship Notice
    content.push(
      `BSN${sep}00${sep}${shipment.shipmentNumber}${sep}${date}${sep}${time}${term}`
    );

    // HL - Shipment Level
    content.push(`HL${sep}1${sep}${sep}S${term}`);

    // TD1 - Carrier Details
    content.push(
      `TD1${sep}CTN${sep}${shipment.totalPackages || 1}${sep}${sep}${sep}${sep}${sep}${sep}G${sep}${shipment.totalWeight || 0}${sep}LB${term}`
    );

    // TD5 - Carrier Name
    content.push(
      `TD5${sep}${sep}2${sep}${shipment.carrier || "UNKNOWN"}${term}`
    );

    // REF - Reference Numbers
    content.push(`REF${sep}BM${sep}${shipment.trackingNumber || ""}${term}`);
    content.push(`REF${sep}CN${sep}${shipment.salesOrder?.customerPO || ""}${term}`);

    // DTM - Ship Date
    content.push(`DTM${sep}011${sep}${date}${term}`);

    // N1 - Ship From
    content.push(`N1${sep}SF${sep}${shipment.shipFromName || "Warehouse"}${term}`);

    // N1 - Ship To
    content.push(`N1${sep}ST${sep}${shipment.shipToName || ""}${term}`);
    if (shipment.shipToAddress1) {
      content.push(`N3${sep}${shipment.shipToAddress1}${term}`);
    }
    if (shipment.shipToCity) {
      content.push(
        `N4${sep}${shipment.shipToCity}${sep}${shipment.shipToState}${sep}${shipment.shipToZip}${term}`
      );
    }

    // HL - Order Level
    content.push(`HL${sep}2${sep}1${sep}O${term}`);
    content.push(`PRF${sep}${shipment.salesOrder?.orderNumber || ""}${term}`);

    // Items
    let itemNum = 3;
    for (const line of shipment.lines || []) {
      content.push(`HL${sep}${itemNum}${sep}2${sep}I${term}`);
      content.push(
        `LIN${sep}${sep}VP${sep}${line.item?.sku || ""}${sep}BP${sep}${line.item?.sku || ""}${term}`
      );
      content.push(
        `SN1${sep}${sep}${line.qtyShipped}${sep}${line.uom || "EA"}${term}`
      );
      itemNum++;
    }

    return this.generateEnvelope(partner, "856", content);
  }

  /**
   * Generate 810 Invoice
   */
  static generate810(
    partner: EDITradingPartner,
    invoice: any
  ): string {
    const sep = partner.settings.elementSeparator || "*";
    const term = partner.settings.segmentTerminator || "~";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const content: string[] = [];

    // BIG - Beginning Segment for Invoice
    content.push(
      `BIG${sep}${date}${sep}${invoice.invoiceNumber}${sep}${sep}${invoice.salesOrder?.orderNumber || ""}${term}`
    );

    // REF - Reference
    content.push(`REF${sep}PO${sep}${invoice.salesOrder?.orderNumber || ""}${term}`);

    // N1 - Vendor
    content.push(`N1${sep}VN${sep}${invoice.vendorName || "Vendor"}${sep}91${sep}${invoice.vendorCode || ""}${term}`);

    // N1 - Buyer
    content.push(`N1${sep}BY${sep}${invoice.buyerName || ""}${sep}91${sep}${invoice.buyerCode || ""}${term}`);

    // ITD - Terms
    content.push(`ITD${sep}01${sep}3${sep}${sep}${sep}30${term}`);

    // Invoice Lines
    let lineNum = 1;
    for (const line of invoice.lines || []) {
      content.push(
        `IT1${sep}${lineNum}${sep}${line.quantity}${sep}${line.uom || "EA"}${sep}${line.unitPrice}${sep}${sep}VP${sep}${line.sku || ""}${term}`
      );
      content.push(`PID${sep}F${sep}${sep}${sep}${sep}${line.description || ""}${term}`);
      lineNum++;
    }

    // TDS - Total Monetary Value Summary
    const totalCents = Math.round((invoice.total || 0) * 100);
    content.push(`TDS${sep}${totalCents}${term}`);

    // CTT - Transaction Totals
    content.push(`CTT${sep}${invoice.lines?.length || 0}${term}`);

    return this.generateEnvelope(partner, "810", content);
  }

  /**
   * Generate 997 Functional Acknowledgment
   */
  static generate997(
    partner: EDITradingPartner,
    originalDocument: EDIDocument,
    accepted: boolean,
    errors?: string[]
  ): string {
    const sep = partner.settings.elementSeparator || "*";
    const term = partner.settings.segmentTerminator || "~";

    const content: string[] = [];

    // AK1 - Functional Group Response Header
    const gsCode = this.getGSCode(originalDocument.documentType);
    content.push(`AK1${sep}${gsCode}${sep}${originalDocument.controlNumber}${term}`);

    // AK2 - Transaction Set Response Header
    content.push(
      `AK2${sep}${originalDocument.documentType}${sep}${originalDocument.controlNumber}${term}`
    );

    // AK5 - Transaction Set Response Trailer
    content.push(`AK5${sep}${accepted ? "A" : "R"}${term}`);

    // AK9 - Functional Group Response Trailer
    content.push(
      `AK9${sep}${accepted ? "A" : "R"}${sep}1${sep}1${sep}${accepted ? 1 : 0}${term}`
    );

    return this.generateEnvelope(partner, "997", content);
  }
}

// ============================================================
// EDI SERVICE
// ============================================================

export class EDIService {
  private static partners: Map<string, EDITradingPartner[]> = new Map();
  private static documents: Map<string, EDIDocument> = new Map();

  /**
   * Register trading partner
   */
  static registerPartner(partner: EDITradingPartner): void {
    const tenantPartners = this.partners.get(partner.tenantId) || [];
    tenantPartners.push(partner);
    this.partners.set(partner.tenantId, tenantPartners);
  }

  /**
   * Get trading partners for tenant
   */
  static getPartners(tenantId: string): EDITradingPartner[] {
    return this.partners.get(tenantId) || [];
  }

  /**
   * Process inbound EDI document
   */
  static async processInbound(params: {
    tenantId: string;
    partnerId: string;
    documentType: EDIDocumentType;
    content: string;
  }): Promise<EDIDocument> {
    const { tenantId, partnerId, documentType, content } = params;

    const document: EDIDocument = {
      id: `EDI-${Date.now()}`,
      tenantId,
      tradingPartnerId: partnerId,
      documentType,
      direction: "INBOUND",
      controlNumber: `${Date.now()}`,
      status: "PROCESSING",
      rawContent: content,
      createdAt: new Date(),
    };

    try {
      // Parse document
      const parsed = EDIParser.parse(content, documentType);
      document.parsedContent = parsed;

      // Process based on document type
      switch (documentType) {
        case "850":
          await this.process850(tenantId, parsed as EDI850PurchaseOrder);
          break;
        // Add other document types as needed
      }

      document.status = "ACKNOWLEDGED";
      document.processedAt = new Date();

      // Send 997 acknowledgment if configured
      const partner = this.getPartners(tenantId).find((p) => p.id === partnerId);
      if (partner?.settings.autoAcknowledge) {
        await this.sendAcknowledgment(partner, document, true);
      }
    } catch (error: any) {
      document.status = "ERROR";
      document.errors = [error.message];
    }

    this.documents.set(document.id, document);
    return document;
  }

  /**
   * Process 850 Purchase Order
   */
  private static async process850(
    tenantId: string,
    po: EDI850PurchaseOrder
  ): Promise<any> {
    // Get default site
    const site = await prisma.site.findFirst({
      where: { tenantId },
    });

    if (!site) throw new Error("No site found");

    // Find or create supplier
    let supplier = await prisma.supplier.findFirst({
      where: { tenantId, code: po.buyerCode },
    });

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          tenantId,
          code: po.buyerCode,
          name: `EDI Partner: ${po.buyerCode}`,
          isActive: true,
        },
      });
    }

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        siteId: site.id,
        supplierId: supplier.id,
        poNumber: `EDI-${po.poNumber}`,
        status: "APPROVED",
        orderDate: po.poDate,
        expectedDelivery: po.requestedDeliveryDate,
        subtotal: po.totalAmount,
        total: po.totalAmount,
        notes: `Imported via EDI 850: ${po.poNumber}`,
        lines: {
          create: await Promise.all(
            po.lines.map(async (line) => {
              // Find item by various identifiers
              const item = await prisma.item.findFirst({
                where: {
                  tenantId,
                  OR: [
                    { sku: line.vendorPartNumber || "" },
                    { sku: line.buyerPartNumber },
                    { barcode: line.upc },
                  ],
                },
              });

              return {
                itemId: item?.id || "",
                lineNumber: line.lineNumber,
                description: line.description,
                qtyOrdered: line.quantity,
                uom: "EA" as const,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
                status: "PENDING" as const,
              };
            })
          ),
        },
      },
    });

    return purchaseOrder;
  }

  /**
   * Generate and send outbound EDI document
   */
  static async sendOutbound(params: {
    tenantId: string;
    partnerId: string;
    documentType: EDIDocumentType;
    referenceId: string; // Shipment ID, Invoice ID, etc.
  }): Promise<EDIDocument> {
    const { tenantId, partnerId, documentType, referenceId } = params;

    const partner = this.getPartners(tenantId).find((p) => p.id === partnerId);
    if (!partner) throw new Error("Trading partner not found");

    let content: string;

    switch (documentType) {
      case "856":
        const shipment = await prisma.shipment.findUnique({
          where: { id: referenceId },
          include: {
            salesOrder: true,
            lines: { include: { item: true } },
          },
        });
        if (!shipment) throw new Error("Shipment not found");
        content = EDIGenerator.generate856(partner, shipment);
        break;

      case "810":
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: referenceId },
          include: {
            lines: { include: { item: true } },
            customer: true,
          },
        });
        if (!salesOrder) throw new Error("Sales order not found");
        content = EDIGenerator.generate810(partner, {
          invoiceNumber: `INV-${salesOrder.orderNumber}`,
          salesOrder,
          lines: salesOrder.lines.map((l) => ({
            quantity: l.qtyOrdered,
            uom: l.uom,
            unitPrice: l.unitPrice,
            sku: l.item.sku,
            description: l.description,
          })),
          total: salesOrder.total,
        });
        break;

      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    const document: EDIDocument = {
      id: `EDI-${Date.now()}`,
      tenantId,
      tradingPartnerId: partnerId,
      documentType,
      direction: "OUTBOUND",
      controlNumber: `${Date.now()}`,
      referenceNumber: referenceId,
      status: "PENDING",
      rawContent: content,
      createdAt: new Date(),
    };

    // Send document based on protocol
    await this.transmitDocument(partner, content);
    document.status = "SENT";
    document.processedAt = new Date();

    this.documents.set(document.id, document);
    return document;
  }

  /**
   * Transmit document to trading partner
   */
  private static async transmitDocument(
    partner: EDITradingPartner,
    content: string
  ): Promise<void> {
    switch (partner.protocol) {
      case "AS2":
        // In production, send via AS2 protocol
        console.log(`Sending via AS2 to ${partner.endpoint}`);
        break;
      case "SFTP":
        // In production, upload via SFTP
        console.log(`Uploading via SFTP to ${partner.endpoint}`);
        break;
      case "VAN":
        // In production, send via VAN (Value Added Network)
        console.log(`Sending via VAN to ${partner.endpoint}`);
        break;
      case "API":
        // In production, POST to API endpoint
        console.log(`Sending via API to ${partner.endpoint}`);
        break;
    }
  }

  /**
   * Send 997 acknowledgment
   */
  private static async sendAcknowledgment(
    partner: EDITradingPartner,
    document: EDIDocument,
    accepted: boolean
  ): Promise<void> {
    const ack = EDIGenerator.generate997(partner, document, accepted);
    await this.transmitDocument(partner, ack);
  }

  /**
   * Get document history
   */
  static getDocuments(
    tenantId: string,
    filters?: {
      partnerId?: string;
      documentType?: EDIDocumentType;
      direction?: "INBOUND" | "OUTBOUND";
      status?: EDIStatus;
    }
  ): EDIDocument[] {
    let documents = Array.from(this.documents.values()).filter(
      (d) => d.tenantId === tenantId
    );

    if (filters?.partnerId) {
      documents = documents.filter((d) => d.tradingPartnerId === filters.partnerId);
    }
    if (filters?.documentType) {
      documents = documents.filter((d) => d.documentType === filters.documentType);
    }
    if (filters?.direction) {
      documents = documents.filter((d) => d.direction === filters.direction);
    }
    if (filters?.status) {
      documents = documents.filter((d) => d.status === filters.status);
    }

    return documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
