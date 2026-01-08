import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { VendorScorecardService } from "@server/vendor-scorecards";

export const dynamic = "force-dynamic";

/**
 * Vendor Scorecard API
 *
 * GET /api/vendors/scorecards?supplierId=xxx&periodDays=90
 * - Get scorecard for a specific supplier
 *
 * GET /api/vendors/scorecards/compare?category=xxx&periodDays=90
 * - Compare multiple suppliers
 *
 * GET /api/vendors/scorecards/trends?supplierId=xxx&months=12
 * - Get supplier performance trends over time
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const supplierId = searchParams.get("supplierId");
    const periodDays = parseInt(searchParams.get("periodDays") || "90");
    const category = searchParams.get("category") || undefined;
    const months = parseInt(searchParams.get("months") || "12");

    // Get supplier trends
    if (action === "trends" && supplierId) {
      const trends = await VendorScorecardService.getSupplierTrends(
        supplierId,
        context.user.tenantId,
        months
      );
      return NextResponse.json(trends);
    }

    // Compare suppliers
    if (action === "compare") {
      const comparison = await VendorScorecardService.compareSuppliers(
        context.user.tenantId,
        category,
        periodDays
      );
      return NextResponse.json(comparison);
    }

    // Get single supplier scorecard
    if (supplierId) {
      const scorecard = await VendorScorecardService.generateScorecard(
        supplierId,
        context.user.tenantId,
        periodDays
      );
      return NextResponse.json(scorecard);
    }

    return NextResponse.json(
      { error: "Supplier ID required" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
