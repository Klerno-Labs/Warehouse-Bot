import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { IoTDeviceService } from '@server/iot-predictive-maintenance';

const iotService = new IoTDeviceService();

/**
 * GET /api/iot/devices/[deviceId]
 * Get device details and sensor readings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await params;

    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24');

    const device = await iotService.getDevice(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const readings = await iotService.getSensorReadings(deviceId, hours);

    return NextResponse.json({
      device,
      readings,
      readingsCount: readings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get device error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}
