import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { RealTimeAnalyticsEngine } from '@server/realtime-analytics';

const analyticsEngine = new RealTimeAnalyticsEngine();

/**
 * GET /api/analytics/realtime
 * Get real-time dashboard snapshot
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'dashboard';

    let data;
    switch (view) {
      case 'dashboard':
        data = await analyticsEngine.getDashboardSnapshot();
        break;
      case 'heatmap':
        data = await analyticsEngine.getHeatmapData();
        break;
      case 'performance':
        data = await analyticsEngine.getPerformanceData();
        break;
      default:
        return NextResponse.json(
          { error: `Unknown view: ${view}. Valid: dashboard, heatmap, performance` },
          { status: 400 }
        );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time analytics' },
      { status: 500 }
    );
  }
}
