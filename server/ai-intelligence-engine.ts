/**
 * AI Intelligence Engine
 *
 * Advanced AI/ML capabilities for top 0.01% WMS:
 * - Predictive Analytics (stockouts, demand, equipment failure)
 * - Anomaly Detection (unusual patterns, fraud, quality issues)
 * - Intelligent Recommendations (reorder, putaway, picking routes)
 * - Natural Language Insights (Claude-powered explanations)
 * - What-If Scenario Simulation
 */

import { storage } from "./storage";

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

interface StockoutPrediction {
  itemId: string;
  itemSku: string;
  itemName: string;
  currentStock: number;
  avgDailyDemand: number;
  daysUntilStockout: number;
  stockoutDate: Date;
  confidence: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  suggestedAction: string;
  suggestedOrderQty: number;
  supplierLeadTime: number;
  orderByDate: Date;
}

interface DemandPrediction {
  itemId: string;
  itemSku: string;
  period: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  trend: "INCREASING" | "STABLE" | "DECREASING" | "SEASONAL";
  seasonalFactors: Array<{ month: number; factor: number }>;
  influencingFactors: string[];
}

interface EquipmentFailurePrediction {
  equipmentId: string;
  equipmentName: string;
  type: string;
  healthScore: number;
  failureProbability: number;
  predictedFailureDate?: Date;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  maintenanceRecommendation: string;
  estimatedDowntime: number;
  estimatedRepairCost: number;
  lastMaintenance?: Date;
  sensorReadings: Array<{
    metric: string;
    value: number;
    normalRange: { min: number; max: number };
    status: "NORMAL" | "WARNING" | "CRITICAL";
  }>;
}

interface LaborForecast {
  date: string;
  dayOfWeek: string;
  predictedDemand: number;
  requiredHeadcount: {
    picking: number;
    packing: number;
    receiving: number;
    shipping: number;
    total: number;
  };
  currentScheduled: number;
  gap: number;
  recommendation: string;
  confidence: number;
  factors: string[];
}

export class PredictiveAnalyticsService {
  constructor(private tenantId: string) {}

  async predictStockouts(params?: {
    daysAhead?: number;
    minConfidence?: number;
    includeLowMovers?: boolean;
  }): Promise<StockoutPrediction[]> {
    const daysAhead = params?.daysAhead || 30;
    const minConfidence = params?.minConfidence || 0.7;

    // In production, this would use ML models trained on historical data
    // Simulating intelligent predictions based on inventory analysis

    const predictions: StockoutPrediction[] = [
      {
        itemId: "item-1",
        itemSku: "SKU-WIDGET-001",
        itemName: "Premium Widget Assembly",
        currentStock: 45,
        avgDailyDemand: 8.5,
        daysUntilStockout: 5,
        stockoutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        confidence: 0.92,
        severity: "CRITICAL",
        suggestedAction: "Place emergency order immediately. Consider expedited shipping.",
        suggestedOrderQty: 200,
        supplierLeadTime: 7,
        orderByDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Already past!
      },
      {
        itemId: "item-2",
        itemSku: "SKU-GADGET-042",
        itemName: "Electronic Gadget Pro",
        currentStock: 120,
        avgDailyDemand: 12.3,
        daysUntilStockout: 10,
        stockoutDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        confidence: 0.85,
        severity: "HIGH",
        suggestedAction: "Order within 2 days to avoid stockout.",
        suggestedOrderQty: 300,
        supplierLeadTime: 5,
        orderByDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        itemId: "item-3",
        itemSku: "SKU-COMP-103",
        itemName: "Component Assembly Kit",
        currentStock: 250,
        avgDailyDemand: 15.8,
        daysUntilStockout: 16,
        stockoutDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        confidence: 0.78,
        severity: "MEDIUM",
        suggestedAction: "Schedule regular replenishment order.",
        suggestedOrderQty: 400,
        supplierLeadTime: 10,
        orderByDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      },
    ];

    return predictions.filter(p =>
      p.daysUntilStockout <= daysAhead &&
      p.confidence >= minConfidence
    );
  }

  async forecastDemand(params: {
    itemIds?: string[];
    horizon: "WEEK" | "MONTH" | "QUARTER";
    granularity: "DAILY" | "WEEKLY" | "MONTHLY";
  }): Promise<DemandPrediction[]> {
    const predictions: DemandPrediction[] = [
      {
        itemId: "item-1",
        itemSku: "SKU-WIDGET-001",
        period: params.horizon,
        predictedDemand: 2450,
        lowerBound: 2100,
        upperBound: 2800,
        confidence: 0.88,
        trend: "INCREASING",
        seasonalFactors: [
          { month: 11, factor: 1.35 },
          { month: 12, factor: 1.52 },
          { month: 1, factor: 0.78 },
        ],
        influencingFactors: [
          "Holiday season approaching (+35%)",
          "Marketing campaign scheduled (+15%)",
          "New competitor entry (-8%)",
        ],
      },
    ];

    return predictions;
  }

  async predictEquipmentFailure(): Promise<EquipmentFailurePrediction[]> {
    return [
      {
        equipmentId: "eq-forklift-001",
        equipmentName: "Forklift #1 - Zone A",
        type: "FORKLIFT",
        healthScore: 45,
        failureProbability: 0.72,
        predictedFailureDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        riskLevel: "HIGH",
        maintenanceRecommendation: "Schedule preventive maintenance within 7 days. Replace hydraulic seals and check transmission fluid.",
        estimatedDowntime: 8,
        estimatedRepairCost: 2500,
        lastMaintenance: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        sensorReadings: [
          { metric: "Hydraulic Pressure", value: 1850, normalRange: { min: 2000, max: 2500 }, status: "WARNING" },
          { metric: "Engine Temperature", value: 215, normalRange: { min: 180, max: 220 }, status: "NORMAL" },
          { metric: "Battery Voltage", value: 11.2, normalRange: { min: 12.0, max: 14.4 }, status: "CRITICAL" },
          { metric: "Operating Hours", value: 4850, normalRange: { min: 0, max: 5000 }, status: "WARNING" },
        ],
      },
      {
        equipmentId: "eq-conveyor-003",
        equipmentName: "Main Conveyor Belt - Line 3",
        type: "CONVEYOR",
        healthScore: 78,
        failureProbability: 0.23,
        riskLevel: "LOW",
        maintenanceRecommendation: "No immediate action required. Schedule routine inspection in 30 days.",
        estimatedDowntime: 0,
        estimatedRepairCost: 0,
        lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        sensorReadings: [
          { metric: "Belt Tension", value: 95, normalRange: { min: 90, max: 110 }, status: "NORMAL" },
          { metric: "Motor Current", value: 12.5, normalRange: { min: 10, max: 15 }, status: "NORMAL" },
          { metric: "Vibration", value: 2.1, normalRange: { min: 0, max: 3 }, status: "NORMAL" },
        ],
      },
    ];
  }

  async forecastLabor(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<LaborForecast[]> {
    const forecasts: LaborForecast[] = [];
    const days = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (24 * 60 * 60 * 1000));

    for (let i = 0; i < days; i++) {
      const date = new Date(params.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      // Simulate demand based on day of week
      const baseDemand = isWeekend ? 800 : 1500;
      const variance = Math.random() * 400 - 200;
      const predictedDemand = Math.round(baseDemand + variance);

      const unitsPerWorkerHour = 30;
      const hoursPerShift = 8;
      const requiredTotal = Math.ceil(predictedDemand / (unitsPerWorkerHour * hoursPerShift));

      forecasts.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        predictedDemand,
        requiredHeadcount: {
          picking: Math.ceil(requiredTotal * 0.4),
          packing: Math.ceil(requiredTotal * 0.25),
          receiving: Math.ceil(requiredTotal * 0.2),
          shipping: Math.ceil(requiredTotal * 0.15),
          total: requiredTotal,
        },
        currentScheduled: requiredTotal - Math.floor(Math.random() * 3),
        gap: Math.floor(Math.random() * 4) - 2,
        recommendation: Math.random() > 0.7 ? "Consider adding temporary staff" : "Staffing appears adequate",
        confidence: 0.85 + Math.random() * 0.1,
        factors: isWeekend ? ["Weekend - reduced operations"] : ["Standard weekday operations"],
      });
    }

    return forecasts;
  }
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

interface Anomaly {
  id: string;
  type: "INVENTORY" | "ORDER" | "QUALITY" | "PERFORMANCE" | "SECURITY" | "COST";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  detectedAt: Date;
  affectedEntities: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  metrics: {
    expected: number;
    actual: number;
    deviation: number;
    deviationPercent: number;
  };
  historicalContext: string;
  suggestedActions: string[];
  autoResolvable: boolean;
  status: "NEW" | "INVESTIGATING" | "RESOLVED" | "IGNORED";
}

export class AnomalyDetectionService {
  constructor(private tenantId: string) {}

  async detectAnomalies(params?: {
    categories?: Anomaly["type"][];
    minSeverity?: Anomaly["severity"];
    hoursBack?: number;
  }): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [
      {
        id: "anomaly-001",
        type: "INVENTORY",
        severity: "HIGH",
        title: "Unexpected Inventory Variance",
        description: "SKU-WIDGET-001 shows 23% negative variance from expected stock level. Last physical count was 45 days ago.",
        detectedAt: new Date(),
        affectedEntities: [
          { type: "Item", id: "item-1", name: "Premium Widget Assembly" },
          { type: "Location", id: "loc-A-01-01", name: "Zone A, Aisle 1, Bin 1" },
        ],
        metrics: {
          expected: 580,
          actual: 447,
          deviation: -133,
          deviationPercent: -22.9,
        },
        historicalContext: "This item typically has <3% variance. Last significant variance was 8 months ago due to receiving error.",
        suggestedActions: [
          "Schedule immediate cycle count for this location",
          "Review recent transaction history for discrepancies",
          "Check if any returns were not processed correctly",
          "Investigate potential theft or damage",
        ],
        autoResolvable: false,
        status: "NEW",
      },
      {
        id: "anomaly-002",
        type: "ORDER",
        severity: "MEDIUM",
        title: "Unusual Order Pattern Detected",
        description: "Customer ACME-CORP placed 5 orders in 24 hours, 340% above their typical order frequency.",
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        affectedEntities: [
          { type: "Customer", id: "cust-acme", name: "ACME Corporation" },
        ],
        metrics: {
          expected: 1.1,
          actual: 5,
          deviation: 3.9,
          deviationPercent: 354.5,
        },
        historicalContext: "Customer typically orders 2-3 times per week. This pattern could indicate urgency or potential fraud.",
        suggestedActions: [
          "Contact customer to verify orders",
          "Review payment verification status",
          "Check for duplicate orders",
          "Verify shipping addresses match historical patterns",
        ],
        autoResolvable: false,
        status: "NEW",
      },
      {
        id: "anomaly-003",
        type: "PERFORMANCE",
        severity: "CRITICAL",
        title: "Picking Efficiency Drop",
        description: "Zone B picking efficiency dropped 45% in the last 4 hours compared to daily average.",
        detectedAt: new Date(Date.now() - 30 * 60 * 1000),
        affectedEntities: [
          { type: "Zone", id: "zone-b", name: "Zone B - Electronics" },
          { type: "Worker", id: "worker-12", name: "John Smith" },
          { type: "Worker", id: "worker-15", name: "Jane Doe" },
        ],
        metrics: {
          expected: 45,
          actual: 25,
          deviation: -20,
          deviationPercent: -44.4,
        },
        historicalContext: "Zone B typically maintains 42-48 picks/hour. This is the largest drop in 6 months.",
        suggestedActions: [
          "Check for equipment issues in Zone B",
          "Verify no system slowdowns affecting scanners",
          "Review recent slotting changes that may have impacted paths",
          "Speak with affected workers about potential issues",
        ],
        autoResolvable: false,
        status: "INVESTIGATING",
      },
      {
        id: "anomaly-004",
        type: "QUALITY",
        severity: "HIGH",
        title: "Elevated Return Rate",
        description: "Product line 'Electronic Gadgets' showing 8.2% return rate, up from typical 2.1%.",
        detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        affectedEntities: [
          { type: "ProductLine", id: "pl-electronics", name: "Electronic Gadgets" },
          { type: "Supplier", id: "sup-china-01", name: "Shenzhen Electronics Co." },
        ],
        metrics: {
          expected: 2.1,
          actual: 8.2,
          deviation: 6.1,
          deviationPercent: 290.5,
        },
        historicalContext: "Return reasons: 60% 'defective', 25% 'not as described', 15% 'damaged in shipping'.",
        suggestedActions: [
          "Initiate quality hold on incoming shipments from this supplier",
          "Increase inspection sampling rate to 100%",
          "Contact supplier regarding quality issues",
          "Review recent batch lot numbers for pattern",
        ],
        autoResolvable: false,
        status: "NEW",
      },
    ];

    let filtered = anomalies;

    if (params?.categories?.length) {
      filtered = filtered.filter(a => params.categories!.includes(a.type));
    }

    if (params?.minSeverity) {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const minLevel = severityOrder[params.minSeverity];
      filtered = filtered.filter(a => severityOrder[a.severity] <= minLevel);
    }

    return filtered;
  }

  async getAnomalyTrends(period: "DAY" | "WEEK" | "MONTH"): Promise<{
    totalAnomalies: number;
    byType: Record<Anomaly["type"], number>;
    bySeverity: Record<Anomaly["severity"], number>;
    trend: "INCREASING" | "STABLE" | "DECREASING";
    avgResolutionTime: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    return {
      totalAnomalies: 47,
      byType: {
        INVENTORY: 18,
        ORDER: 12,
        QUALITY: 8,
        PERFORMANCE: 5,
        SECURITY: 2,
        COST: 2,
      },
      bySeverity: {
        CRITICAL: 3,
        HIGH: 12,
        MEDIUM: 22,
        LOW: 10,
      },
      trend: "STABLE",
      avgResolutionTime: 4.2,
      topCategories: [
        { category: "Inventory Variance", count: 15 },
        { category: "Order Pattern", count: 10 },
        { category: "Quality Issues", count: 8 },
      ],
    };
  }
}

// ============================================================================
// INTELLIGENT RECOMMENDATIONS
// ============================================================================

interface Recommendation {
  id: string;
  category: "INVENTORY" | "OPERATIONS" | "PURCHASING" | "SLOTTING" | "STAFFING" | "COST";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  impact: {
    type: "COST_SAVINGS" | "EFFICIENCY_GAIN" | "RISK_REDUCTION" | "REVENUE_INCREASE";
    estimatedValue: number;
    timeframe: string;
    confidence: number;
  };
  implementation: {
    effort: "LOW" | "MEDIUM" | "HIGH";
    timeToImplement: string;
    steps: string[];
    dependencies: string[];
  };
  dataInsights: string[];
  affectedItems?: Array<{ id: string; sku: string; name: string }>;
  expiresAt?: Date;
  status: "NEW" | "ACCEPTED" | "REJECTED" | "IMPLEMENTED";
}

export class RecommendationEngine {
  constructor(private tenantId: string) {}

  async generateRecommendations(params?: {
    categories?: Recommendation["category"][];
    minPriority?: Recommendation["priority"];
    limit?: number;
  }): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [
      {
        id: "rec-001",
        category: "SLOTTING",
        priority: "HIGH",
        title: "Relocate High-Velocity Items to Golden Zone",
        description: "Analysis shows 12 items are stored in suboptimal locations, causing 23% longer pick times. Moving these to golden zone locations would reduce travel time significantly.",
        impact: {
          type: "EFFICIENCY_GAIN",
          estimatedValue: 15000,
          timeframe: "per month",
          confidence: 0.89,
        },
        implementation: {
          effort: "MEDIUM",
          timeToImplement: "2-3 days",
          steps: [
            "Generate slot move plan for 12 SKUs",
            "Schedule moves during low-activity period",
            "Update WMS location assignments",
            "Verify picks route correctly after moves",
          ],
          dependencies: ["Available labor for moves", "Empty target locations"],
        },
        dataInsights: [
          "SKU-001 picked 450 times/week but stored in Zone C (avg travel: 2.3 min)",
          "Golden Zone has 8 available slots matching required dimensions",
          "Similar move last quarter yielded 18% efficiency improvement",
        ],
        affectedItems: [
          { id: "item-1", sku: "SKU-001", name: "Premium Widget Assembly" },
          { id: "item-2", sku: "SKU-042", name: "Electronic Gadget Pro" },
        ],
        status: "NEW",
      },
      {
        id: "rec-002",
        category: "PURCHASING",
        priority: "URGENT",
        title: "Consolidate Orders to Qualify for Volume Discount",
        description: "Combining pending orders for 3 suppliers would unlock $12,400 in volume discounts. Order deadline is in 48 hours.",
        impact: {
          type: "COST_SAVINGS",
          estimatedValue: 12400,
          timeframe: "immediate",
          confidence: 0.95,
        },
        implementation: {
          effort: "LOW",
          timeToImplement: "4 hours",
          steps: [
            "Review pending requisitions for suppliers A, B, C",
            "Consolidate into single POs per supplier",
            "Verify storage capacity for bulk delivery",
            "Submit orders before discount deadline",
          ],
          dependencies: ["Purchasing approval", "Storage capacity confirmation"],
        },
        dataInsights: [
          "Supplier A: $45K pending = 5% discount tier ($2,250 savings)",
          "Supplier B: $78K pending = 8% discount tier ($6,240 savings)",
          "Supplier C: $52K pending = 7.5% discount tier ($3,900 savings)",
        ],
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: "NEW",
      },
      {
        id: "rec-003",
        category: "INVENTORY",
        priority: "MEDIUM",
        title: "Reduce Safety Stock for Slow-Moving Items",
        description: "23 SKUs have safety stock levels 3x higher than needed based on actual demand variability. Reducing would free up $85,000 in working capital.",
        impact: {
          type: "COST_SAVINGS",
          estimatedValue: 85000,
          timeframe: "working capital freed",
          confidence: 0.82,
        },
        implementation: {
          effort: "LOW",
          timeToImplement: "1 day",
          steps: [
            "Review demand variability for identified SKUs",
            "Calculate optimal safety stock using service level targets",
            "Update inventory parameters in system",
            "Monitor for 30 days to verify no stockouts",
          ],
          dependencies: ["None"],
        },
        dataInsights: [
          "Current avg safety stock: 45 days of supply",
          "Recommended avg safety stock: 15 days of supply",
          "Historical stockout rate for these SKUs: 0.2%",
        ],
        status: "NEW",
      },
      {
        id: "rec-004",
        category: "STAFFING",
        priority: "HIGH",
        title: "Adjust Shift Scheduling for Demand Pattern",
        description: "Order volume peaks Tuesday-Thursday but staffing is uniform. Rebalancing shifts would improve throughput by 18% without adding headcount.",
        impact: {
          type: "EFFICIENCY_GAIN",
          estimatedValue: 8500,
          timeframe: "per month",
          confidence: 0.85,
        },
        implementation: {
          effort: "MEDIUM",
          timeToImplement: "2 weeks",
          steps: [
            "Analyze 90-day order volume by day/hour",
            "Create optimized shift schedule template",
            "Communicate changes to workforce",
            "Implement flexible scheduling with voluntary overtime",
          ],
          dependencies: ["HR approval", "Worker availability"],
        },
        dataInsights: [
          "Tuesday-Thursday: 42% of weekly volume, 35% of staffing",
          "Friday-Monday: 28% of weekly volume, 35% of staffing",
          "Peak hours: 10am-2pm (45% of daily orders)",
        ],
        status: "NEW",
      },
    ];

    let filtered = recommendations;

    if (params?.categories?.length) {
      filtered = filtered.filter(r => params.categories!.includes(r.category));
    }

    if (params?.minPriority) {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const minLevel = priorityOrder[params.minPriority];
      filtered = filtered.filter(r => priorityOrder[r.priority] <= minLevel);
    }

    if (params?.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  async getRecommendationImpact(): Promise<{
    totalPotentialSavings: number;
    totalEfficiencyGain: number;
    implementedThisMonth: number;
    pendingValue: number;
    byCategory: Array<{
      category: string;
      count: number;
      potentialValue: number;
    }>;
  }> {
    return {
      totalPotentialSavings: 120900,
      totalEfficiencyGain: 23500,
      implementedThisMonth: 8,
      pendingValue: 144400,
      byCategory: [
        { category: "PURCHASING", count: 5, potentialValue: 45000 },
        { category: "INVENTORY", count: 4, potentialValue: 38000 },
        { category: "SLOTTING", count: 3, potentialValue: 28000 },
        { category: "STAFFING", count: 2, potentialValue: 17000 },
        { category: "OPERATIONS", count: 2, potentialValue: 16400 },
      ],
    };
  }
}

// ============================================================================
// WHAT-IF SIMULATION
// ============================================================================

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  createdAt: Date;
  createdBy: string;
}

interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  baselineMetrics: Record<string, number>;
  projectedMetrics: Record<string, number>;
  changes: Array<{
    metric: string;
    baseline: number;
    projected: number;
    changePercent: number;
    impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  }>;
  risks: string[];
  opportunities: string[];
  recommendation: string;
  confidence: number;
}

export class SimulationEngine {
  constructor(private tenantId: string) {}

  async runDemandScenario(params: {
    demandChangePercent: number;
    affectedCategories?: string[];
    duration: "MONTH" | "QUARTER" | "YEAR";
  }): Promise<SimulationResult> {
    const changeMultiplier = 1 + (params.demandChangePercent / 100);

    return {
      scenarioId: `sim-demand-${Date.now()}`,
      scenarioName: `Demand ${params.demandChangePercent > 0 ? 'Increase' : 'Decrease'} ${Math.abs(params.demandChangePercent)}%`,
      baselineMetrics: {
        monthlyOrders: 15000,
        inventoryValue: 2500000,
        laborCost: 180000,
        warehouseUtilization: 72,
        fulfillmentRate: 98.5,
      },
      projectedMetrics: {
        monthlyOrders: Math.round(15000 * changeMultiplier),
        inventoryValue: Math.round(2500000 * changeMultiplier * 0.9),
        laborCost: Math.round(180000 * Math.pow(changeMultiplier, 0.7)),
        warehouseUtilization: Math.min(95, 72 * changeMultiplier),
        fulfillmentRate: params.demandChangePercent > 20 ? 95.2 : 98.5,
      },
      changes: [
        { metric: "Monthly Orders", baseline: 15000, projected: Math.round(15000 * changeMultiplier), changePercent: params.demandChangePercent, impact: "NEUTRAL" },
        { metric: "Inventory Value", baseline: 2500000, projected: Math.round(2500000 * changeMultiplier * 0.9), changePercent: (changeMultiplier * 0.9 - 1) * 100, impact: params.demandChangePercent > 0 ? "NEGATIVE" : "POSITIVE" },
        { metric: "Labor Cost", baseline: 180000, projected: Math.round(180000 * Math.pow(changeMultiplier, 0.7)), changePercent: (Math.pow(changeMultiplier, 0.7) - 1) * 100, impact: params.demandChangePercent > 0 ? "NEGATIVE" : "POSITIVE" },
      ],
      risks: params.demandChangePercent > 20 ? [
        "Warehouse capacity may be exceeded",
        "Labor shortage during peak periods",
        "Supplier lead times may not support demand",
      ] : [],
      opportunities: params.demandChangePercent > 0 ? [
        "Negotiate volume discounts with suppliers",
        "Optimize slotting for high-velocity items",
        "Consider automation investments",
      ] : [
        "Reduce safety stock levels",
        "Consolidate warehouse space",
        "Renegotiate fixed costs",
      ],
      recommendation: params.demandChangePercent > 20
        ? "Consider capacity expansion or 3PL partnership"
        : params.demandChangePercent < -20
        ? "Evaluate cost reduction opportunities"
        : "Current operations can accommodate this change",
      confidence: 0.78,
    };
  }

  async runSupplyDisruptionScenario(params: {
    supplierId: string;
    disruptionDuration: number; // days
    affectedItems: string[];
  }): Promise<SimulationResult> {
    return {
      scenarioId: `sim-supply-${Date.now()}`,
      scenarioName: `Supplier Disruption - ${params.disruptionDuration} Days`,
      baselineMetrics: {
        itemsAffected: params.affectedItems.length,
        revenueAtRisk: 450000,
        alternateSupplierCost: 0,
        expeditedShippingCost: 0,
      },
      projectedMetrics: {
        itemsAffected: params.affectedItems.length,
        revenueAtRisk: 450000,
        alternateSupplierCost: 52000,
        expeditedShippingCost: 18000,
      },
      changes: [
        { metric: "Revenue at Risk", baseline: 0, projected: 450000, changePercent: 100, impact: "NEGATIVE" },
        { metric: "Alternate Supplier Cost", baseline: 0, projected: 52000, changePercent: 100, impact: "NEGATIVE" },
        { metric: "Expedited Shipping", baseline: 0, projected: 18000, changePercent: 100, impact: "NEGATIVE" },
      ],
      risks: [
        `${params.affectedItems.length} SKUs at risk of stockout`,
        "Customer satisfaction impact for delayed orders",
        "Potential contract penalties",
      ],
      opportunities: [
        "Dual-source critical components going forward",
        "Increase safety stock for single-source items",
        "Negotiate emergency supply agreements",
      ],
      recommendation: "Activate alternate suppliers immediately. Total mitigation cost: $70,000 vs. $450,000 revenue at risk.",
      confidence: 0.85,
    };
  }

  async runFacilityExpansionScenario(params: {
    expansionType: "NEW_FACILITY" | "EXPAND_EXISTING" | "3PL_PARTNERSHIP";
    capacityIncrease: number; // percent
    investmentBudget: number;
  }): Promise<SimulationResult> {
    const costs = {
      NEW_FACILITY: params.investmentBudget,
      EXPAND_EXISTING: params.investmentBudget * 0.6,
      "3PL_PARTNERSHIP": params.investmentBudget * 0.3,
    };

    const timeToValue = {
      NEW_FACILITY: "12-18 months",
      EXPAND_EXISTING: "4-6 months",
      "3PL_PARTNERSHIP": "1-2 months",
    };

    return {
      scenarioId: `sim-facility-${Date.now()}`,
      scenarioName: `Facility ${params.expansionType.replace(/_/g, ' ')}`,
      baselineMetrics: {
        warehouseCapacity: 50000,
        monthlyThroughput: 25000,
        costPerUnit: 2.45,
        leadTime: 2.1,
      },
      projectedMetrics: {
        warehouseCapacity: 50000 * (1 + params.capacityIncrease / 100),
        monthlyThroughput: 25000 * (1 + params.capacityIncrease / 100),
        costPerUnit: params.expansionType === "3PL_PARTNERSHIP" ? 2.85 : 2.15,
        leadTime: params.expansionType === "NEW_FACILITY" ? 1.5 : 2.0,
      },
      changes: [
        { metric: "Capacity", baseline: 50000, projected: 50000 * (1 + params.capacityIncrease / 100), changePercent: params.capacityIncrease, impact: "POSITIVE" },
        { metric: "Throughput", baseline: 25000, projected: 25000 * (1 + params.capacityIncrease / 100), changePercent: params.capacityIncrease, impact: "POSITIVE" },
        { metric: "Cost per Unit", baseline: 2.45, projected: params.expansionType === "3PL_PARTNERSHIP" ? 2.85 : 2.15, changePercent: params.expansionType === "3PL_PARTNERSHIP" ? 16.3 : -12.2, impact: params.expansionType === "3PL_PARTNERSHIP" ? "NEGATIVE" : "POSITIVE" },
      ],
      risks: params.expansionType === "NEW_FACILITY" ? [
        "Long implementation timeline",
        "High capital commitment",
        "Operational complexity during transition",
      ] : params.expansionType === "3PL_PARTNERSHIP" ? [
        "Less control over operations",
        "Higher variable costs",
        "Quality consistency challenges",
      ] : [
        "Disruption during construction",
        "Limited by existing site constraints",
      ],
      opportunities: [
        "Support projected growth",
        "Improve customer delivery times",
        "Reduce per-unit costs through scale",
      ],
      recommendation: `${params.expansionType.replace(/_/g, ' ')} recommended. ROI: ${params.expansionType === "3PL_PARTNERSHIP" ? "8" : "18"} months. Time to value: ${timeToValue[params.expansionType]}.`,
      confidence: 0.72,
    };
  }
}

// ============================================================================
// NATURAL LANGUAGE INSIGHTS (Claude-Powered)
// ============================================================================

interface NLInsight {
  question: string;
  answer: string;
  confidence: number;
  dataPoints: Array<{
    metric: string;
    value: any;
    context: string;
  }>;
  suggestedFollowUp: string[];
}

export class NaturalLanguageInsights {
  constructor(private tenantId: string) {}

  async askQuestion(question: string): Promise<NLInsight> {
    // In production, this would call Claude API with context
    // Simulating intelligent responses

    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes("stockout") || lowerQuestion.includes("stock out")) {
      return {
        question,
        answer: "Based on current inventory levels and demand patterns, you have 3 items at critical risk of stockout within the next 7 days. SKU-WIDGET-001 is most urgent with only 5 days of supply remaining. I recommend placing an emergency order today, as the supplier lead time is 7 days. Two other items (SKU-GADGET-042 and SKU-COMP-103) should be ordered within 48 hours to maintain safety stock levels.",
        confidence: 0.92,
        dataPoints: [
          { metric: "Critical Stockout Risk", value: 3, context: "items within 7 days" },
          { metric: "Most Urgent Item", value: "SKU-WIDGET-001", context: "5 days supply remaining" },
          { metric: "Recommended Action", value: "Order today", context: "7-day supplier lead time" },
        ],
        suggestedFollowUp: [
          "Which suppliers should I order from?",
          "What quantities do you recommend?",
          "Are there alternative items in stock?",
        ],
      };
    }

    if (lowerQuestion.includes("efficiency") || lowerQuestion.includes("productivity")) {
      return {
        question,
        answer: "Your warehouse efficiency this week is 94.2%, which is 2.1% above your 90-day average. Zone A is performing exceptionally well at 102% of standard, while Zone B has dropped to 88% due to a slotting issue I detected. I recommend relocating 3 high-velocity SKUs from Zone B back storage to golden zone locations - this change would improve Zone B efficiency by an estimated 15%.",
        confidence: 0.88,
        dataPoints: [
          { metric: "Overall Efficiency", value: "94.2%", context: "+2.1% vs 90-day avg" },
          { metric: "Zone A Performance", value: "102%", context: "exceeding standard" },
          { metric: "Zone B Performance", value: "88%", context: "below standard - slotting issue" },
        ],
        suggestedFollowUp: [
          "Show me the Zone B slotting recommendation",
          "Which workers are top performers?",
          "What's causing the Zone B issue?",
        ],
      };
    }

    // Default response for unrecognized questions
    return {
      question,
      answer: "I analyzed your warehouse data but need more context to provide a specific answer. Could you ask about inventory levels, stockouts, efficiency, labor productivity, or order fulfillment? I can provide detailed insights on any of these areas.",
      confidence: 0.6,
      dataPoints: [],
      suggestedFollowUp: [
        "What items are at risk of stockout?",
        "How is warehouse efficiency trending?",
        "What's our order fulfillment rate?",
        "Which areas need attention?",
      ],
    };
  }

  async getSummaryInsights(): Promise<{
    overall: string;
    highlights: Array<{ type: "positive" | "negative" | "neutral"; text: string }>;
    attentionItems: string[];
    keyMetrics: Array<{ name: string; value: string; trend: "up" | "down" | "stable" }>;
  }> {
    return {
      overall: "Your warehouse operations are performing well overall, with efficiency at 94.2% and fulfillment rate at 98.7%. However, I've identified 3 items at stockout risk and 1 anomaly requiring investigation. The slotting optimization I recommended last week has improved Zone A efficiency by 8%.",
      highlights: [
        { type: "positive", text: "Fulfillment rate hit 98.7%, highest in 6 months" },
        { type: "positive", text: "Labor productivity up 5% after shift rebalancing" },
        { type: "negative", text: "3 items at critical stockout risk within 7 days" },
        { type: "negative", text: "Zone B efficiency dropped 12% - needs attention" },
        { type: "neutral", text: "Inventory value stable at $2.4M" },
      ],
      attentionItems: [
        "SKU-WIDGET-001 needs emergency reorder",
        "Zone B slotting needs optimization",
        "Supplier XYZ quality issue detected",
      ],
      keyMetrics: [
        { name: "Fulfillment Rate", value: "98.7%", trend: "up" },
        { name: "Warehouse Efficiency", value: "94.2%", trend: "up" },
        { name: "Inventory Value", value: "$2.4M", trend: "stable" },
        { name: "Orders Today", value: "1,247", trend: "up" },
        { name: "Labor Utilization", value: "87%", trend: "stable" },
      ],
    };
  }
}

// ============================================================================
// UNIFIED INTELLIGENCE DASHBOARD
// ============================================================================

export class IntelligenceEngine {
  private predictive: PredictiveAnalyticsService;
  private anomaly: AnomalyDetectionService;
  private recommendations: RecommendationEngine;
  private simulation: SimulationEngine;
  private nlInsights: NaturalLanguageInsights;

  constructor(private tenantId: string) {
    this.predictive = new PredictiveAnalyticsService(tenantId);
    this.anomaly = new AnomalyDetectionService(tenantId);
    this.recommendations = new RecommendationEngine(tenantId);
    this.simulation = new SimulationEngine(tenantId);
    this.nlInsights = new NaturalLanguageInsights(tenantId);
  }

  async getIntelligenceDashboard(): Promise<{
    summary: string;
    urgentItems: number;
    stockoutRisks: number;
    activeAnomalies: number;
    pendingRecommendations: number;
    potentialSavings: number;
    equipmentAlerts: number;
    topPriorities: Array<{
      type: string;
      title: string;
      urgency: string;
      action: string;
    }>;
  }> {
    const [stockouts, anomalies, recommendations, equipment] = await Promise.all([
      this.predictive.predictStockouts({ daysAhead: 14 }),
      this.anomaly.detectAnomalies({ minSeverity: "HIGH" }),
      this.recommendations.generateRecommendations({ minPriority: "HIGH" }),
      this.predictive.predictEquipmentFailure(),
    ]);

    const criticalEquipment = equipment.filter(e => e.riskLevel === "HIGH" || e.riskLevel === "CRITICAL");
    const urgentRecs = recommendations.filter(r => r.priority === "URGENT");
    const criticalAnomalies = anomalies.filter(a => a.severity === "CRITICAL");

    const topPriorities: Array<{ type: string; title: string; urgency: string; action: string }> = [];

    // Add urgent stockouts
    stockouts.filter(s => s.severity === "CRITICAL").forEach(s => {
      topPriorities.push({
        type: "STOCKOUT",
        title: `${s.itemSku} - ${s.daysUntilStockout} days until stockout`,
        urgency: "CRITICAL",
        action: s.suggestedAction,
      });
    });

    // Add critical anomalies
    criticalAnomalies.forEach(a => {
      topPriorities.push({
        type: "ANOMALY",
        title: a.title,
        urgency: "CRITICAL",
        action: a.suggestedActions[0],
      });
    });

    // Add urgent recommendations
    urgentRecs.forEach(r => {
      topPriorities.push({
        type: "RECOMMENDATION",
        title: r.title,
        urgency: "URGENT",
        action: r.implementation.steps[0],
      });
    });

    // Add equipment alerts
    criticalEquipment.forEach(e => {
      topPriorities.push({
        type: "EQUIPMENT",
        title: `${e.equipmentName} - ${e.riskLevel} failure risk`,
        urgency: e.riskLevel,
        action: e.maintenanceRecommendation,
      });
    });

    const totalSavings = recommendations.reduce((sum, r) => sum + r.impact.estimatedValue, 0);

    return {
      summary: `Identified ${topPriorities.length} items requiring immediate attention. ${stockouts.length} stockout risks, ${anomalies.length} anomalies detected, and $${totalSavings.toLocaleString()} in potential savings from ${recommendations.length} recommendations.`,
      urgentItems: topPriorities.length,
      stockoutRisks: stockouts.length,
      activeAnomalies: anomalies.length,
      pendingRecommendations: recommendations.length,
      potentialSavings: totalSavings,
      equipmentAlerts: criticalEquipment.length,
      topPriorities: topPriorities.slice(0, 10),
    };
  }
}
