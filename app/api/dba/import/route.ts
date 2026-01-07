import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { 
  DBAImportService,
  createDBAImportService,
  parseCSV,
  type ImportOptions,
  type ImportResult,
} from "@server/dba-import";
import { z } from "zod";

const ImportRequestSchema = z.object({
  dataType: z.enum(['parts', 'workorders', 'locations', 'inventory', 'boms']),
  mode: z.enum(['create', 'update', 'upsert']).default('upsert'),
  validateOnly: z.boolean().default(false),
  csvContent: z.string().min(1),
  siteId: z.string().optional(), // Required for workorders, locations, and inventory imports
});

/**
 * POST /api/dba/import
 * Import data from DBA CSV export
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Check admin/manager role
    if (!['ADMIN', 'MANAGER'].includes(context.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions for DBA import" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = ImportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dataType, mode, validateOnly, csvContent, siteId } = parsed.data;

    const importService = createDBAImportService(context.user.tenantId);
    
    const options: ImportOptions = {
      mode,
      validateOnly,
    };

    const result = await importService.importFromCSV(csvContent, dataType, siteId || null, options);

    return NextResponse.json({
      success: result.success,
      dataType,
      mode,
      validateOnly,
      summary: {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
      },
      errors: result.errors.slice(0, 50), // Limit errors returned
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/dba/import
 * Get import template/field mappings info
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    return NextResponse.json({
      supportedFormats: ['CSV'],
      dataTypes: [
        {
          type: 'parts',
          name: 'Parts/Items',
          description: 'Import items from DBA Parts export',
          requiredFields: ['PARTNO', 'PARTDESC', 'STOCK_UM'],
          optionalFields: [
            'PARTDESC2', 'CATEGORY', 'PURCH_UM', 'SELL_UM', 'STOCKING_LOC',
            'STD_COST', 'AVG_COST', 'LAST_COST', 'LIST_PRICE',
            'LOT_CONTROL', 'SERIAL_CONTROL', 'LEAD_TIME', 'SAFETY_STOCK',
            'REORDER_POINT', 'ORDER_QTY', 'ABC_CODE', 'ACTIVE', 'MAKE_BUY'
          ],
        },
        {
          type: 'workorders',
          name: 'Work Orders/Jobs',
          description: 'Import work orders from DBA WO export',
          requiredFields: ['WO_NO', 'PARTNO', 'QTY_ORD'],
          optionalFields: [
            'QTY_COMP', 'QTY_SCRAPPED', 'START_DATE', 'DUE_DATE',
            'STATUS', 'PRIORITY', 'ROUTING_NO', 'CUSTOMER', 'SO_NO'
          ],
        },
        {
          type: 'locations',
          name: 'Locations',
          description: 'Import inventory locations from DBA',
          requiredFields: ['LOCATION'],
          optionalFields: [
            'DESCRIPTION', 'WAREHOUSE', 'ZONE', 'AISLE', 'RACK', 'BIN', 'ACTIVE'
          ],
        },
        {
          type: 'inventory',
          name: 'Inventory Balances',
          description: 'Import on-hand quantities from DBA',
          requiredFields: ['PARTNO', 'LOCATION', 'QTY_ONHAND'],
          optionalFields: [
            'QTY_ALLOCATED', 'QTY_ONORDER', 'LOT_NO', 'SERIAL_NO', 'EXPIRY_DATE'
          ],
        },
        {
          type: 'boms',
          name: 'Bills of Material',
          description: 'Import BOMs from DBA',
          requiredFields: ['PARENT_PART', 'COMP_PART', 'QTY_PER'],
          optionalFields: [
            'UOM', 'SCRAP_PCT', 'FIND_NO', 'EFFECTIVE_DATE', 'OBSOLETE_DATE'
          ],
        },
      ],
      importModes: [
        { mode: 'create', description: 'Only create new records, skip existing' },
        { mode: 'update', description: 'Only update existing records, skip new' },
        { mode: 'upsert', description: 'Create new records and update existing' },
      ],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
