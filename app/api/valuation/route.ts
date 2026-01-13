import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { StockValuationService } from "@server/stock-valuation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CalculateValuationSchema = z.object({
  itemId: z.string(),
  siteId: z.string().optional(),
  method: z.enum(["FIFO", "LIFO", "WEIGHTED_AVERAGE", "STANDARD"]).default("WEIGHTED_AVERAGE"),
  asOfDate: z.string().optional(),
});

/**
 * Stock Valuation API
 *
 * GET /api/valuation - Get inventory valuation summary
 * POST /api/valuation - Calculate valuation for specific item
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const method = (searchParams.get("method") || "WEIGHTED_AVERAGE") as "FIFO" | "LIFO" | "WEIGHTED_AVERAGE" | "STANDARD";
    const asOfDate = searchParams.get("asOfDate");

    const service = new StockValuationService(context.user.tenantId);

    const valuation = await service.getInventoryValuation({
      siteId,
      method,
      asOfDate: asOfDate ? new Date(asOfDate) : undefined,
    });

    return NextResponse.json({
      valuation,
      method,
      asOfDate: asOfDate || new Date().toISOString(),
    });
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

    const body = await validateBody(req, CalculateValuationSchema);
    if (body instanceof NextResponse) return body;

    const service = new StockValuationService(context.user.tenantId);

    const valuation = await service.calculateItemValuation({
      itemId: body.itemId,
      siteId: body.siteId,
      method: body.method,
      asOfDate: body.asOfDate ? new Date(body.asOfDate) : undefined,
    });

    return NextResponse.json({
      valuation,
      method: body.method,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
