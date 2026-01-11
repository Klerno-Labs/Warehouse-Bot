import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';

/**
 * GET /api/production/kanban
 * Fetch all production jobs with routing information for Kanban board
 *
 * TODO: Implement kanban route once routing schema is finalized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Kanban board not yet implemented',
        message: 'This feature will be available once the routing schema is finalized.'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Kanban board error:', error);
    return NextResponse.json({ error: 'Failed to fetch kanban data' }, { status: 500 });
  }
}
