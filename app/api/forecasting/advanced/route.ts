import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { DemandForecastingService } from "@server/demand-forecasting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GenerateForecastSchema = z.object({
  itemId: z.string(),
  siteId: z.string().optional(),
  algorithm: z.enum([
    "SIMPLE_MOVING_AVERAGE",
    "WEIGHTED_MOVING_AVERAGE",
    "EXPONENTIAL_SMOOTHING",
    "HOLT_WINTERS",
    "LINEAR_REGRESSION",
    "AUTO"
  ]).default("AUTO"),
  forecastPeriods: z.number().int().min(1).max(52).default(12),
  historicalWeeks: z.number().int().min(4).max(104).default(52),
  smoothingFactor: z.number().min(0).max(1).optional(),
});

/**
 * Advanced Demand Forecasting API
 *
 * POST /api/forecasting/advanced - Generate forecast with specific algorithm
 * GET /api/forecasting/advanced?itemId=xxx - Get existing forecast
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const siteId = searchParams.get("siteId") || undefined;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    const service = new DemandForecastingService(context.user.tenantId);
    const forecast = await service.getForecast(itemId, siteId);

    if (!forecast) {
      return NextResponse.json(
        { error: "No forecast found for this item" },
        { status: 404 }
      );
    }

    return NextResponse.json({ forecast });
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

    const body = await validateBody(req, GenerateForecastSchema);
    if (body instanceof NextResponse) return body;

    const service = new DemandForecastingService(context.user.tenantId);

    const forecast = await service.generateForecast({
      itemId: body.itemId,
      siteId: body.siteId,
      algorithm: body.algorithm,
      forecastPeriods: body.forecastPeriods,
      historicalWeeks: body.historicalWeeks,
      smoothingFactor: body.smoothingFactor,
    });

    return NextResponse.json({
      forecast,
      algorithm: body.algorithm,
      message: `Generated ${body.forecastPeriods}-period forecast`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
