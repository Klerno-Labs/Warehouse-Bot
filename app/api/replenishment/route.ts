import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { AutoReplenishmentService } from "@server/auto-replenishment";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CalculateEOQSchema = z.object({
  itemId: z.string(),
  siteId: z.string().optional(),
  annualDemand: z.number().positive().optional(),
  orderingCost: z.number().positive().optional(),
  holdingCostPercent: z.number().min(0).max(1).optional(),
});

const UpdateParametersSchema = z.object({
  itemId: z.string(),
  siteId: z.string().optional(),
  safetyStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  eoq: z.number().positive().optional(),
  minOrderQty: z.number().positive().optional(),
  maxOrderQty: z.number().positive().optional(),
  serviceLevel: z.number().min(0).max(1).optional(),
});

/**
 * Auto-Replenishment API
 *
 * GET /api/replenishment - Get items needing replenishment
 * POST /api/replenishment/calculate - Calculate EOQ and safety stock
 * PUT /api/replenishment - Update replenishment parameters
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const includeForecasted = searchParams.get("includeForecasted") === "true";

    const service = new AutoReplenishmentService(context.user.tenantId);
    const items = await service.getItemsNeedingReplenishment(siteId, includeForecasted);

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CalculateEOQSchema);
    if (body instanceof NextResponse) return body;

    const service = new AutoReplenishmentService(context.user.tenantId);

    const calculation = await service.calculateOptimalParameters({
      itemId: body.itemId,
      siteId: body.siteId,
      annualDemand: body.annualDemand,
      orderingCost: body.orderingCost,
      holdingCostPercent: body.holdingCostPercent,
    });

    return NextResponse.json({
      calculation,
      recommendations: {
        eoq: calculation.eoq,
        safetyStock: calculation.safetyStock,
        reorderPoint: calculation.reorderPoint,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, UpdateParametersSchema);
    if (body instanceof NextResponse) return body;

    const service = new AutoReplenishmentService(context.user.tenantId);

    const updated = await service.updateReplenishmentParameters(body);

    await createAuditLog(
      context,
      "UPDATE",
      "ReplenishmentParameters",
      body.itemId,
      `Updated replenishment parameters`
    );

    return NextResponse.json({
      success: true,
      parameters: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
