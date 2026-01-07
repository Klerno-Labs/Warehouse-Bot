/**
 * DBA (DB Anywhere / Manufacturing Software) Import Service
 * 
 * Handles importing and syncing data from DBA Manufacturing to Warehouse Builder.
 * DBA typically exports data via CSV files or direct database access.
 * 
 * Supported DBA tables/exports:
 * - Parts (Items)
 * - BOMs (Bills of Material)
 * - Work Orders / Jobs
 * - Inventory Locations
 * - Inventory Transactions
 * - Purchase Orders
 * - Sales Orders
 * - Customers
 * - Vendors/Suppliers
 */

import { prisma } from "./prisma";
import { z } from "zod";

// ============================================================================
// DBA FIELD MAPPINGS
// ============================================================================

// DBA Part -> Warehouse Builder Item
export const DBAPartSchema = z.object({
  // Core fields
  PARTNO: z.string(),                    // Part number -> sku
  PARTDESC: z.string(),                  // Description -> name
  PARTDESC2: z.string().optional(),      // Secondary desc -> description
  CATEGORY: z.string().optional(),       // Category
  STOCK_UM: z.string(),                  // Stock UOM -> baseUom
  PURCH_UM: z.string().optional(),       // Purchase UOM
  SELL_UM: z.string().optional(),        // Sell UOM
  STOCKING_LOC: z.string().optional(),   // Default location
  
  // Costing
  STD_COST: z.number().optional(),       // Standard cost
  AVG_COST: z.number().optional(),       // Average cost
  LAST_COST: z.number().optional(),      // Last cost
  LIST_PRICE: z.number().optional(),     // List price
  
  // Tracking
  LOT_CONTROL: z.string().optional(),    // Y/N for lot tracking
  SERIAL_CONTROL: z.string().optional(), // Y/N for serial tracking
  
  // Planning
  LEAD_TIME: z.number().optional(),      // Lead time in days
  SAFETY_STOCK: z.number().optional(),   // Safety stock qty
  REORDER_POINT: z.number().optional(),  // Reorder point
  ORDER_QTY: z.number().optional(),      // EOQ
  
  // ABC Classification
  ABC_CODE: z.string().optional(),       // A, B, C classification
  
  // Flags
  ACTIVE: z.string().optional(),         // Y/N
  MAKE_BUY: z.string().optional(),       // M for Make, B for Buy
});

export type DBAPart = z.infer<typeof DBAPartSchema>;

// DBA Work Order -> Warehouse Builder Job
export const DBAWorkOrderSchema = z.object({
  WO_NO: z.string(),                     // Work order number -> orderNumber
  PARTNO: z.string(),                    // Part number
  QTY_ORD: z.number(),                   // Quantity ordered
  QTY_COMP: z.number().optional(),       // Quantity completed
  QTY_SCRAPPED: z.number().optional(),   // Quantity scrapped
  START_DATE: z.string().optional(),     // Start date
  DUE_DATE: z.string().optional(),       // Due date
  STATUS: z.string().optional(),         // Status code
  PRIORITY: z.number().optional(),       // Priority
  ROUTING_NO: z.string().optional(),     // Routing
  CUSTOMER: z.string().optional(),       // Customer code
  SO_NO: z.string().optional(),          // Sales order number
});

export type DBAWorkOrder = z.infer<typeof DBAWorkOrderSchema>;

// DBA Inventory Location
export const DBALocationSchema = z.object({
  LOCATION: z.string(),                  // Location code
  DESCRIPTION: z.string().optional(),    // Description
  WAREHOUSE: z.string().optional(),      // Warehouse code
  ZONE: z.string().optional(),           // Zone
  AISLE: z.string().optional(),          // Aisle
  RACK: z.string().optional(),           // Rack
  BIN: z.string().optional(),            // Bin
  ACTIVE: z.string().optional(),         // Y/N
});

export type DBALocation = z.infer<typeof DBALocationSchema>;

// DBA Inventory Balance
export const DBAInventorySchema = z.object({
  PARTNO: z.string(),                    // Part number
  LOCATION: z.string(),                  // Location
  QTY_ONHAND: z.number(),               // Quantity on hand
  QTY_ALLOCATED: z.number().optional(), // Allocated qty
  QTY_ONORDER: z.number().optional(),   // On order qty
  LOT_NO: z.string().optional(),        // Lot number
  SERIAL_NO: z.string().optional(),     // Serial number
  EXPIRY_DATE: z.string().optional(),   // Expiry date
});

export type DBAInventory = z.infer<typeof DBAInventorySchema>;

// DBA BOM (Bill of Materials)
export const DBABOMSchema = z.object({
  PARENT_PART: z.string(),              // Parent part number
  COMP_PART: z.string(),                // Component part number
  QTY_PER: z.number(),                  // Quantity per
  UOM: z.string().optional(),           // UOM
  SCRAP_PCT: z.number().optional(),     // Scrap percentage
  FIND_NO: z.string().optional(),       // Find/reference number
  EFFECTIVE_DATE: z.string().optional(),// Effective date
  OBSOLETE_DATE: z.string().optional(), // Obsolete date
});

export type DBABOM = z.infer<typeof DBABOMSchema>;

// DBA Purchase Order
export const DBAPurchaseOrderSchema = z.object({
  PO_NO: z.string(),                    // PO number
  VENDOR: z.string(),                   // Vendor code
  STATUS: z.string().optional(),        // Status
  ORDER_DATE: z.string().optional(),    // Order date
  DUE_DATE: z.string().optional(),      // Due date
  SHIP_VIA: z.string().optional(),      // Shipping method
  TERMS: z.string().optional(),         // Payment terms
});

export type DBAPurchaseOrder = z.infer<typeof DBAPurchaseOrderSchema>;

// DBA PO Line
export const DBAPOLineSchema = z.object({
  PO_NO: z.string(),
  LINE_NO: z.number(),
  PARTNO: z.string(),
  QTY_ORD: z.number(),
  QTY_RECV: z.number().optional(),
  UNIT_COST: z.number().optional(),
  DUE_DATE: z.string().optional(),
});

export type DBAPOLine = z.infer<typeof DBAPOLineSchema>;

// ============================================================================
// IMPORT RESULT TYPES
// ============================================================================

export interface ImportResult<T = unknown> {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  data?: T[];
}

export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ImportOptions {
  mode: 'create' | 'update' | 'upsert';
  skipDuplicates?: boolean;
  validateOnly?: boolean;
  batchSize?: number;
}

// ============================================================================
// CSV PARSING UTILITIES
// ============================================================================

/**
 * Parse CSV content into array of objects
 */
export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim().toUpperCase()] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Convert DBA date string to Date object
 */
function parseDBADate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  
  // DBA typically uses MM/DD/YYYY or YYYY-MM-DD
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

// ============================================================================
// DBA IMPORT SERVICE
// ============================================================================

export class DBAImportService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Import parts/items from DBA export
   */
  async importParts(
    data: DBAPart[],
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const batchSize = options.batchSize || 100;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const part = batch[j];
        const rowNum = i + j + 1;

        try {
          // Validate
          const parsed = DBAPartSchema.safeParse(part);
          if (!parsed.success) {
            result.errors.push({
              row: rowNum,
              message: `Validation failed: ${parsed.error.message}`,
            });
            result.skipped++;
            continue;
          }

          if (options.validateOnly) {
            result.imported++;
            continue;
          }

          // Map UOM string to enum (default to EA if not recognized)
          const uomMapping: Record<string, 'EA' | 'FT' | 'YD' | 'ROLL'> = {
            'EA': 'EA',
            'EACH': 'EA',
            'FT': 'FT',
            'FEET': 'FT',
            'YD': 'YD',
            'YARD': 'YD',
            'ROLL': 'ROLL',
          };
          const baseUom = uomMapping[part.STOCK_UM?.toUpperCase()] || 'EA';

          // Skip location assignment for now - DBA imports don't have site context
          // Location assignment would need to be done in a separate step with site info
          const locationId: string | undefined = undefined;

          // Upsert item
          const existing = await prisma.item.findFirst({
            where: {
              tenantId: this.tenantId,
              sku: part.PARTNO,
            },
          });

          if (existing && options.mode === 'create') {
            result.skipped++;
            continue;
          }

          if (!existing && options.mode === 'update') {
            result.skipped++;
            continue;
          }

          const itemData = {
            sku: part.PARTNO,
            name: part.PARTDESC,
            description: part.PARTDESC2 || undefined,
            category: 'PRODUCTION' as const, // Default category, can be overridden
            baseUom: baseUom,
            allowedUoms: JSON.stringify([{ uom: baseUom, toBase: 1 }]),
            reorderPointBase: part.REORDER_POINT || undefined,
            leadTimeDays: part.LEAD_TIME || undefined,
            costBase: part.STD_COST || undefined,
            avgCostBase: part.AVG_COST || undefined,
            lastCostBase: part.LAST_COST || undefined,
          };

          if (existing) {
            await prisma.item.update({
              where: { id: existing.id },
              data: itemData,
            });
            result.updated++;
          } else {
            await prisma.item.create({
              data: {
                tenantId: this.tenantId,
                ...itemData,
              },
            });
            result.imported++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNum,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          result.skipped++;
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import work orders/jobs from DBA export
   */
  /**
   * Import work orders/jobs from DBA export
   * NOTE: Requires a siteId to be passed as it's required for Job creation
   */
  async importWorkOrders(
    data: DBAWorkOrder[],
    siteId: string,
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const wo = data[i];
      const rowNum = i + 1;

      try {
        // Validate
        const parsed = DBAWorkOrderSchema.safeParse(wo);
        if (!parsed.success) {
          result.errors.push({
            row: rowNum,
            message: `Validation failed: ${parsed.error.message}`,
          });
          result.skipped++;
          continue;
        }

        if (options.validateOnly) {
          result.imported++;
          continue;
        }

        // Map DBA status to our status
        const statusMap: Record<string, string> = {
          'R': 'PENDING',
          'O': 'PENDING',
          'S': 'IN_PROGRESS',
          'C': 'COMPLETED',
          'X': 'CANCELLED',
          'H': 'PENDING',
        };
        const status = statusMap[wo.STATUS || 'O'] || 'PENDING';

        // Upsert job
        const existing = await prisma.job.findFirst({
          where: {
            tenantId: this.tenantId,
            jobNumber: wo.WO_NO,
          },
        });

        const jobData = {
          jobNumber: wo.WO_NO,
          description: `DBA WO: ${wo.PARTNO}`,
          status,
          scheduledDate: parseDBADate(wo.DUE_DATE),
          startedAt: parseDBADate(wo.START_DATE),
        };

        if (existing) {
          if (options.mode === 'create') {
            result.skipped++;
            continue;
          }
          await prisma.job.update({
            where: { id: existing.id },
            data: jobData,
          });
          result.updated++;
        } else {
          if (options.mode === 'update') {
            result.skipped++;
            continue;
          }
          await prisma.job.create({
            data: {
              tenantId: this.tenantId,
              siteId: siteId,
              ...jobData,
            },
          });
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import locations from DBA export
   * NOTE: Requires a siteId to be passed as it's required for Location creation
   */
  async importLocations(
    data: DBALocation[],
    siteId: string,
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const loc = data[i];
      const rowNum = i + 1;

      try {
        // Validate
        const parsed = DBALocationSchema.safeParse(loc);
        if (!parsed.success) {
          result.errors.push({
            row: rowNum,
            message: `Validation failed: ${parsed.error.message}`,
          });
          result.skipped++;
          continue;
        }

        if (options.validateOnly) {
          result.imported++;
          continue;
        }

        const existing = await prisma.location.findFirst({
          where: {
            tenantId: this.tenantId,
            siteId: siteId,
            label: loc.LOCATION,
          },
        });

        const locationData = {
          label: loc.LOCATION,
          zone: loc.ZONE || null,
          bin: loc.BIN || null,
          type: null, // DBA export doesn't include location type
        };

        if (existing) {
          if (options.mode === 'create') {
            result.skipped++;
            continue;
          }
          await prisma.location.update({
            where: { id: existing.id },
            data: locationData,
          });
          result.updated++;
        } else {
          if (options.mode === 'update') {
            result.skipped++;
            continue;
          }
          await prisma.location.create({
            data: {
              tenantId: this.tenantId,
              siteId: siteId,
              ...locationData,
            },
          });
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import inventory balances from DBA export
   * NOTE: Requires a siteId to be passed as it's required for InventoryBalance creation
   */
  async importInventoryBalances(
    data: DBAInventory[],
    siteId: string,
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const inv = data[i];
      const rowNum = i + 1;

      try {
        // Validate
        const parsed = DBAInventorySchema.safeParse(inv);
        if (!parsed.success) {
          result.errors.push({
            row: rowNum,
            message: `Validation failed: ${parsed.error.message}`,
          });
          result.skipped++;
          continue;
        }

        if (options.validateOnly) {
          result.imported++;
          continue;
        }

        // Find item
        const item = await prisma.item.findFirst({
          where: { tenantId: this.tenantId, sku: inv.PARTNO },
        });

        if (!item) {
          result.errors.push({
            row: rowNum,
            field: 'PARTNO',
            value: inv.PARTNO,
            message: `Item not found: ${inv.PARTNO}`,
          });
          result.skipped++;
          continue;
        }

        // Find location
        const location = await prisma.location.findFirst({
          where: { tenantId: this.tenantId, siteId: siteId, label: inv.LOCATION },
        });

        if (!location) {
          result.errors.push({
            row: rowNum,
            field: 'LOCATION',
            value: inv.LOCATION,
            message: `Location not found: ${inv.LOCATION}`,
          });
          result.skipped++;
          continue;
        }

        // Upsert inventory balance (note: schema uses qtyBase, not qtyOnHand)
        const existing = await prisma.inventoryBalance.findFirst({
          where: {
            tenantId: this.tenantId,
            itemId: item.id,
            locationId: location.id,
          },
        });

        const balanceData = {
          qtyBase: inv.QTY_ONHAND,
        };

        if (existing) {
          if (options.mode === 'create') {
            result.skipped++;
            continue;
          }
          await prisma.inventoryBalance.update({
            where: { id: existing.id },
            data: balanceData,
          });
          result.updated++;
        } else {
          if (options.mode === 'update') {
            result.skipped++;
            continue;
          }
          await prisma.inventoryBalance.create({
            data: {
              tenantId: this.tenantId,
              siteId: siteId,
              itemId: item.id,
              locationId: location.id,
              ...balanceData,
            },
          });
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import BOMs from DBA export
   */
  async importBOMs(
    data: DBABOM[],
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Group by parent part
    const bomsByParent = new Map<string, DBABOM[]>();
    for (const bom of data) {
      const existing = bomsByParent.get(bom.PARENT_PART) || [];
      existing.push(bom);
      bomsByParent.set(bom.PARENT_PART, existing);
    }

    for (const [parentPart, components] of Array.from(bomsByParent.entries())) {
      try {
        if (options.validateOnly) {
          result.imported += components.length;
          continue;
        }

        // Find parent item
        const parentItem = await prisma.item.findFirst({
          where: { tenantId: this.tenantId, sku: parentPart },
        });

        if (!parentItem) {
          result.errors.push({
            row: 0,
            field: 'PARENT_PART',
            value: parentPart,
            message: `Parent item not found: ${parentPart}`,
          });
          result.skipped += components.length;
          continue;
        }

        // Find or create BOM
        let bom = await prisma.billOfMaterial.findFirst({
          where: {
            tenantId: this.tenantId,
            itemId: parentItem.id,
            status: 'ACTIVE',
          },
        });

        if (!bom) {
          bom = await prisma.billOfMaterial.create({
            data: {
              tenantId: this.tenantId,
              itemId: parentItem.id,
              bomNumber: `BOM-${parentPart}`,
              version: 1,
              status: 'DRAFT',
            },
          });
        }

        // Process components
        let sequence = 1;
        for (const comp of components) {
          const componentItem = await prisma.item.findFirst({
            where: { tenantId: this.tenantId, sku: comp.COMP_PART },
          });

          if (!componentItem) {
            result.errors.push({
              row: 0,
              field: 'COMP_PART',
              value: comp.COMP_PART,
              message: `Component item not found: ${comp.COMP_PART}`,
            });
            result.skipped++;
            continue;
          }

          // Upsert BOM component
          const existingComponent = await prisma.bOMComponent.findFirst({
            where: {
              bomId: bom.id,
              itemId: componentItem.id,
            },
          });

          const componentData = {
            qtyPer: comp.QTY_PER || 1,
            uom: componentItem.baseUom,
            scrapFactor: (comp.SCRAP_PCT || 0) / 100,
            sequence: sequence++,
          };

          if (existingComponent) {
            await prisma.bOMComponent.update({
              where: { id: existingComponent.id },
              data: componentData,
            });
            result.updated++;
          } else {
            await prisma.bOMComponent.create({
              data: {
                bomId: bom.id,
                itemId: componentItem.id,
                ...componentData,
              },
            });
            result.imported++;
          }
        }
      } catch (error) {
        result.errors.push({
          row: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        result.skipped += components.length;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import from CSV file content
   * NOTE: siteId is required for workorders, locations, and inventory imports
   */
  async importFromCSV(
    content: string,
    dataType: 'parts' | 'workorders' | 'locations' | 'inventory' | 'boms',
    siteId: string | null = null,
    options: ImportOptions = { mode: 'upsert' }
  ): Promise<ImportResult> {
    const data = parseCSV(content);

    switch (dataType) {
      case 'parts':
        return this.importParts(data as unknown as DBAPart[], options);
      case 'workorders':
        if (!siteId) {
          return { success: false, imported: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: 'siteId is required for work orders import' }] };
        }
        return this.importWorkOrders(data as unknown as DBAWorkOrder[], siteId, options);
      case 'locations':
        if (!siteId) {
          return { success: false, imported: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: 'siteId is required for locations import' }] };
        }
        return this.importLocations(data as unknown as DBALocation[], siteId, options);
      case 'inventory':
        if (!siteId) {
          return { success: false, imported: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: 'siteId is required for inventory import' }] };
        }
        return this.importInventoryBalances(data as unknown as DBAInventory[], siteId, options);
      case 'boms':
        return this.importBOMs(data as unknown as DBABOM[], options);
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }
}

/**
 * Create a DBA import service for a tenant
 */
export function createDBAImportService(tenantId: string): DBAImportService {
  return new DBAImportService(tenantId);
}
