import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { AnomalyDetectionService } from '@server/ai-intelligence-engine';

const anomalyService = new AnomalyDetectionService();

/**
 * GET /api/intelligence/anomalies
 * Get detected anomalies across all categories
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    const severity = searchParams.get('severity'); // HIGH, MEDIUM, LOW
    const status = searchParams.get('status'); // active, resolved, acknowledged

    let anomalies = await anomalyService.detectAnomalies();

    // Filter by category
    if (category !== 'all') {
      anomalies = anomalies.filter(a => a.category === category);
    }

    // Filter by severity
    if (severity) {
      anomalies = anomalies.filter(a => a.severity === severity);
    }

    // Filter by status
    if (status) {
      anomalies = anomalies.filter(a => a.status === status);
    }

    // Sort by severity and timestamp
    const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    anomalies.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

    // Generate summary
    const summary = {
      total: anomalies.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {
        HIGH: anomalies.filter(a => a.severity === 'HIGH').length,
        MEDIUM: anomalies.filter(a => a.severity === 'MEDIUM').length,
        LOW: anomalies.filter(a => a.severity === 'LOW').length,
      },
      byStatus: {
        active: anomalies.filter(a => a.status === 'active').length,
        acknowledged: anomalies.filter(a => a.status === 'acknowledged').length,
        resolved: anomalies.filter(a => a.status === 'resolved').length,
      },
    };

    for (const anomaly of anomalies) {
      summary.byCategory[anomaly.category] = (summary.byCategory[anomaly.category] || 0) + 1;
    }

    return NextResponse.json({
      anomalies,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/intelligence/anomalies
 * Update anomaly status (acknowledge, resolve)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { anomalyId, action, notes } = await req.json();

    if (!anomalyId || !action) {
      return NextResponse.json(
        { error: 'anomalyId and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['acknowledge', 'resolve', 'escalate', 'dismiss'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // In production, this would update the anomaly in the database
    const statusMap: Record<string, string> = {
      acknowledge: 'acknowledged',
      resolve: 'resolved',
      escalate: 'escalated',
      dismiss: 'dismissed',
    };

    return NextResponse.json({
      success: true,
      anomalyId,
      newStatus: statusMap[action],
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
      notes,
    });
  } catch (error) {
    console.error('Anomaly update error:', error);
    return NextResponse.json(
      { error: 'Failed to update anomaly' },
      { status: 500 }
    );
  }
}
