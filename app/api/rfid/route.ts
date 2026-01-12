import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { RFIDService } from "@server/rfid-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RegisterTagSchema = z.object({
  epc: z.string(),
  itemId: z.string(),
  lotId: z.string().optional(),
  serialNumber: z.string().optional(),
  locationId: z.string().optional(),
  siteId: z.string(),
});

const BulkScanSchema = z.object({
  epcs: z.array(z.string()),
  readerId: z.string(),
  siteId: z.string(),
  scanType: z.enum(["INVENTORY", "RECEIVING", "SHIPPING", "TRANSFER"]).default("INVENTORY"),
});

/**
 * RFID Management API
 *
 * GET /api/rfid?epc=xxx - Get tag details
 * POST /api/rfid - Register new tag
 * PUT /api/rfid - Process bulk scan
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const epc = searchParams.get("epc");
    const itemId = searchParams.get("itemId");
    const siteId = searchParams.get("siteId") || undefined;

    const service = new RFIDService(context.user.tenantId);

    if (epc) {
      const tag = await service.getTagByEPC(epc);
      if (!tag) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
      return NextResponse.json({ tag });
    }

    if (itemId) {
      const tags = await service.getTagsByItem(itemId, siteId);
      return NextResponse.json({ tags });
    }

    return NextResponse.json(
      { error: "epc or itemId is required" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, RegisterTagSchema);
    if (body instanceof NextResponse) return body;

    const service = new RFIDService(context.user.tenantId);

    const tag = await service.registerTag({
      epc: body.epc,
      itemId: body.itemId,
      lotId: body.lotId,
      serialNumber: body.serialNumber,
      locationId: body.locationId,
      siteId: body.siteId,
    });

    await createAuditLog(
      context,
      "REGISTER",
      "RFIDTag",
      body.epc,
      `Registered RFID tag for item ${body.itemId}`
    );

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, BulkScanSchema);
    if (body instanceof NextResponse) return body;

    const service = new RFIDService(context.user.tenantId);

    const result = await service.processBulkScan({
      epcs: body.epcs,
      readerId: body.readerId,
      siteId: body.siteId,
      scanType: body.scanType,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "BULK_SCAN",
      "RFID",
      body.readerId,
      `Processed ${body.epcs.length} RFID scans (${body.scanType})`
    );

    return NextResponse.json({
      success: true,
      result,
      scannedCount: body.epcs.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
