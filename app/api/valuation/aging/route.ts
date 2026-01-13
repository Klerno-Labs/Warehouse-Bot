import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { StockValuationService } from "@server/stock-valuation";

export const dynamic = "force-dynamic";

/**
 * Inventory Aging Report API
 *
 * GET /api/valuation/aging - Get inventory aging analysis
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const buckets = searchParams.get("buckets")?.split(",").map(Number) || [30, 60, 90, 180, 365];

    const service = new StockValuationService(context.user.tenantId);

    const aging = await service.getInventoryAging({
      siteId,
      agingBuckets: buckets,
    });

    return NextResponse.json({
      aging,
      buckets,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
