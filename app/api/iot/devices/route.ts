import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { IoTDeviceService } from '@server/iot-predictive-maintenance';

const iotService = new IoTDeviceService();

/**
 * GET /api/iot/devices
 * Get all IoT devices
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
    const zone = searchParams.get('zone') || undefined;
    const view = searchParams.get('view');

    if (view === 'summary') {
      const summary = await iotService.getDeviceSummary();
      return NextResponse.json(summary);
    }

    const devices = await iotService.getDevices(type, status, zone);

    return NextResponse.json({
      devices,
      total: devices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('IoT devices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IoT devices' },
      { status: 500 }
    );
  }
}
