import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { ClientManagementService } from '@server/3pl-module';

const clientService = new ClientManagementService();

/**
 * GET /api/3pl/clients
 * Get all 3PL clients
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const clients = await clientService.getClients(status);

    return NextResponse.json({
      clients,
      total: clients.length,
      byStatus: {
        active: clients.filter(c => c.status === 'active').length,
        inactive: clients.filter(c => c.status === 'inactive').length,
        pending: clients.filter(c => c.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('3PL clients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/3pl/clients
 * Create a new 3PL client
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientData = await req.json();

    if (!clientData.name || !clientData.code) {
      return NextResponse.json(
        { error: 'name and code are required' },
        { status: 400 }
      );
    }

    const newClient = await clientService.createClient(clientData);

    return NextResponse.json({
      client: newClient,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Create client error:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
