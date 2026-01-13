import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { EquipmentService, PredictiveMaintenanceService } from '@server/iot-predictive-maintenance';

const equipmentService = new EquipmentService();
const predictiveService = new PredictiveMaintenanceService();

/**
 * GET /api/iot/equipment
 * Get all equipment with health data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const view = searchParams.get('view');

    if (view === 'health') {
      const healthSummary = await equipmentService.getEquipmentHealthSummary();
      return NextResponse.json(healthSummary);
    }

    if (view === 'predictions') {
      const predictions = await predictiveService.generateFailurePredictions();
      return NextResponse.json({
        predictions,
        total: predictions.length,
        highRisk: predictions.filter(p => p.probability > 0.5).length,
        timestamp: new Date().toISOString(),
      });
    }

    const equipment = await equipmentService.getEquipment(type, status);

    return NextResponse.json({
      equipment,
      total: equipment.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Equipment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
