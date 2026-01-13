import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { IntelligenceEngine } from '@server/ai-intelligence-engine';

const intelligenceEngine = new IntelligenceEngine();

/**
 * GET /api/intelligence/dashboard
 * Get unified AI intelligence dashboard with all insights
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboard = await intelligenceEngine.getIntelligenceDashboard();

    return NextResponse.json({
      ...dashboard,
      generatedAt: new Date().toISOString(),
      tenantId: user.tenantId,
    });
  } catch (error) {
    console.error('Intelligence dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to generate intelligence dashboard' },
      { status: 500 }
    );
  }
}
