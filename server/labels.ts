/**
 * Label & Packing Slip Generation Service
 *
 * Generates printable shipping labels and packing slips for orders
 */

import { prisma } from "./prisma";

export interface ShippingLabel {
  orderNumber: string;
  orderDate: Date;
  shipTo: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  shipFrom: {
    name: string;
    company: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  carrier?: string;
  serviceLevel?: string;
  trackingNumber?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  barcode: string;
  specialInstructions?: string;
}

export interface PackingSlipLine {
  sku: string;
  name: string;
  description?: string;
  quantityOrdered: number;
  quantityShipped: number;
  uom: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface PackingSlip {
  orderNumber: string;
  orderDate: Date;
  shipDate: Date;
  shipTo: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  lines: PackingSlipLine[];
  notes?: string;
  totalItems: number;
  totalQuantity: number;
  packingInfo?: {
    boxNumber: number;
    totalBoxes: number;
    weight?: number;
  };
}

export class LabelService {
  /**
   * Generate shipping label for a purchase order
   */
  static async generateShippingLabel(
    orderId: string,
    tenantId: string,
    shipFromSiteId?: string
  ): Promise<ShippingLabel> {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId, tenantId },
      include: {
        supplier: true,
        site: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Get ship-from location (site or default warehouse)
    const shipFromSite = shipFromSiteId
      ? await prisma.site.findUnique({ where: { id: shipFromSiteId } })
      : order.site;

    if (!shipFromSite) {
      throw new Error("Ship-from location not found");
    }

    // Build shipping label
    const label: ShippingLabel = {
      orderNumber: order.poNumber || `PO-${order.id.substring(0, 8)}`,
      orderDate: order.orderDate,
      shipTo: {
        name: order.supplier.contactName || order.supplier.name,
        company: order.supplier.name,
        address1: order.supplier.address || "Address not provided",
        city: order.supplier.city || "Unknown",
        state: order.supplier.state || "",
        postalCode: order.supplier.zipCode || "",
        country: order.supplier.country || "USA",
        phone: order.supplier.phone || undefined,
        email: order.supplier.email || undefined,
      },
      shipFrom: {
        name: shipFromSite.name,
        company: "Your Company Name", // In production, get from tenant settings
        address1: "123 Warehouse St", // Get from site/tenant config
        city: "Your City",
        state: "ST",
        postalCode: "12345",
        country: "USA",
        phone: "555-1234",
      },
      carrier: "UPS", // In production, get from order or site settings
      serviceLevel: "Ground",
      trackingNumber: this.generateTrackingNumber(),
      barcode: order.poNumber || `PO-${order.id}`,
      specialInstructions: order.notes || undefined,
    };

    return label;
  }

  /**
   * Generate packing slip for a production order or sales order
   */
  static async generatePackingSlip(
    orderId: string,
    tenantId: string,
    orderType: "production" | "sales" = "production"
  ): Promise<PackingSlip> {
    if (orderType === "production") {
      return this.generateProductionPackingSlip(orderId, tenantId);
    }

    // For future: sales order packing slips
    throw new Error("Sales orders not yet implemented");
  }

  private static async generateProductionPackingSlip(
    orderId: string,
    tenantId: string
  ): Promise<PackingSlip> {
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId, tenantId },
      include: {
        item: true,
        bom: {
          include: {
            components: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Production order not found");
    }

    // Build packing slip lines from BOM
    const lines: PackingSlipLine[] = order.bom
      ? order.bom.components.map((component) => ({
          sku: component.item.sku,
          name: component.item.name,
          description: component.item.description || undefined,
          quantityOrdered: component.qtyPer * order.qtyOrdered,
          quantityShipped: component.qtyPer * (order.qtyCompleted || 0),
          uom: component.item.baseUom,
        }))
      : [
          {
            sku: order.item.sku,
            name: order.item.name,
            description: order.item.description || undefined,
            quantityOrdered: order.qtyOrdered,
            quantityShipped: order.qtyCompleted || 0,
            uom: order.item.baseUom,
          },
        ];

    const totalQuantity = lines.reduce((sum, l) => sum + l.quantityShipped, 0);

    const slip: PackingSlip = {
      orderNumber: order.orderNumber || `MO-${order.id.substring(0, 8)}`,
      orderDate: order.createdAt,
      shipDate: order.actualEnd || new Date(),
      shipTo: {
        name: "Internal Production",
        address1: "Production Floor",
        city: "Warehouse",
        state: "",
        postalCode: "",
        country: "USA",
      },
      lines,
      notes: order.notes || undefined,
      totalItems: lines.length,
      totalQuantity,
    };

    return slip;
  }

  /**
   * Generate multiple labels for bulk shipments
   */
  static async generateBulkLabels(
    orderIds: string[],
    tenantId: string
  ): Promise<ShippingLabel[]> {
    const labels: ShippingLabel[] = [];

    for (const orderId of orderIds) {
      try {
        const label = await this.generateShippingLabel(orderId, tenantId);
        labels.push(label);
      } catch (error) {
        console.error(`Failed to generate label for order ${orderId}:`, error);
      }
    }

    return labels;
  }

  /**
   * Generate box labels for multi-box shipments
   */
  static generateBoxLabels(
    baseLabel: ShippingLabel,
    totalBoxes: number
  ): ShippingLabel[] {
    const labels: ShippingLabel[] = [];

    for (let i = 1; i <= totalBoxes; i++) {
      labels.push({
        ...baseLabel,
        orderNumber: `${baseLabel.orderNumber}-BOX${i}`,
        barcode: `${baseLabel.barcode}-${i}`,
        specialInstructions: `Box ${i} of ${totalBoxes}${
          baseLabel.specialInstructions ? ` - ${baseLabel.specialInstructions}` : ""
        }`,
      });
    }

    return labels;
  }

  /**
   * Generate return label (reverse logistics)
   */
  static generateReturnLabel(originalLabel: ShippingLabel): ShippingLabel {
    return {
      ...originalLabel,
      orderNumber: `RMA-${originalLabel.orderNumber}`,
      shipTo: originalLabel.shipFrom,
      shipFrom: originalLabel.shipTo as any,
      barcode: `RMA-${originalLabel.barcode}`,
      specialInstructions: "RETURN SHIPMENT",
    };
  }

  /**
   * Helper: Generate tracking number (mock)
   */
  private static generateTrackingNumber(): string {
    const prefix = "1Z"; // UPS prefix
    const account = "999AA";
    const service = "10";
    const random = Math.random().toString(36).substring(2, 11).toUpperCase();
    return `${prefix}${account}${service}${random}`;
  }

  /**
   * Format address for label printing
   */
  static formatAddress(address: ShippingLabel["shipTo"]): string[] {
    const lines: string[] = [];

    if (address.name) lines.push(address.name);
    if (address.company) lines.push(address.company);
    lines.push(address.address1);
    if (address.address2) lines.push(address.address2);
    lines.push(`${address.city}, ${address.state} ${address.postalCode}`);
    if (address.country && address.country !== "USA") lines.push(address.country);

    return lines;
  }

  /**
   * Calculate dimensional weight for carriers
   */
  static calculateDimensionalWeight(dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  }): number {
    const { length, width, height } = dimensions;
    const volumeCubicInches = length * width * height;

    // DIM weight divisor for domestic shipments (139 for UPS/FedEx)
    const dimDivisor = 139;

    return Math.ceil(volumeCubicInches / dimDivisor);
  }
}
