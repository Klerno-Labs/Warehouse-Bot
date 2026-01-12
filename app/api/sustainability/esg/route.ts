import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { ESGReportingService } from '@server/sustainability-carbon';

const esgService = new ESGReportingService();

/**
 * GET /api/sustainability/esg
 * Get ESG dashboard or report
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'dashboard';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (view === 'report') {
      const report = await esgService.generateESGReport(year);
      return NextResponse.json(report);
    }

    if (view === 'metrics') {
      const metrics = await esgService.getESGMetrics();
      return NextResponse.json({
        metrics,
        total: metrics.length,
        timestamp: new Date().toISOString(),
      });
    }

    const dashboard = await esgService.getESGDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('ESG error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ESG data' },
      { status: 500 }
    );
  }
}
