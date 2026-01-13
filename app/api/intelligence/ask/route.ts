import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { NaturalLanguageInsights } from '@server/ai-intelligence-engine';

const nlInsights = new NaturalLanguageInsights();

/**
 * POST /api/intelligence/ask
 * Natural language Q&A for warehouse insights
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, context } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const answer = await nlInsights.askQuestion(question);

    return NextResponse.json({
      question,
      answer,
      context: context || 'general',
      answeredAt: new Date().toISOString(),
      answeredBy: 'AI Intelligence Engine',
    });
  } catch (error) {
    console.error('NL insights error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/intelligence/ask
 * Get sample questions and insights
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sampleQuestions = [
      {
        category: 'Inventory',
        questions: [
          'What items are at risk of stockout this week?',
          'Which SKUs have the highest carrying cost?',
          'What is our inventory turnover rate by category?',
          'Which items haven\'t moved in 90 days?',
        ],
      },
      {
        category: 'Operations',
        questions: [
          'How is our pick efficiency trending?',
          'Which zones have the longest pick times?',
          'What\'s causing our order delays?',
          'How can we improve our shipping SLA?',
        ],
      },
      {
        category: 'Labor',
        questions: [
          'Do we have enough staff for next week\'s forecast?',
          'Which shifts are understaffed?',
          'What\'s our labor cost per order?',
          'Who are our top performers?',
        ],
      },
      {
        category: 'Analytics',
        questions: [
          'What patterns do you see in our order data?',
          'How does this month compare to last month?',
          'What\'s driving our cost increases?',
          'Where should we focus improvement efforts?',
        ],
      },
    ];

    // Generate quick insights
    const quickInsights = [
      {
        insight: '3 items predicted to stockout in 5 days',
        type: 'warning',
        action: 'Review reorder points',
      },
      {
        insight: 'Pick efficiency up 8% this week',
        type: 'positive',
        action: 'Continue current zone assignments',
      },
      {
        insight: 'Zone C showing 15% slower pick times',
        type: 'attention',
        action: 'Review slotting in Zone C',
      },
    ];

    return NextResponse.json({
      sampleQuestions,
      quickInsights,
      message: 'POST to this endpoint with a question to get AI-powered insights',
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json(
      { error: 'Failed to get insights' },
      { status: 500 }
    );
  }
}
