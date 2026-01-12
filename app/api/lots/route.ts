import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LotSerialTrackingService } from "@server/lot-serial-tracking";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AllocateSchema = z.object({
  itemId: z.string(),
  siteId: z.string(),
  quantity: z.number().positive(),
  strategy: z.enum(["FIFO", "LIFO", "FEFO"]).default("FIFO"),
  requireLotTracking: z.boolean().default(false),
  requireSerialTracking: z.boolean().default(false),
});

const CreateLotSchema = z.object({
  itemId: z.string(),
  siteId: z.string(),
  lotNumber: z.string(),
  quantity: z.number().positive(),
  expirationDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
  supplierId: z.string().optional(),
  certificateOfAnalysis: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Lot Tracking API
 *
 * GET /api/lots - List lots with filtering
 * POST /api/lots - Create new lot
 * POST /api/lots/allocate - Allocate inventory using FIFO/LIFO/FEFO
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId") || undefined;
    const siteId = searchParams.get("siteId") || undefined;
    const status = searchParams.get("status") || undefined;
    const expiringWithinDays = searchParams.get("expiringWithinDays");

    const service = new LotSerialTrackingService(context.user.tenantId);

    // Get expiring lots if requested
    if (expiringWithinDays) {
      const expiringLots = await service.getExpiringLots(
        parseInt(expiringWithinDays),
        siteId
      );
      return NextResponse.json({ lots: expiringLots });
    }

    // Get lots by item if specified
    if (itemId) {
      const lotHistory = await service.getLotHistory(itemId);
      return NextResponse.json({ lots: lotHistory });
    }

    // Return empty for now - would need a getLots method
    return NextResponse.json({ lots: [] });
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

    const body = await validateBody(req, CreateLotSchema);
    if (body instanceof NextResponse) return body;

    const service = new LotSerialTrackingService(context.user.tenantId);

    const lot = await service.createLot({
      itemId: body.itemId,
      siteId: body.siteId,
      lotNumber: body.lotNumber,
      quantity: body.quantity,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
      manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : undefined,
      supplierId: body.supplierId,
      certificateOfAnalysis: body.certificateOfAnalysis,
      notes: body.notes,
    });

    await createAuditLog(
      context,
      "CREATE",
      "Lot",
      lot.id,
      `Created lot ${body.lotNumber} for item ${body.itemId}`
    );

    return NextResponse.json({ lot }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
