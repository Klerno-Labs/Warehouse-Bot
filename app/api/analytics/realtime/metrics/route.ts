import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { RealTimeMetricsService, ThroughputAnalyticsService } from '@server/realtime-analytics';

const metricsService = new RealTimeMetricsService();
const throughputService = new ThroughputAnalyticsService();

/**
 * GET /api/analytics/realtime/metrics
 * Get live operational metrics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    const result: any = {
      timestamp: new Date().toISOString(),
    };

    if (type === 'all' || type === 'metrics') {
      result.metrics = await metricsService.getLiveMetrics();
    }

    if (type === 'all' || type === 'pulse') {
      result.pulse = await metricsService.getOperationalPulse();
    }

    if (type === 'all' || type === 'alerts') {
      result.alerts = await metricsService.getLiveAlerts();
    }

    if (type === 'all' || type === 'throughput') {
      const interval = searchParams.get('interval') || '5m';
      result.throughput = await throughputService.getLiveThroughput(interval);
      result.throughputSummary = await throughputService.getThroughputSummary();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
