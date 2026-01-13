import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { OrderFlowService } from '@server/realtime-analytics';

const orderFlowService = new OrderFlowService();

/**
 * GET /api/analytics/realtime/orderflow
 * Get real-time order flow visualization data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const timeline = await orderFlowService.getOrderTimeline(orderId);
      return NextResponse.json(timeline);
    }

    const orderFlow = await orderFlowService.getOrderFlow();
    return NextResponse.json({
      ...orderFlow,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Order flow error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order flow' },
      { status: 500 }
    );
  }
}
