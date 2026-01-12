import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { PredictiveAnalyticsService } from '@server/ai-intelligence-engine';

const predictiveService = new PredictiveAnalyticsService();

/**
 * GET /api/intelligence/predictions
 * Get all predictive analytics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const horizon = parseInt(searchParams.get('horizon') || '30');

    const results: any = {};

    if (type === 'all' || type === 'stockout') {
      results.stockoutRisks = await predictiveService.predictStockouts(horizon);
    }

    if (type === 'all' || type === 'demand') {
      const itemId = searchParams.get('itemId');
      if (itemId) {
        results.demandForecast = await predictiveService.forecastDemand(itemId, horizon);
      } else {
        // Get top items forecast
        results.demandForecast = {
          message: 'Provide itemId parameter for specific item forecast',
          sampleForecast: await predictiveService.forecastDemand('ITEM-001', horizon),
        };
      }
    }

    if (type === 'all' || type === 'equipment') {
      results.equipmentFailures = await predictiveService.predictEquipmentFailures();
    }

    if (type === 'all' || type === 'labor') {
      results.laborForecast = await predictiveService.forecastLaborNeeds(horizon);
    }

    return NextResponse.json({
      predictions: results,
      horizon,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Predictions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intelligence/predictions
 * Run custom prediction with parameters
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, parameters } = await req.json();

    if (!type) {
      return NextResponse.json(
        { error: 'Prediction type is required' },
        { status: 400 }
      );
    }

    let result;
    switch (type) {
      case 'stockout':
        result = await predictiveService.predictStockouts(parameters?.horizon || 30);
        break;
      case 'demand':
        if (!parameters?.itemId) {
          return NextResponse.json(
            { error: 'itemId is required for demand forecasting' },
            { status: 400 }
          );
        }
        result = await predictiveService.forecastDemand(
          parameters.itemId,
          parameters.horizon || 30
        );
        break;
      case 'equipment':
        result = await predictiveService.predictEquipmentFailures();
        break;
      case 'labor':
        result = await predictiveService.forecastLaborNeeds(parameters?.horizon || 30);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown prediction type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      type,
      prediction: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Custom prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to run custom prediction' },
      { status: 500 }
    );
  }
}
