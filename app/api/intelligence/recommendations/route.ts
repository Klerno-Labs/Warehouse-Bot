import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { RecommendationEngine } from '@server/ai-intelligence-engine';

const recommendationEngine = new RecommendationEngine();

/**
 * GET /api/intelligence/recommendations
 * Get AI-generated recommendations
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    const priority = searchParams.get('priority'); // HIGH, MEDIUM, LOW
    const status = searchParams.get('status'); // pending, implemented, dismissed

    let recommendations = await recommendationEngine.generateRecommendations();

    // Filter by category
    if (category !== 'all') {
      recommendations = recommendations.filter(r => r.category === category);
    }

    // Filter by priority
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    // Filter by status
    if (status) {
      recommendations = recommendations.filter(r => r.status === status);
    }

    // Sort by ROI and priority
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedROI - a.estimatedROI;
    });

    // Calculate total potential savings
    const totalPotentialSavings = recommendations
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.estimatedROI, 0);

    // Summary
    const summary = {
      total: recommendations.length,
      pending: recommendations.filter(r => r.status === 'pending').length,
      implemented: recommendations.filter(r => r.status === 'implemented').length,
      dismissed: recommendations.filter(r => r.status === 'dismissed').length,
      totalPotentialSavings,
      byCategory: {} as Record<string, number>,
    };

    for (const rec of recommendations) {
      summary.byCategory[rec.category] = (summary.byCategory[rec.category] || 0) + 1;
    }

    return NextResponse.json({
      recommendations,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intelligence/recommendations
 * Implement or dismiss a recommendation
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recommendationId, action, implementationNotes, dismissalReason } = await req.json();

    if (!recommendationId || !action) {
      return NextResponse.json(
        { error: 'recommendationId and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['implement', 'dismiss', 'defer', 'request_details'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // In production, this would update the recommendation and potentially trigger automation
    const response: any = {
      success: true,
      recommendationId,
      action,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    if (action === 'implement') {
      response.newStatus = 'implemented';
      response.implementationNotes = implementationNotes;
      response.message = 'Recommendation marked as implemented. Benefits will be tracked.';
    } else if (action === 'dismiss') {
      response.newStatus = 'dismissed';
      response.dismissalReason = dismissalReason;
      response.message = 'Recommendation dismissed. Similar recommendations will be deprioritized.';
    } else if (action === 'defer') {
      response.newStatus = 'deferred';
      response.message = 'Recommendation deferred. Will resurface in 30 days.';
    } else if (action === 'request_details') {
      response.message = 'Detailed analysis requested. AI will generate comprehensive report.';
      response.detailedAnalysis = {
        title: 'Detailed Analysis Request Submitted',
        estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
        analysisId: `ANL-${Date.now()}`,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Recommendation action error:', error);
    return NextResponse.json(
      { error: 'Failed to process recommendation action' },
      { status: 500 }
    );
  }
}
