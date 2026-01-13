import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { EquipmentService, PredictiveMaintenanceService } from '@server/iot-predictive-maintenance';

const equipmentService = new EquipmentService();
const predictiveService = new PredictiveMaintenanceService();

/**
 * GET /api/iot/equipment/[equipmentId]
 * Get equipment details with risk score
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ equipmentId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipmentId } = await params;

    const equipment = await equipmentService.getEquipmentById(equipmentId);
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const riskScore = await predictiveService.getEquipmentRiskScore(equipmentId);

    return NextResponse.json({
      equipment,
      riskScore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
