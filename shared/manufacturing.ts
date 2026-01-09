import { z } from "zod";
import { UOMS } from "./inventory";

// ============================================================================
// Bill of Materials (BOM) Schemas
// ============================================================================

export const BOM_STATUS = ["DRAFT", "ACTIVE", "OBSOLETE"] as const;
export type BOMStatus = (typeof BOM_STATUS)[number];

export const ISSUE_METHODS = ["MANUAL", "BACKFLUSH", "PREISSUE"] as const;
export type IssueMethod = (typeof ISSUE_METHODS)[number];

export const bomComponentSchema = z.object({
  itemId: z.string(),
  sequence: z.number().int(),
  qtyPer: z.number().positive(),
  uom: z.enum(UOMS),
  scrapFactor: z.number().min(0).max(100).default(0),
  isOptional: z.boolean().default(false),
  isPurchased: z.boolean().default(false),
  leadTimeOffset: z.number().int().default(0),
  issueMethod: z.enum(ISSUE_METHODS).default("BACKFLUSH"),
  notes: z.string().optional(),
  referenceDesignator: z.string().optional(),
});

export type BOMComponentInput = z.infer<typeof bomComponentSchema>;

export const createBOMSchema = z.object({
  itemId: z.string(),
  bomNumber: z.string().min(1),
  version: z.number().int().default(1),
  description: z.string().optional(),
  baseQty: z.number().positive().default(1),
  baseUom: z.enum(UOMS).default("EA"),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
  components: z.array(bomComponentSchema).min(1),
});

export type CreateBOMInput = z.infer<typeof createBOMSchema>;

export const updateBOMSchema = createBOMSchema.partial().omit({ components: true });

export type UpdateBOMInput = z.infer<typeof updateBOMSchema>;

// ============================================================================
// Production Order Schemas
// ============================================================================

export const PRODUCTION_ORDER_STATUS = [
  "DRAFT",
  "RELEASED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUS)[number];

export const createProductionOrderSchema = z.object({
  siteId: z.string(),
  bomId: z.string(),
  orderNumber: z.string().min(1),
  itemId: z.string(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(UOMS),
  scheduledStart: z.string(),
  scheduledEnd: z.string().optional(),
  workcellId: z.string().optional(),
  lotNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  priority: z.number().int().min(1).max(10).default(5),
  notes: z.string().optional(),
});

export type CreateProductionOrderInput = z.infer<typeof createProductionOrderSchema>;

export const updateProductionOrderSchema = createProductionOrderSchema.partial();

export type UpdateProductionOrderInput = z.infer<typeof updateProductionOrderSchema>;

// ============================================================================
// Component Consumption Schemas
// ============================================================================

export const consumeComponentSchema = z.object({
  componentId: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  qtyConsumed: z.number().positive(),
  uom: z.enum(UOMS),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type ConsumeComponentInput = z.infer<typeof consumeComponentSchema>;

// ============================================================================
// Production Output Schemas
// ============================================================================

export const productionOutputSchema = z.object({
  qtyProduced: z.number().positive(),
  uom: z.enum(UOMS),
  locationId: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type ProductionOutputInput = z.infer<typeof productionOutputSchema>;

// ============================================================================
// Yield/Scrap Reporting Schemas
// ============================================================================

export const yieldReportSchema = z.object({
  qtyGood: z.number().min(0),
  qtyScrap: z.number().min(0),
  qtyRework: z.number().min(0).optional(),
  uom: z.enum(UOMS),
  scrapReasonId: z.string().optional(),
  notes: z.string().optional(),
});

export type YieldReportInput = z.infer<typeof yieldReportSchema>;
