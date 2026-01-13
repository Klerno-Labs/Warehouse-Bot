import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { NetworkOptimizationService } from '@server/network-optimization';

const networkService = new NetworkOptimizationService();

/**
 * GET /api/network/transfers
 * Get transfer recommendations between facilities
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recommendations = await networkService.generateTransferRecommendations();

    // Calculate summary
    const summary = {
      totalRecommendations: recommendations.length,
      totalQuantity: recommendations.reduce((sum, r) => sum + r.quantity, 0),
      totalCost: recommendations.reduce((sum, r) => sum + r.estimatedCost, 0),
      byPriority: {
        urgent: recommendations.filter(r => r.priority === 'urgent').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length,
      },
      byReason: {} as Record<string, number>,
    };

    for (const rec of recommendations) {
      summary.byReason[rec.reason] = (summary.byReason[rec.reason] || 0) + 1;
    }

    return NextResponse.json({
      recommendations,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Transfer recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate transfer recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/transfers
 * Create a new inter-facility transfer
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      fromFacilityId,
      toFacilityId,
      items,
      priority,
      notes,
    } = await req.json();

    if (!fromFacilityId || !toFacilityId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'fromFacilityId, toFacilityId, and items are required' },
        { status: 400 }
      );
    }

    // Create transfer order
    const transfer = {
      id: `TRF-${Date.now()}`,
      fromFacilityId,
      toFacilityId,
      items,
      priority: priority || 'medium',
      status: 'PENDING',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      notes,
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
    };

    return NextResponse.json({
      transfer,
      message: 'Transfer order created successfully',
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
