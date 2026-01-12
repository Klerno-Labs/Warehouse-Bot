import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { WasteManagementService } from '@server/sustainability-carbon';

const wasteService = new WasteManagementService();

/**
 * GET /api/sustainability/waste
 * Get waste management data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';

    const wasteSummary = await wasteService.getWasteSummary(period);
    return NextResponse.json(wasteSummary);
  } catch (error) {
    console.error('Waste management error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sustainability/waste
 * Log a waste record
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wasteData = await req.json();

    if (!wasteData.type || !wasteData.disposition || !wasteData.weight) {
      return NextResponse.json(
        { error: 'type, disposition, and weight are required' },
        { status: 400 }
      );
    }

    const record = await wasteService.logWaste({
      ...wasteData,
      unit: wasteData.unit || 'lbs',
      date: wasteData.date || new Date().toISOString().split('T')[0],
      facility: wasteData.facility || 'Main',
    });

    return NextResponse.json({
      record,
      message: 'Waste record logged successfully',
    });
  } catch (error) {
    console.error('Log waste error:', error);
    return NextResponse.json(
      { error: 'Failed to log waste record' },
      { status: 500 }
    );
  }
}
