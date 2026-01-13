import { z } from "zod";
import { UOMS } from "./inventory";

// ============================================================================
// Sales Order Schemas
// ============================================================================

export const SALES_ORDER_STATUS = [
  "DRAFT",
  "CONFIRMED",
  "ALLOCATED",
  "PICKING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUS)[number];

export const createSOLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemId: z.string(),
  description: z.string().optional(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(UOMS),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

export type CreateSOLineInput = z.infer<typeof createSOLineSchema>;

export const createSOSchema = z.object({
  customerId: z.string(),
  orderNumber: z.string().min(1),
  customerPO: z.string().optional(),
  orderDate: z.string(),
  requestedDate: z.string().optional(),
  promisedDate: z.string().optional(),
  // Ship To
  shipToName: z.string().optional(),
  shipToAddress1: z.string().optional(),
  shipToAddress2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  shipToCountry: z.string().default("US"),
  // Shipping
  shippingMethod: z.string().optional(),
  // Financials
  shippingAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  // Notes
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  // Lines
  lines: z.array(createSOLineSchema).min(1),
});

export type CreateSOInput = z.infer<typeof createSOSchema>;

export const updateSOSchema = z.object({
  customerPO: z.string().optional().nullable(),
  requestedDate: z.string().optional().nullable(),
  promisedDate: z.string().optional().nullable(),
  shipToName: z.string().optional().nullable(),
  shipToAddress1: z.string().optional().nullable(),
  shipToAddress2: z.string().optional().nullable(),
  shipToCity: z.string().optional().nullable(),
  shipToState: z.string().optional().nullable(),
  shipToZip: z.string().optional().nullable(),
  shipToCountry: z.string().optional(),
  shippingMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export type UpdateSOInput = z.infer<typeof updateSOSchema>;

// ============================================================================
// Customer Schemas
// ============================================================================

export const createCustomerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // Billing Address
  billingAddress1: z.string().optional(),
  billingAddress2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().default("US"),
  // Shipping Address
  shippingAddress1: z.string().optional(),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().default("US"),
  // Terms
  paymentTerms: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  taxExempt: z.boolean().default(false),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingAddress1: z.string().optional().nullable(),
  billingAddress2: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),
  billingCountry: z.string().optional(),
  shippingAddress1: z.string().optional().nullable(),
  shippingAddress2: z.string().optional().nullable(),
  shippingCity: z.string().optional().nullable(),
  shippingState: z.string().optional().nullable(),
  shippingZip: z.string().optional().nullable(),
  shippingCountry: z.string().optional(),
  paymentTerms: z.string().optional().nullable(),
  creditLimit: z.number().min(0).optional().nullable(),
  taxExempt: z.boolean().optional(),
  taxExemptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ============================================================================
// Shipment Schemas
// ============================================================================

export const SHIPMENT_STATUS = [
  "PENDING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[number];

export const createShipmentLineSchema = z.object({
  salesOrderLineId: z.string(),
  itemId: z.string(),
  qtyShipped: z.number().positive(),
  uom: z.enum(UOMS),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
});

export type CreateShipmentLineInput = z.infer<typeof createShipmentLineSchema>;

export const createShipmentSchema = z.object({
  salesOrderId: z.string(),
  carrier: z.string().optional(),
  serviceLevel: z.string().optional(),
  shipToName: z.string().optional(),
  shipToAddress1: z.string().optional(),
  shipToAddress2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  shipToCountry: z.string().default("US"),
  notes: z.string().optional(),
  lines: z.array(createShipmentLineSchema).min(1),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentSchema = z.object({
  carrier: z.string().optional().nullable(),
  serviceLevel: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const shipmentPackageSchema = z.object({
  packageNumber: z.number().int().positive(),
  trackingNumber: z.string().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  contents: z.string().optional(),
});

export const shipSchema = z.object({
  trackingNumber: z.string().optional(),
  shipDate: z.string().optional(),
  packages: z.array(shipmentPackageSchema).optional(),
});

export type ShipInput = z.infer<typeof shipSchema>;
