import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { NetworkOptimizationService } from '@server/network-optimization';

const networkService = new NetworkOptimizationService();

/**
 * GET /api/network/facilities
 * Get all facilities in the network
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facilities = await networkService.getFacilities();

    // Calculate network summary
    const summary = {
      totalFacilities: facilities.length,
      totalCapacity: facilities.reduce((sum, f) => sum + f.capacity, 0),
      avgUtilization: facilities.reduce((sum, f) => sum + f.utilizationPercent, 0) / facilities.length,
      byType: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
    };

    for (const facility of facilities) {
      summary.byType[facility.type] = (summary.byType[facility.type] || 0) + 1;
      summary.byRegion[facility.region] = (summary.byRegion[facility.region] || 0) + 1;
    }

    return NextResponse.json({
      facilities,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Facilities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/facilities
 * Add a new facility to the network
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facilityData = await req.json();

    if (!facilityData.name || !facilityData.type || !facilityData.location) {
      return NextResponse.json(
        { error: 'name, type, and location are required' },
        { status: 400 }
      );
    }

    const newFacility = await networkService.addFacility({
      ...facilityData,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      facility: newFacility,
      message: 'Facility added successfully',
    });
  } catch (error) {
    console.error('Add facility error:', error);
    return NextResponse.json(
      { error: 'Failed to add facility' },
      { status: 500 }
    );
  }
}
