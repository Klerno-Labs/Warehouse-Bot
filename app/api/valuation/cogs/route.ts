import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { StockValuationService } from "@server/stock-valuation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const COGSCalculationSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  siteId: z.string().optional(),
  method: z.enum(["FIFO", "LIFO", "WEIGHTED_AVERAGE", "STANDARD"]).default("WEIGHTED_AVERAGE"),
});

/**
 * Cost of Goods Sold (COGS) API
 *
 * POST /api/valuation/cogs - Calculate COGS for a period
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await validateBody(req, COGSCalculationSchema);
    if (body instanceof NextResponse) return body;

    const service = new StockValuationService(context.user.tenantId);

    const cogs = await service.calculateCOGS({
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      siteId: body.siteId,
      method: body.method,
    });

    return NextResponse.json({
      cogs,
      period: {
        start: body.startDate,
        end: body.endDate,
      },
      method: body.method,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
