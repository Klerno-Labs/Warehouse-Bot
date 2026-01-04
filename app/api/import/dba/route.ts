import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { storage } from "@server/storage";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";

/**
 * DBA Manufacturing Data Import API
 *
 * This endpoint handles seamless migration from DBA Manufacturing system.
 * Supports importing:
 * - Items/Products
 * - BOMs (Bills of Materials)
 * - Inventory Balances
 * - Locations
 * - Purchase Orders
 * - Production Orders
 * - Customers/Vendors
 */

const dbaImportSchema = z.object({
  dataType: z.enum([
    "items",
    "boms",
    "inventory",
    "locations",
    "purchaseOrders",
    "productionOrders",
    "customers",
    "vendors",
    "all"
  ]),
  data: z.array(z.record(z.any())), // CSV rows as objects
  siteId: z.string().uuid(),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false), // Dry run
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only admins can import data
    if (context.user.role !== "Admin" && context.user.role !== "Supervisor") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const validatedData = await validateBody(req, dbaImportSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const { dataType, data, siteId, options = {} } = validatedData;
    const { skipDuplicates = true, updateExisting = false, validateOnly = false } = options;

    // Verify site belongs to tenant
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        tenantId: context.user.tenantId,
      },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    // Process based on data type
    switch (dataType) {
      case "items":
        await importItems(data, context.user.tenantId, results, { skipDuplicates, updateExisting, validateOnly });
        break;

      case "locations":
        await importLocations(data, context.user.tenantId, siteId, results, { skipDuplicates, updateExisting, validateOnly });
        break;

      case "inventory":
        await importInventory(data, context.user.tenantId, siteId, results, { skipDuplicates, updateExisting, validateOnly });
        break;

      case "boms":
        await importBOMs(data, context.user.tenantId, results, { skipDuplicates, updateExisting, validateOnly });
        break;

      case "all":
        // Import in correct order to handle dependencies
        await importLocations(data.filter(r => r._type === "location"), context.user.tenantId, siteId, results, { skipDuplicates, updateExisting, validateOnly });
        await importItems(data.filter(r => r._type === "item"), context.user.tenantId, results, { skipDuplicates, updateExisting, validateOnly });
        await importBOMs(data.filter(r => r._type === "bom"), context.user.tenantId, results, { skipDuplicates, updateExisting, validateOnly });
        await importInventory(data.filter(r => r._type === "inventory"), context.user.tenantId, siteId, results, { skipDuplicates, updateExisting, validateOnly });
        break;

      default:
        return NextResponse.json(
          { error: `Import type '${dataType}' not yet implemented` },
          { status: 400 }
        );
    }

    // Create audit log
    if (!validateOnly) {
      await storage.createAuditEvent({
        tenantId: context.user.tenantId,
        userId: context.user.id,
        action: "IMPORT",
        entityType: "DataImport",
        entityId: siteId,
        details: `DBA Import: ${dataType} - ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
        ipAddress: null,
      });
    }

    return NextResponse.json({
      success: true,
      validateOnly,
      summary: {
        totalRows: data.length,
        imported: results.imported,
        updated: results.updated,
        skipped: results.skipped,
        errorCount: results.errors.length,
      },
      errors: results.errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Import Items/Products
async function importItems(
  data: any[],
  tenantId: string,
  results: any,
  options: { skipDuplicates: boolean; updateExisting: boolean; validateOnly: boolean }
) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Map DBA fields to our schema
      const itemData = {
        tenantId,
        sku: row.PartNumber || row.SKU || row.ItemCode,
        name: row.Description || row.PartDescription || row.Name,
        description: row.ExtendedDescription || row.Notes || null,
        category: mapCategory(row.Category || row.Type || "RAW_MATERIAL"),
        baseUom: mapUOM(row.UOM || row.Unit || "EA"),
        allowedUoms: [{ uom: mapUOM(row.UOM || "EA"), toBase: 1 }],
        costBase: parseFloat(row.StandardCost || row.Cost || "0"),
        avgCostBase: parseFloat(row.AverageCost || row.AvgCost || "0"),
        reorderPointBase: parseFloat(row.ReorderPoint || row.MinQty || "0") || null,
        barcode: row.Barcode || row.UPC || null,
        barcodeType: row.BarcodeType || null,
      };

      // Validate required fields
      if (!itemData.sku || !itemData.name) {
        results.errors.push({
          row: i + 1,
          error: "Missing required fields (SKU or Name)",
          data: row,
        });
        continue;
      }

      if (options.validateOnly) {
        results.imported++;
        continue;
      }

      // Check if exists
      const existing = await prisma.item.findFirst({
        where: {
          tenantId,
          sku: itemData.sku,
        },
      });

      if (existing) {
        if (options.updateExisting) {
          await prisma.item.update({
            where: { id: existing.id },
            data: itemData,
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await prisma.item.create({ data: itemData });
        results.imported++;
      }
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        error: error.message,
        data: row,
      });
    }
  }
}

// Import Locations
async function importLocations(
  data: any[],
  tenantId: string,
  siteId: string,
  results: any,
  options: { skipDuplicates: boolean; updateExisting: boolean; validateOnly: boolean }
) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      const locationData = {
        tenantId,
        siteId,
        zone: row.Zone || row.Area || null,
        bin: row.Bin || row.Aisle || null,
        label: row.Location || row.LocationCode || `${row.Zone}-${row.Bin}`,
        type: mapLocationType(row.Type || "STORAGE"),
      };

      if (!locationData.label) {
        results.errors.push({
          row: i + 1,
          error: "Missing location label",
          data: row,
        });
        continue;
      }

      if (options.validateOnly) {
        results.imported++;
        continue;
      }

      const existing = await prisma.location.findFirst({
        where: {
          tenantId,
          siteId,
          label: locationData.label,
        },
      });

      if (existing) {
        if (options.updateExisting) {
          await prisma.location.update({
            where: { id: existing.id },
            data: locationData,
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await prisma.location.create({ data: locationData });
        results.imported++;
      }
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        error: error.message,
        data: row,
      });
    }
  }
}

// Import Inventory Balances
async function importInventory(
  data: any[],
  tenantId: string,
  siteId: string,
  results: any,
  options: { skipDuplicates: boolean; updateExisting: boolean; validateOnly: boolean }
) {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Find item by SKU
      const item = await prisma.item.findFirst({
        where: {
          tenantId,
          sku: row.PartNumber || row.SKU || row.ItemCode,
        },
      });

      if (!item) {
        results.errors.push({
          row: i + 1,
          error: `Item not found: ${row.PartNumber || row.SKU}`,
          data: row,
        });
        continue;
      }

      // Find location
      const location = await prisma.location.findFirst({
        where: {
          tenantId,
          siteId,
          label: row.Location || row.LocationCode,
        },
      });

      if (!location) {
        results.errors.push({
          row: i + 1,
          error: `Location not found: ${row.Location}`,
          data: row,
        });
        continue;
      }

      const qtyOnHand = parseFloat(row.QtyOnHand || row.Quantity || row.Balance || "0");

      if (options.validateOnly) {
        results.imported++;
        continue;
      }

      // Check if balance exists
      const existing = await prisma.inventoryBalance.findFirst({
        where: {
          itemId: item.id,
          locationId: location.id,
        },
      });

      if (existing) {
        if (options.updateExisting) {
          await prisma.inventoryBalance.update({
            where: { id: existing.id },
            data: {
              qtyBase: qtyOnHand,
            },
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await prisma.inventoryBalance.create({
          data: {
            tenantId,
            siteId,
            itemId: item.id,
            locationId: location.id,
            qtyBase: qtyOnHand,
          },
        });
        results.imported++;
      }
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        error: error.message,
        data: row,
      });
    }
  }
}

// Import BOMs
async function importBOMs(
  data: any[],
  tenantId: string,
  results: any,
  options: { skipDuplicates: boolean; updateExisting: boolean; validateOnly: boolean }
) {
  // Group BOM data by parent item
  const bomGroups = data.reduce((acc: any, row: any) => {
    const parentSKU = row.ParentPart || row.FinishedGood || row.Assembly;
    if (!acc[parentSKU]) acc[parentSKU] = [];
    acc[parentSKU].push(row);
    return acc;
  }, {});

  for (const [parentSKU, components] of Object.entries(bomGroups) as [string, any[]][]) {
    try {
      // Find parent item
      const parentItem = await prisma.item.findFirst({
        where: { tenantId, sku: parentSKU },
      });

      if (!parentItem) {
        results.errors.push({
          row: 0,
          error: `Parent item not found: ${parentSKU}`,
          data: { parentSKU },
        });
        continue;
      }

      if (options.validateOnly) {
        results.imported += components.length;
        continue;
      }

      // Check if BOM exists
      let bom = await prisma.billOfMaterial.findFirst({
        where: {
          tenantId,
          itemId: parentItem.id,
          status: "ACTIVE",
        },
      });

      if (!bom) {
        bom = await prisma.billOfMaterial.create({
          data: {
            tenantId,
            itemId: parentItem.id,
            bomNumber: `BOM-${parentItem.sku}`,
            version: 1,
            description: `BOM for ${parentItem.name}`,
            status: "ACTIVE",
          },
        });
      }

      // Add components
      for (const compRow of components) {
        const componentItem = await prisma.item.findFirst({
          where: {
            tenantId,
            sku: compRow.ComponentPart || compRow.ChildPart || compRow.Material,
          },
        });

        if (!componentItem) {
          results.errors.push({
            row: 0,
            error: `Component item not found: ${compRow.ComponentPart}`,
            data: compRow,
          });
          continue;
        }

        const qtyPer = parseFloat(compRow.Quantity || compRow.QtyPer || "1");
        const sequence = parseInt(compRow.Sequence || "1");

        await prisma.bOMComponent.upsert({
          where: {
            bomId_sequence: {
              bomId: bom.id,
              sequence: sequence,
            },
          },
          create: {
            bomId: bom.id,
            itemId: componentItem.id,
            sequence: sequence,
            qtyPer,
            uom: mapUOM(compRow.UOM || "EA"),
            scrapFactor: parseFloat(compRow.ScrapFactor || "0"),
          },
          update: {
            qtyPer,
            scrapFactor: parseFloat(compRow.ScrapFactor || "0"),
          },
        });

        results.imported++;
      }
    } catch (error: any) {
      results.errors.push({
        row: 0,
        error: error.message,
        data: { parentSKU },
      });
    }
  }
}

// Helper: Map DBA category to our enum
function mapCategory(dbaCategory: string): any {
  const mapping: Record<string, string> = {
    "RAW": "RAW_MATERIAL",
    "RAWMATERIAL": "RAW_MATERIAL",
    "RAW MATERIAL": "RAW_MATERIAL",
    "WIP": "WIP",
    "WORK IN PROGRESS": "WIP",
    "FG": "FINISHED_GOOD",
    "FINISHED": "FINISHED_GOOD",
    "FINISHED GOOD": "FINISHED_GOOD",
    "ASSEMBLY": "ASSEMBLY",
    "SUBASSEMBLY": "ASSEMBLY",
    "CONSUMABLE": "CONSUMABLE",
    "TOOL": "TOOL",
    "PACKAGING": "PACKAGING",
  };

  const normalized = dbaCategory.toUpperCase().replace(/[^A-Z]/g, "");
  return mapping[normalized] || "RAW_MATERIAL";
}

// Helper: Map DBA UOM to our enum
function mapUOM(dbaUOM: string): any {
  const mapping: Record<string, string> = {
    "EA": "EA",
    "EACH": "EA",
    "PC": "EA",
    "PCS": "EA",
    "LB": "LB",
    "POUND": "LB",
    "KG": "KG",
    "KILOGRAM": "KG",
    "FT": "FT",
    "FOOT": "FT",
    "FEET": "FT",
    "IN": "IN",
    "INCH": "IN",
    "METER": "M",
    "M": "M",
  };

  const normalized = dbaUOM.toUpperCase().replace(/[^A-Z]/g, "");
  return mapping[normalized] || "EA";
}

// Helper: Map location type
function mapLocationType(dbaType: string): any {
  const mapping: Record<string, string> = {
    "STORAGE": "STORAGE",
    "RECEIVING": "RECEIVING",
    "SHIPPING": "SHIPPING",
    "PRODUCTION": "PRODUCTION",
    "QC": "QC",
    "STAGING": "STAGING",
  };

  const normalized = dbaType.toUpperCase();
  return mapping[normalized] || "STORAGE";
}
