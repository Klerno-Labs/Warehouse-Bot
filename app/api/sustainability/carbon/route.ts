import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { CarbonEmissionsService } from '@server/sustainability-carbon';

const carbonService = new CarbonEmissionsService();

/**
 * GET /api/sustainability/carbon
 * Get carbon footprint data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const scope = searchParams.get('scope') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (startDate || endDate) {
      const emissions = await carbonService.getEmissions(startDate, endDate, scope);
      return NextResponse.json({
        emissions,
        total: emissions.length,
        totalCO2e: emissions.reduce((sum, e) => sum + e.co2Equivalent, 0),
      });
    }

    const footprint = await carbonService.calculateFootprint(period);
    return NextResponse.json(footprint);
  } catch (error) {
    console.error('Carbon footprint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carbon data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sustainability/carbon
 * Log a carbon emission
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emissionData = await req.json();

    if (!emissionData.source || !emissionData.amount || !emissionData.unit) {
      return NextResponse.json(
        { error: 'source, amount, and unit are required' },
        { status: 400 }
      );
    }

    const emission = await carbonService.logEmission({
      ...emissionData,
      date: emissionData.date || new Date().toISOString().split('T')[0],
      facility: emissionData.facility || 'Main',
    });

    return NextResponse.json({
      emission,
      message: 'Emission logged successfully',
    });
  } catch (error) {
    console.error('Log emission error:', error);
    return NextResponse.json(
      { error: 'Failed to log emission' },
      { status: 500 }
    );
  }
}
