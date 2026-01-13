import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { NetworkOptimizationService } from '@server/network-optimization';

const networkService = new NetworkOptimizationService();

/**
 * GET /api/network/inventory-positions
 * Get inventory positions across all facilities
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const facilityId = searchParams.get('facilityId');
    const belowSafetyStock = searchParams.get('belowSafetyStock') === 'true';
    const aboveMaxStock = searchParams.get('aboveMaxStock') === 'true';

    let positions = await networkService.getInventoryPositions({ itemId, facilityId });

    // Filter for items below safety stock
    if (belowSafetyStock) {
      positions = positions.filter(p => p.quantity < p.safetyStock);
    }

    // Filter for items above max stock (overstocked)
    if (aboveMaxStock) {
      positions = positions.filter(p => p.quantity > p.maxStock);
    }

    // Calculate summary
    const summary = {
      totalPositions: positions.length,
      totalQuantity: positions.reduce((sum, p) => sum + p.quantity, 0),
      totalValue: positions.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0),
      belowSafetyStock: positions.filter(p => p.quantity < p.safetyStock).length,
      aboveMaxStock: positions.filter(p => p.quantity > p.maxStock).length,
      optimalPositions: positions.filter(p => p.quantity >= p.safetyStock && p.quantity <= p.maxStock).length,
    };

    return NextResponse.json({
      positions,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Inventory positions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory positions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/inventory-positions/optimize
 * Run inventory positioning optimization
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { optimizationGoal, constraints } = await req.json();

    // Get current positions
    const currentPositions = await networkService.getInventoryPositions({});
    const facilities = await networkService.getFacilities();

    // Generate optimization recommendations
    const recommendations = [];

    // Analyze each item's positioning
    const itemPositions = new Map<string, any[]>();
    for (const pos of currentPositions) {
      if (!itemPositions.has(pos.itemId)) {
        itemPositions.set(pos.itemId, []);
      }
      itemPositions.get(pos.itemId)!.push(pos);
    }

    for (const [itemId, positions] of itemPositions) {
      // Check for imbalances
      const totalQty = positions.reduce((sum, p) => sum + p.quantity, 0);
      const avgQty = totalQty / facilities.length;

      for (const pos of positions) {
        // Overstocked facility
        if (pos.quantity > avgQty * 1.5 && pos.quantity > pos.maxStock * 0.8) {
          const excess = Math.round(pos.quantity - avgQty);
          const understocked = positions.find(p => p.quantity < p.safetyStock);
          if (understocked) {
            recommendations.push({
              type: 'REBALANCE',
              itemId,
              fromFacility: pos.facilityId,
              toFacility: understocked.facilityId,
              quantity: Math.min(excess, understocked.safetyStock - understocked.quantity),
              reason: 'Rebalance from overstocked to understocked facility',
              estimatedSavings: excess * pos.unitCost * 0.1,
            });
          }
        }
      }
    }

    // Sort by estimated savings
    recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

    return NextResponse.json({
      optimizationGoal: optimizationGoal || 'balanced_distribution',
      recommendations: recommendations.slice(0, 20), // Top 20 recommendations
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Inventory optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize inventory positions' },
      { status: 500 }
    );
  }
}
