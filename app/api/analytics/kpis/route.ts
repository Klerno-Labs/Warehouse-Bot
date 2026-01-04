import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { AnalyticsService } from "@server/analytics";

/**
 * Analytics & KPI API
 *
 * GET /api/analytics/kpis?period=30&siteId=xxx
 * - Get comprehensive analytics and KPIs
 */
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const periodDays = parseInt(searchParams.get("period") || "30");
    const siteId = searchParams.get("siteId") || undefined;

    const analytics = await AnalyticsService.generateAnalytics(
      context.user.tenantId,
      siteId,
      periodDays
    );

    return NextResponse.json({
      analytics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
