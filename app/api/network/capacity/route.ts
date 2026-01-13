import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { NetworkOptimizationService } from '@server/network-optimization';

const networkService = new NetworkOptimizationService();

/**
 * GET /api/network/capacity
 * Get network capacity plan
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const horizon = parseInt(searchParams.get('horizon') || '12'); // months

    const capacityPlan = await networkService.generateCapacityPlan(horizon);

    return NextResponse.json({
      ...capacityPlan,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Capacity planning error:', error);
    return NextResponse.json(
      { error: 'Failed to generate capacity plan' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/capacity/scenario
 * Run capacity scenario analysis
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario, parameters } = await req.json();

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario type is required' },
        { status: 400 }
      );
    }

    let analysis;
    switch (scenario) {
      case 'add_facility':
        analysis = {
          scenario: 'Add New Facility',
          parameters,
          analysis: {
            recommendedLocation: parameters?.region || 'Midwest',
            recommendedSize: '150,000 sq ft',
            estimatedCapitalCost: 12500000,
            annualOperatingCost: 3200000,
            expectedBenefits: {
              deliveryTimeReduction: '0.8 days',
              shippingCostReduction: '15%',
              splitShipmentReduction: '25%',
            },
            roi: {
              breakeven: '3.2 years',
              fiveYearNPV: 8500000,
              irr: '22%',
            },
            recommendation: 'Proceed with facility - strong ROI expected',
          },
        };
        break;

      case 'expand_facility':
        analysis = {
          scenario: 'Expand Existing Facility',
          parameters,
          analysis: {
            facilityId: parameters?.facilityId || 'FAC-001',
            currentCapacity: 200000,
            proposedExpansion: parameters?.expansion || 50000,
            newCapacity: 200000 + (parameters?.expansion || 50000),
            estimatedCapitalCost: (parameters?.expansion || 50000) * 45,
            constructionTimeline: '8-10 months',
            expectedBenefits: {
              additionalThroughput: '+25%',
              reducedOverflow: '90%',
              improvedEfficiency: '+8%',
            },
            roi: {
              breakeven: '2.1 years',
              fiveYearNPV: 3200000,
            },
            recommendation: 'Recommend expansion - cost-effective capacity increase',
          },
        };
        break;

      case 'close_facility':
        analysis = {
          scenario: 'Close Facility',
          parameters,
          analysis: {
            facilityId: parameters?.facilityId || 'FAC-003',
            currentUtilization: '45%',
            annualOperatingCost: 2800000,
            closureCost: 1500000,
            impactAssessment: {
              affectedOrders: '15%',
              deliveryTimeIncrease: '+1.2 days',
              shippingCostIncrease: '+18%',
              customerImpact: 'Moderate - West Coast customers affected',
            },
            alternatives: [
              'Convert to cross-dock operation',
              'Sublease 50% of space',
              'Consolidate with third-party logistics',
            ],
            recommendation: 'Do not close - consider downsizing or sublease',
          },
        };
        break;

      case 'automation':
        analysis = {
          scenario: 'Automation Investment',
          parameters,
          analysis: {
            facilityId: parameters?.facilityId || 'FAC-001',
            automationType: parameters?.type || 'goods_to_person',
            investmentCost: 5500000,
            implementationTimeline: '12-18 months',
            expectedBenefits: {
              laborReduction: '40%',
              throughputIncrease: '65%',
              accuracyImprovement: '99.5% → 99.95%',
              spaceUtilization: '+30%',
            },
            annualSavings: 1800000,
            roi: {
              breakeven: '3.1 years',
              fiveYearNPV: 4200000,
              irr: '28%',
            },
            risks: [
              'Integration complexity with existing WMS',
              'Training requirements',
              'Maintenance costs',
            ],
            recommendation: 'Strong candidate for automation - proceed with detailed feasibility',
          },
        };
        break;

      default:
        return NextResponse.json(
          {
            error: `Unknown scenario: ${scenario}`,
            availableScenarios: ['add_facility', 'expand_facility', 'close_facility', 'automation'],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ...analysis,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
    });
  } catch (error) {
    console.error('Capacity scenario error:', error);
    return NextResponse.json(
      { error: 'Failed to run capacity scenario' },
      { status: 500 }
    );
  }
}
