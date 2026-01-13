import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { SustainabilityGoalsService } from '@server/sustainability-carbon';

const goalsService = new SustainabilityGoalsService();

/**
 * GET /api/sustainability/goals
 * Get sustainability goals and progress
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const view = searchParams.get('view');

    if (view === 'progress') {
      const progress = await goalsService.getGoalProgress();
      return NextResponse.json(progress);
    }

    const goals = await goalsService.getGoals(category);
    return NextResponse.json({
      goals,
      total: goals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sustainability goals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sustainability/goals
 * Update goal progress
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId, currentValue } = await req.json();

    if (!goalId || currentValue === undefined) {
      return NextResponse.json(
        { error: 'goalId and currentValue are required' },
        { status: 400 }
      );
    }

    const updatedGoal = await goalsService.updateGoalProgress(goalId, currentValue);
    if (!updatedGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({
      goal: updatedGoal,
      message: 'Goal progress updated successfully',
    });
  } catch (error) {
    console.error('Update goal error:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}
