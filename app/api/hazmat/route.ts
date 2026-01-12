import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { HazmatService } from "@server/cold-chain-hazmat";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ClassifyItemSchema = z.object({
  itemId: z.string(),
  unNumber: z.string(),
  packingGroup: z.enum(["I", "II", "III"]),
  properShippingName: z.string(),
  technicalName: z.string().optional(),
});

const CheckSegregationSchema = z.object({
  itemIds: z.array(z.string()),
  locationId: z.string().optional(),
});

/**
 * Hazmat Management API
 *
 * GET /api/hazmat - Get dashboard
 * GET /api/hazmat?view=classes - Get hazmat classes
 * GET /api/hazmat?view=inventory - Get hazmat inventory
 * POST /api/hazmat?action=classify - Classify item
 * POST /api/hazmat?action=segregation - Check segregation
 * POST /api/hazmat?action=validate - Validate shipment
 * POST /api/hazmat?action=dgd - Generate dangerous goods declaration
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    const service = new HazmatService(context.user.tenantId);

    if (view === "classes") {
      const classes = await service.getHazmatClasses();
      return NextResponse.json({ classes });
    }

    if (view === "inventory") {
      const inventory = await service.getHazmatInventory();
      return NextResponse.json({ inventory });
    }

    // Default - dashboard
    const dashboard = await service.getHazmatDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new HazmatService(context.user.tenantId);

    if (action === "classify") {
      const body = await validateBody(req, ClassifyItemSchema);
      if (body instanceof NextResponse) return body;

      const hazmatItem = await service.classifyItem(body);

      await createAuditLog(
        context,
        "CLASSIFY",
        "HazmatItem",
        body.itemId,
        `Classified item as ${hazmatItem.hazmatClass} (UN${body.unNumber})`
      );

      return NextResponse.json({
        success: true,
        hazmatItem,
      });
    }

    if (action === "segregation") {
      const body = await validateBody(req, CheckSegregationSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.checkSegregation(body);
      return NextResponse.json(result);
    }

    if (action === "validate") {
      const body = await req.json();
      const result = await service.validateHazmatShipment(body.shipmentId);
      return NextResponse.json(result);
    }

    if (action === "dgd") {
      const body = await req.json();
      const document = await service.generateDangerousGoodsDeclaration(body.shipmentId);

      await createAuditLog(
        context,
        "GENERATE",
        "DangerousGoodsDeclaration",
        document.documentId,
        `Generated DGD for shipment ${body.shipmentId}`
      );

      return NextResponse.json({
        success: true,
        document,
      });
    }

    if (action === "shipping-paper") {
      const body = await req.json();
      const document = await service.generateShippingPaper(body.shipmentId);

      await createAuditLog(
        context,
        "GENERATE",
        "HazmatShippingPaper",
        document.documentId,
        `Generated hazmat shipping paper for ${body.shipmentId}`
      );

      return NextResponse.json({
        success: true,
        document,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
