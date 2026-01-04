import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { ForecastingService } from "@server/forecasting";

/**
 * Inventory Forecasting API
 *
 * GET /api/forecasting?itemId=xxx&siteId=xxx&forecastDays=30&historicalDays=90
 * - Get demand forecast for specific item or all items
 *
 * GET /api/forecasting/item/:itemId
 * - Get detailed forecast for a specific item
 *
 * POST /api/forecasting/generate
 * - Generate forecasts for all items
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const siteId = searchParams.get("siteId") || undefined;
    const forecastDays = parseInt(searchParams.get("forecastDays") || "30");
    const historicalDays = parseInt(searchParams.get("historicalDays") || "90");

    // Validate parameters
    if (forecastDays < 1 || forecastDays > 365) {
      return NextResponse.json(
        { error: "Forecast days must be between 1 and 365" },
        { status: 400 }
      );
    }

    if (historicalDays < 7 || historicalDays > 365) {
      return NextResponse.json(
        { error: "Historical days must be between 7 and 365" },
        { status: 400 }
      );
    }

    // Get forecast for specific item
    if (itemId) {
      const forecast = await ForecastingService.forecastItem(
        itemId,
        context.user.tenantId,
        siteId,
        forecastDays,
        historicalDays
      );

      if (!forecast) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(forecast);
    }

    // Generate forecast for all items
    const analysis = await ForecastingService.generateForecast(
      context.user.tenantId,
      siteId,
      forecastDays,
      historicalDays
    );

    return NextResponse.json(analysis);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await req.json();
    const { siteId, forecastDays = 30, historicalDays = 90 } = body;

    // Generate fresh forecasts
    const analysis = await ForecastingService.generateForecast(
      context.user.tenantId,
      siteId,
      forecastDays,
      historicalDays
    );

    return NextResponse.json({
      success: true,
      analysis,
      message: `Generated forecasts for ${analysis.items.length} items`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
