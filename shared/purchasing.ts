import { z } from "zod";
import { UOMS } from "./inventory";

// ============================================================================
// Purchase Order Schemas
// ============================================================================

export const PURCHASE_ORDER_STATUS = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "ORDERED",
  "PARTIAL",
  "RECEIVED",
  "CANCELLED",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUS)[number];

export const createPOLineSchema = z.object({
  itemId: z.string(),
  lineNumber: z.number().int(),
  description: z.string().optional(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(UOMS),
  unitPrice: z.number().min(0),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

export type CreatePOLineInput = z.infer<typeof createPOLineSchema>;

export const createPOSchema = z.object({
  supplierId: z.string(),
  poNumber: z.string().min(1),
  orderDate: z.string(),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(createPOLineSchema).min(1),
});

export type CreatePOInput = z.infer<typeof createPOSchema>;

export const updatePOSchema = createPOSchema.partial().omit({ lines: true });

export type UpdatePOInput = z.infer<typeof updatePOSchema>;

// ============================================================================
// Supplier Schemas
// ============================================================================

export const createSupplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().optional(),
  notes: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ============================================================================
// Receipt Schemas
// ============================================================================

export const createReceiptLineSchema = z.object({
  purchaseOrderLineId: z.string(),
  itemId: z.string(),
  qtyReceived: z.number().positive(),
  uom: z.enum(UOMS),
  locationId: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateReceiptLineInput = z.infer<typeof createReceiptLineSchema>;

export const createReceiptSchema = z.object({
  purchaseOrderId: z.string(),
  receiptNumber: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(createReceiptLineSchema).min(1),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
