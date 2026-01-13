import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { BillingService, ThreePLAnalyticsService } from '@server/3pl-module';

const billingService = new BillingService();
const analyticsService = new ThreePLAnalyticsService();

/**
 * GET /api/3pl/billing
 * Get billing records or portfolio summary
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId') || undefined;
    const status = searchParams.get('status') || undefined;
    const view = searchParams.get('view');

    if (view === 'portfolio') {
      const summary = await analyticsService.getPortfolioSummary();
      return NextResponse.json(summary);
    }

    if (view === 'analytics' && clientId) {
      const period = searchParams.get('period') || '30d';
      const analytics = await analyticsService.getClientAnalytics(clientId, period);
      return NextResponse.json(analytics);
    }

    const records = await billingService.getBillingRecords(clientId, status);

    return NextResponse.json({
      records,
      total: records.length,
      totalAmount: records.reduce((sum, r) => sum + r.total, 0),
    });
  } catch (error) {
    console.error('Billing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/3pl/billing
 * Generate billing for a period
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, periodStart, periodEnd } = await req.json();

    if (!clientId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'clientId, periodStart, and periodEnd are required' },
        { status: 400 }
      );
    }

    const billingRecord = await billingService.generateBillingPeriod(
      clientId,
      periodStart,
      periodEnd
    );

    return NextResponse.json({
      billingRecord,
      message: 'Billing generated successfully',
    });
  } catch (error) {
    console.error('Generate billing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/3pl/billing
 * Update billing status
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId, status } = await req.json();

    if (!recordId || !status) {
      return NextResponse.json(
        { error: 'recordId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'pending', 'sent', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await billingService.updateBillingStatus(recordId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    return NextResponse.json({
      record: updated,
      message: 'Billing status updated successfully',
    });
  } catch (error) {
    console.error('Update billing error:', error);
    return NextResponse.json(
      { error: 'Failed to update billing' },
      { status: 500 }
    );
  }
}
