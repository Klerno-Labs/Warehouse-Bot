import { z } from "zod";

export const UOMS = ["EA", "FT", "YD", "ROLL"] as const;
export type Uom = (typeof UOMS)[number];

export const ITEM_CATEGORIES = [
  "PRODUCTION",
  "PACKAGING",
  "FACILITY",
  "CHEMICAL_MRO",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const LOCATION_TYPES = [
  "RECEIVING",
  "STOCK",
  "WIP",
  "QC_HOLD",
  "SHIPPING",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const REASON_TYPES = ["SCRAP", "ADJUST", "HOLD"] as const;
export type ReasonType = (typeof REASON_TYPES)[number];

export const EVENT_TYPES = [
  "RECEIVE",
  "MOVE",
  "ISSUE_TO_WORKCELL",
  "RETURN",
  "SCRAP",
  "HOLD",
  "RELEASE",
  "COUNT",
  "ADJUST",
] as const;
export type InventoryEventType = (typeof EVENT_TYPES)[number];

export type Item = {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string | null;
  category: ItemCategory;
  baseUom: Uom;
  allowedUoms: Array<{ uom: Uom; toBase: number }>;
  minQtyBase?: number | null;
  maxQtyBase?: number | null;
  reorderPointBase?: number | null;
  leadTimeDays?: number | null;
  barcode?: string | null;
  barcodeType?: string | null;
  alternateBarcode?: string | null;
  costBase?: number | null;
  avgCostBase?: number | null;
  lastCostBase?: number | null;
};

export type Location = {
  id: string;
  tenantId: string;
  siteId: string;
  zone?: string | null;
  bin?: string | null;
  label: string;
  type?: LocationType | null;
};

export type ReasonCode = {
  id: string;
  tenantId: string;
  type: ReasonType;
  code: string;
  description?: string | null;
};

export type InventoryEvent = {
  id: string;
  tenantId: string;
  siteId: string;
  eventType: InventoryEventType;
  itemId: string;
  qtyEntered: number;
  uomEntered: Uom;
  qtyBase: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  workcellId?: string | null;
  referenceId?: string | null;
  reasonCodeId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  deviceId?: string | null;
  createdAt: Date;
};

export type InventoryBalance = {
  id: string;
  tenantId: string;
  siteId: string;
  itemId: string;
  locationId: string;
  qtyBase: number;
};

const allowedUomSchema = z.object({
  uom: z.enum(UOMS),
  toBase: z.number().positive(),
});

export const createItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(ITEM_CATEGORIES),
  baseUom: z.enum(UOMS),
  allowedUoms: z.array(allowedUomSchema).min(1),
  minQtyBase: z.number().optional(),
  maxQtyBase: z.number().optional(),
  reorderPointBase: z.number().optional(),
  leadTimeDays: z.number().int().optional(),
  barcode: z.string().optional(),
  barcodeType: z.string().optional(),
  alternateBarcode: z.string().optional(),
  costBase: z.number().nonnegative().optional(),
  avgCostBase: z.number().nonnegative().optional(),
  lastCostBase: z.number().nonnegative().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createLocationSchema = z.object({
  siteId: z.string().min(1),
  zone: z.string().optional(),
  bin: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(LOCATION_TYPES).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export const createReasonCodeSchema = z.object({
  type: z.enum(REASON_TYPES),
  code: z.string().min(1),
  description: z.string().optional(),
});

export const updateReasonCodeSchema = createReasonCodeSchema.partial();

export const createInventoryEventSchema = z.object({
  siteId: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
  itemId: z.string().min(1),
  qtyEntered: z.number().positive(),
  uomEntered: z.enum(UOMS),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  workcellId: z.string().optional(),
  referenceId: z.string().optional(),
  reasonCodeId: z.string().optional(),
  notes: z.string().optional(),
  deviceId: z.string().optional(),
});
