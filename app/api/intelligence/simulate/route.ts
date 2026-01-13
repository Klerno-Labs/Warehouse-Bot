import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { SimulationEngine } from '@server/ai-intelligence-engine';

const simulationEngine = new SimulationEngine();

/**
 * POST /api/intelligence/simulate
 * Run what-if simulation scenarios
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

    let result;
    switch (scenario) {
      case 'demand_change':
        if (!parameters?.demandMultiplier) {
          return NextResponse.json(
            { error: 'demandMultiplier is required for demand_change scenario' },
            { status: 400 }
          );
        }
        result = await simulationEngine.simulateDemandChange(parameters.demandMultiplier);
        break;

      case 'supply_disruption':
        if (!parameters?.supplierId || !parameters?.durationDays) {
          return NextResponse.json(
            { error: 'supplierId and durationDays are required for supply_disruption scenario' },
            { status: 400 }
          );
        }
        result = await simulationEngine.simulateSupplyDisruption(
          parameters.supplierId,
          parameters.durationDays
        );
        break;

      case 'facility_expansion':
        if (!parameters?.additionalCapacity) {
          return NextResponse.json(
            { error: 'additionalCapacity is required for facility_expansion scenario' },
            { status: 400 }
          );
        }
        result = await simulationEngine.simulateFacilityExpansion(parameters.additionalCapacity);
        break;

      case 'seasonal_peak':
        result = await simulationEngine.simulateDemandChange(parameters?.peakMultiplier || 2.5);
        result.scenarioName = 'Seasonal Peak Simulation';
        break;

      case 'new_product_launch':
        result = {
          scenarioName: 'New Product Launch',
          baselineMetrics: {
            avgOrdersPerDay: 150,
            avgPickTime: 45,
            warehouseUtilization: 72,
          },
          projectedMetrics: {
            avgOrdersPerDay: 150 + (parameters?.expectedDailyOrders || 50),
            avgPickTime: 48,
            warehouseUtilization: Math.min(85, 72 + (parameters?.skuCount || 10) * 0.5),
          },
          impact: {
            additionalPickersNeeded: Math.ceil((parameters?.expectedDailyOrders || 50) / 30),
            additionalStorageNeeded: `${(parameters?.skuCount || 10) * 5} sq ft`,
            estimatedSetupCost: (parameters?.skuCount || 10) * 250,
            timeToBreakeven: `${Math.ceil((parameters?.skuCount || 10) * 250 / ((parameters?.expectedDailyOrders || 50) * 15))} days`,
          },
          recommendations: [
            'Pre-position inventory in high-velocity zones',
            'Train 2 additional pickers before launch',
            'Set up dedicated pick path for new SKUs',
            'Configure cycle counting for first 30 days',
          ],
        };
        break;

      case 'labor_shortage':
        const shortagePercent = parameters?.shortagePercent || 20;
        result = {
          scenarioName: 'Labor Shortage Simulation',
          shortagePercent,
          baselineMetrics: {
            dailyCapacity: 1000,
            onTimeShipment: 98.5,
            avgOrderCycleTime: 2.5,
          },
          projectedMetrics: {
            dailyCapacity: Math.round(1000 * (1 - shortagePercent / 100)),
            onTimeShipment: Math.max(85, 98.5 - shortagePercent * 0.5),
            avgOrderCycleTime: 2.5 * (1 + shortagePercent / 100),
          },
          mitigationStrategies: [
            {
              strategy: 'Overtime Authorization',
              costIncrease: '25%',
              capacityRecovery: `${Math.min(shortagePercent, 15)}%`,
            },
            {
              strategy: 'Temporary Staffing',
              costIncrease: '40%',
              capacityRecovery: `${shortagePercent}%`,
              leadTime: '3-5 days',
            },
            {
              strategy: 'Cross-Training',
              costIncrease: '10%',
              capacityRecovery: `${Math.min(shortagePercent, 10)}%`,
            },
            {
              strategy: 'Process Automation',
              costIncrease: 'Capital investment',
              capacityRecovery: `${Math.min(shortagePercent + 10, 30)}%`,
              leadTime: '2-4 weeks',
            },
          ],
          recommendation: shortagePercent > 15
            ? 'Recommend combination of overtime + temporary staffing'
            : 'Recommend overtime with cross-training backup',
        };
        break;

      default:
        return NextResponse.json(
          {
            error: `Unknown scenario type: ${scenario}`,
            availableScenarios: [
              'demand_change',
              'supply_disruption',
              'facility_expansion',
              'seasonal_peak',
              'new_product_launch',
              'labor_shortage',
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      scenario,
      parameters,
      simulation: result,
      simulatedAt: new Date().toISOString(),
      simulatedBy: user.id,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/intelligence/simulate
 * Get available simulation scenarios and their parameters
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarios = [
      {
        id: 'demand_change',
        name: 'Demand Change',
        description: 'Simulate impact of demand increase or decrease',
        parameters: [
          { name: 'demandMultiplier', type: 'number', required: true, description: 'Multiplier for demand (e.g., 1.5 for 50% increase)' },
        ],
      },
      {
        id: 'supply_disruption',
        name: 'Supply Disruption',
        description: 'Simulate supplier outage impact',
        parameters: [
          { name: 'supplierId', type: 'string', required: true, description: 'ID of affected supplier' },
          { name: 'durationDays', type: 'number', required: true, description: 'Duration of disruption in days' },
        ],
      },
      {
        id: 'facility_expansion',
        name: 'Facility Expansion',
        description: 'Simulate ROI of warehouse expansion',
        parameters: [
          { name: 'additionalCapacity', type: 'number', required: true, description: 'Additional capacity in square feet' },
        ],
      },
      {
        id: 'seasonal_peak',
        name: 'Seasonal Peak',
        description: 'Simulate holiday/seasonal demand surge',
        parameters: [
          { name: 'peakMultiplier', type: 'number', required: false, description: 'Peak demand multiplier (default: 2.5)' },
        ],
      },
      {
        id: 'new_product_launch',
        name: 'New Product Launch',
        description: 'Simulate impact of new product introduction',
        parameters: [
          { name: 'skuCount', type: 'number', required: false, description: 'Number of new SKUs (default: 10)' },
          { name: 'expectedDailyOrders', type: 'number', required: false, description: 'Expected daily orders (default: 50)' },
        ],
      },
      {
        id: 'labor_shortage',
        name: 'Labor Shortage',
        description: 'Simulate workforce reduction impact',
        parameters: [
          { name: 'shortagePercent', type: 'number', required: false, description: 'Percentage of workforce unavailable (default: 20)' },
        ],
      },
    ];

    return NextResponse.json({
      scenarios,
      message: 'POST to this endpoint with scenario and parameters to run simulation',
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    return NextResponse.json(
      { error: 'Failed to get scenarios' },
      { status: 500 }
    );
  }
}
