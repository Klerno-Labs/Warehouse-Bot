import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { ClientManagementService } from '@server/3pl-module';

const clientService = new ClientManagementService();

/**
 * GET /api/3pl/clients/[clientId]
 * Get client details and dashboard
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'details';

    if (view === 'dashboard') {
      const dashboard = await clientService.getClientDashboard(clientId);
      if (!dashboard) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json(dashboard);
    }

    const client = await clientService.getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/3pl/clients/[clientId]
 * Update client details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const updates = await req.json();

    const updatedClient = await clientService.updateClient(clientId, updates);
    if (!updatedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      client: updatedClient,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}
