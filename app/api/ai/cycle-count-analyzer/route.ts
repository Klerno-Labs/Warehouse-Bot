import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * POST /api/ai/cycle-count-analyzer
 * AI-powered cycle count prioritization and recommendations
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await req.json();
    const {
      maxItems = 20,
      includeCategories,
      excludeCategories,
      locationIds,
      minValue,
      countType = 'ABC', // ABC, RANDOM, HIGH_RISK, ALL
    } = body;

    // Get all items with inventory balances
    const items = await storage.prisma.item.findMany({
      where: {
        tenantId: context.user.tenantId,
        ...(includeCategories && { category: { in: includeCategories } }),
        ...(excludeCategories && { category: { notIn: excludeCategories } }),
      },
      include: {
        balances: {
          where: locationIds ? { locationId: { in: locationIds } } : undefined,
          include: {
            location: true,
          },
        },
        cycleCountLines: {
          include: {
            cycleCount: {
              select: {
                completedAt: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        inventoryEvents: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 100,
        },
        consumptions: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
        salesOrderLines: {
          where: {
            salesOrder: {
              status: { in: ['CONFIRMED', 'ALLOCATED', 'PICKING'] },
            },
          },
        },
      },
    });

    // Analyze each item and calculate priority score
    const analyzedItems = items.map(item => {
      const analysis = analyzeItemForCycleCount(item, minValue);
      return {
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          baseUom: item.baseUom,
        },
        ...analysis,
      };
    });

    // Filter based on count type
    let filteredItems = analyzedItems;
    if (countType === 'ABC') {
      // ABC analysis: Focus on high-value items
      filteredItems = analyzedItems
        .filter(a => a.abcClass === 'A' || a.abcClass === 'B')
        .sort((a, b) => b.priorityScore - a.priorityScore);
    } else if (countType === 'HIGH_RISK') {
      // Focus on items with highest risk factors
      filteredItems = analyzedItems
        .filter(a => a.priorityScore >= 70)
        .sort((a, b) => b.priorityScore - a.priorityScore);
    } else if (countType === 'RANDOM') {
      // Random sampling with weighted probability
      filteredItems = weightedRandomSample(analyzedItems, maxItems);
    }

    // Apply minimum value filter if specified
    if (minValue) {
      filteredItems = filteredItems.filter(a => a.inventoryValue >= minValue);
    }

    // Take top N items
    const recommendations = filteredItems.slice(0, maxItems);

    // Generate summary statistics
    const summary = generateSummary(recommendations, analyzedItems);

    return NextResponse.json({
      recommendations,
      summary,
      analysis: {
        totalItemsAnalyzed: items.length,
        recommendedForCount: recommendations.length,
        countType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function analyzeItemForCycleCount(item: any, minValue?: number) {
  let priorityScore = 0;
  const reasons: string[] = [];
  const riskFactors: Array<{ factor: string; impact: number; description: string }> = [];

  // Calculate total inventory value
  const totalQty = item.balances.reduce((sum: number, b: any) => sum + b.qtyBase, 0);
  const inventoryValue = totalQty * (item.avgCostBase || item.costBase || 0);

  // Factor 1: Time since last count (max 25 points)
  const lastCount = item.cycleCountLines.find((cc: any) =>
    cc.cycleCount.status === 'COMPLETED'
  );
  const daysSinceLastCount = lastCount
    ? Math.floor((Date.now() - new Date(lastCount.cycleCount.completedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
    : 365; // If never counted, assume 365 days

  if (daysSinceLastCount > 180) {
    priorityScore += 25;
    reasons.push(`Not counted in ${daysSinceLastCount} days`);
    riskFactors.push({
      factor: 'Stale Count',
      impact: 25,
      description: `Last counted ${daysSinceLastCount} days ago (>6 months)`,
    });
  } else if (daysSinceLastCount > 90) {
    priorityScore += 15;
    reasons.push(`Last counted ${daysSinceLastCount} days ago`);
    riskFactors.push({
      factor: 'Aging Count',
      impact: 15,
      description: `Last counted ${daysSinceLastCount} days ago (>3 months)`,
    });
  } else if (daysSinceLastCount > 30) {
    priorityScore += 8;
  }

  // Factor 2: Historical variance (max 20 points)
  const recentCounts = item.cycleCountLines.slice(0, 3);
  const avgVariance = recentCounts.length > 0
    ? recentCounts.reduce((sum: number, cc: any) => sum + Math.abs(cc.varianceQtyBase || 0), 0) / recentCounts.length
    : 0;
  const varianceRate = totalQty > 0 ? (avgVariance / totalQty) * 100 : 0;

  if (varianceRate > 10) {
    priorityScore += 20;
    reasons.push(`High variance history (${varianceRate.toFixed(1)}%)`);
    riskFactors.push({
      factor: 'High Variance',
      impact: 20,
      description: `Average variance of ${varianceRate.toFixed(1)}% in recent counts`,
    });
  } else if (varianceRate > 5) {
    priorityScore += 12;
    reasons.push(`Moderate variance history (${varianceRate.toFixed(1)}%)`);
    riskFactors.push({
      factor: 'Moderate Variance',
      impact: 12,
      description: `Average variance of ${varianceRate.toFixed(1)}%`,
    });
  } else if (varianceRate > 2) {
    priorityScore += 6;
  }

  // Factor 3: Transaction velocity (max 20 points)
  const recentEvents = item.inventoryEvents.filter((e: any) =>
    Date.now() - new Date(e.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
  );
  const transactionVelocity = recentEvents.length;

  if (transactionVelocity > 50) {
    priorityScore += 20;
    reasons.push(`Very high activity (${transactionVelocity} transactions/month)`);
    riskFactors.push({
      factor: 'High Activity',
      impact: 20,
      description: `${transactionVelocity} transactions in last 30 days`,
    });
  } else if (transactionVelocity > 20) {
    priorityScore += 15;
    reasons.push(`High activity (${transactionVelocity} transactions/month)`);
    riskFactors.push({
      factor: 'Active Item',
      impact: 15,
      description: `${transactionVelocity} transactions in last 30 days`,
    });
  } else if (transactionVelocity > 10) {
    priorityScore += 8;
  }

  // Factor 4: Inventory value (max 15 points)
  if (inventoryValue > 50000) {
    priorityScore += 15;
    reasons.push(`High value ($${inventoryValue.toLocaleString()})`);
    riskFactors.push({
      factor: 'High Value',
      impact: 15,
      description: `Inventory worth $${inventoryValue.toLocaleString()}`,
    });
  } else if (inventoryValue > 10000) {
    priorityScore += 10;
    reasons.push(`Significant value ($${inventoryValue.toLocaleString()})`);
    riskFactors.push({
      factor: 'Significant Value',
      impact: 10,
      description: `Inventory worth $${inventoryValue.toLocaleString()}`,
    });
  } else if (inventoryValue > 5000) {
    priorityScore += 5;
  }

  // Factor 5: Production criticality (max 10 points)
  const recentConsumption = item.consumptions.length;
  if (recentConsumption > 10) {
    priorityScore += 10;
    reasons.push(`Critical for production (${recentConsumption} uses)`);
    riskFactors.push({
      factor: 'Production Critical',
      impact: 10,
      description: `Used in ${recentConsumption} production orders recently`,
    });
  } else if (recentConsumption > 5) {
    priorityScore += 6;
  }

  // Factor 6: Open sales orders (max 10 points)
  const openSalesLines = item.salesOrderLines.length;
  if (openSalesLines > 5) {
    priorityScore += 10;
    reasons.push(`High demand (${openSalesLines} open orders)`);
    riskFactors.push({
      factor: 'High Demand',
      impact: 10,
      description: `${openSalesLines} open sales orders waiting`,
    });
  } else if (openSalesLines > 2) {
    priorityScore += 6;
  }

  // ABC Classification
  let abcClass: 'A' | 'B' | 'C';
  if (inventoryValue > 25000 || transactionVelocity > 30) {
    abcClass = 'A';
  } else if (inventoryValue > 5000 || transactionVelocity > 10) {
    abcClass = 'B';
  } else {
    abcClass = 'C';
  }

  // Priority level
  let priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  if (priorityScore >= 80) {
    priorityLevel = 'critical';
  } else if (priorityScore >= 60) {
    priorityLevel = 'high';
  } else if (priorityScore >= 40) {
    priorityLevel = 'medium';
  } else {
    priorityLevel = 'low';
  }

  // Recommended count frequency
  let recommendedFrequency: string;
  if (abcClass === 'A' || priorityScore >= 70) {
    recommendedFrequency = 'Monthly';
  } else if (abcClass === 'B' || priorityScore >= 50) {
    recommendedFrequency = 'Quarterly';
  } else {
    recommendedFrequency = 'Annually';
  }

  return {
    priorityScore,
    priorityLevel,
    abcClass,
    reasons,
    riskFactors,
    metrics: {
      daysSinceLastCount,
      transactionVelocity,
      varianceRate: varianceRate.toFixed(2),
      inventoryValue: inventoryValue.toFixed(2),
      totalQty,
      recentConsumption,
      openSalesOrders: openSalesLines,
    },
    recommendedFrequency,
    locations: item.balances.map((b: any) => ({
      id: b.location.id,
      label: b.location.label,
      qty: b.qtyBase,
    })),
  };
}

function weightedRandomSample(items: any[], count: number) {
  // Weighted random sampling based on priority scores
  const totalWeight = items.reduce((sum, item) => sum + item.priorityScore, 0);
  const selected: any[] = [];
  const remaining = [...items];

  while (selected.length < count && remaining.length > 0) {
    const rand = Math.random() * remaining.reduce((sum, item) => sum + item.priorityScore, 0);
    let cumulative = 0;

    for (let i = 0; i < remaining.length; i++) {
      cumulative += remaining[i].priorityScore;
      if (rand <= cumulative) {
        selected.push(remaining[i]);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  return selected;
}

function generateSummary(recommendations: any[], allItems: any[]) {
  const totalValue = recommendations.reduce((sum, r) =>
    sum + parseFloat(r.metrics.inventoryValue), 0
  );

  const abcBreakdown = {
    A: recommendations.filter(r => r.abcClass === 'A').length,
    B: recommendations.filter(r => r.abcClass === 'B').length,
    C: recommendations.filter(r => r.abcClass === 'C').length,
  };

  const priorityBreakdown = {
    critical: recommendations.filter(r => r.priorityLevel === 'critical').length,
    high: recommendations.filter(r => r.priorityLevel === 'high').length,
    medium: recommendations.filter(r => r.priorityLevel === 'medium').length,
    low: recommendations.filter(r => r.priorityLevel === 'low').length,
  };

  const avgScore = recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.priorityScore, 0) / recommendations.length
    : 0;

  return {
    totalInventoryValue: totalValue.toFixed(2),
    averagePriorityScore: avgScore.toFixed(1),
    abcBreakdown,
    priorityBreakdown,
    topRiskFactors: getTopRiskFactors(recommendations),
    estimatedCountTime: `${(recommendations.length * 5)} - ${(recommendations.length * 10)} minutes`,
  };
}

function getTopRiskFactors(recommendations: any[]) {
  const factorCounts = new Map<string, { count: number; totalImpact: number }>();

  recommendations.forEach(r => {
    r.riskFactors.forEach((rf: any) => {
      const existing = factorCounts.get(rf.factor) || { count: 0, totalImpact: 0 };
      factorCounts.set(rf.factor, {
        count: existing.count + 1,
        totalImpact: existing.totalImpact + rf.impact,
      });
    });
  });

  return Array.from(factorCounts.entries())
    .map(([factor, data]) => ({
      factor,
      occurrences: data.count,
      avgImpact: (data.totalImpact / data.count).toFixed(1),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5);
}
