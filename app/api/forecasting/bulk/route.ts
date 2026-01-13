import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { DemandForecastingService } from "@server/demand-forecasting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BulkForecastSchema = z.object({
  siteId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  algorithm: z.enum([
    "SIMPLE_MOVING_AVERAGE",
    "WEIGHTED_MOVING_AVERAGE",
    "EXPONENTIAL_SMOOTHING",
    "HOLT_WINTERS",
    "LINEAR_REGRESSION",
    "AUTO"
  ]).default("AUTO"),
  forecastPeriods: z.number().int().min(1).max(52).default(12),
});

/**
 * Bulk Demand Forecasting API
 *
 * POST /api/forecasting/bulk - Generate forecasts for multiple items
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, BulkForecastSchema);
    if (body instanceof NextResponse) return body;

    const service = new DemandForecastingService(context.user.tenantId);

    const results = await service.generateBulkForecasts({
      siteId: body.siteId,
      itemIds: body.itemIds,
      algorithm: body.algorithm,
      forecastPeriods: body.forecastPeriods,
    });

    await createAuditLog(
      context,
      "GENERATE_BULK",
      "Forecast",
      `bulk-${Date.now()}`,
      `Generated ${results.forecasts.length} forecasts using ${body.algorithm}`
    );

    return NextResponse.json({
      forecasts: results.forecasts,
      errors: results.errors,
      successCount: results.forecasts.length,
      errorCount: results.errors.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
