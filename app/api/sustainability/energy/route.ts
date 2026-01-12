import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { EnergyManagementService } from '@server/sustainability-carbon';

const energyService = new EnergyManagementService();

/**
 * GET /api/sustainability/energy
 * Get energy consumption data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const view = searchParams.get('view');

    if (view === 'trends') {
      const months = parseInt(searchParams.get('months') || '12');
      const trends = await energyService.getEnergyTrends(months);
      return NextResponse.json({
        trends,
        months,
        timestamp: new Date().toISOString(),
      });
    }

    const consumption = await energyService.getEnergyConsumption(period);
    return NextResponse.json(consumption);
  } catch (error) {
    console.error('Energy consumption error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch energy data' },
      { status: 500 }
    );
  }
}
