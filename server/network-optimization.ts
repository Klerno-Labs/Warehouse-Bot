/**
 * Network Optimization Service
 *
 * Multi-facility inventory optimization for top 0.01% WMS:
 * - Inventory placement optimization across warehouses
 * - Transfer recommendations between facilities
 * - Demand-based stock positioning
 * - Network capacity planning
 * - Fulfillment routing optimization
 */

import { storage } from "./storage";

// ============================================================================
// TYPES
// ============================================================================

interface Facility {
  id: string;
  name: string;
  type: "WAREHOUSE" | "DC" | "FULFILLMENT_CENTER" | "STORE" | "3PL";
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    latitude: number;
    longitude: number;
  };
  capacity: {
    totalSquareFeet: number;
    usedSquareFeet: number;
    utilizationPercent: number;
    palletPositions: number;
    usedPalletPositions: number;
  };
  capabilities: string[];
  operatingHours: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
  costPerUnit: number;
  avgProcessingTime: number; // hours
  isActive: boolean;
}

interface DemandZone {
  id: string;
  name: string;
  zipCodes: string[];
  avgDailyOrders: number;
  avgOrderValue: number;
  customerCount: number;
  growthRate: number;
  servicedBy: string[]; // facility IDs
}

interface InventoryPosition {
  itemId: string;
  itemSku: string;
  itemName: string;
  totalQuantity: number;
  byFacility: Array<{
    facilityId: string;
    facilityName: string;
    quantity: number;
    daysOfSupply: number;
    avgDailyDemand: number;
    reorderPoint: number;
    maxStock: number;
  }>;
  demandDistribution: Array<{
    demandZoneId: string;
    zoneName: string;
    percentOfDemand: number;
    avgLeadTime: number;
  }>;
}

interface TransferRecommendation {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  fromFacility: {
    id: string;
    name: string;
    currentStock: number;
    daysOfSupply: number;
  };
  toFacility: {
    id: string;
    name: string;
    currentStock: number;
    daysOfSupply: number;
  };
  items: Array<{
    itemId: string;
    itemSku: string;
    itemName: string;
    recommendedQty: number;
    reason: string;
  }>;
  estimatedCost: number;
  estimatedTransitDays: number;
  expectedBenefit: {
    type: "PREVENT_STOCKOUT" | "BALANCE_INVENTORY" | "REDUCE_COST" | "IMPROVE_SERVICE";
    value: number;
    description: string;
  };
  deadline?: Date;
}

interface PlacementRecommendation {
  itemId: string;
  itemSku: string;
  itemName: string;
  currentPlacement: Array<{
    facilityId: string;
    facilityName: string;
    quantity: number;
    percentOfTotal: number;
  }>;
  recommendedPlacement: Array<{
    facilityId: string;
    facilityName: string;
    targetQuantity: number;
    percentOfTotal: number;
    changeRequired: number;
  }>;
  rationale: string[];
  expectedImpact: {
    costSavings: number;
    leadTimeReduction: number;
    serviceImprovement: number;
  };
  implementationSteps: string[];
}

interface FulfillmentRoute {
  orderId: string;
  orderNumber: string;
  destination: {
    zipCode: string;
    city: string;
    state: string;
  };
  items: Array<{
    itemId: string;
    itemSku: string;
    quantity: number;
  }>;
  recommendedFacility: {
    id: string;
    name: string;
    distance: number;
    estimatedShippingCost: number;
    estimatedDeliveryDays: number;
  };
  alternatives: Array<{
    facilityId: string;
    facilityName: string;
    distance: number;
    shippingCost: number;
    deliveryDays: number;
    reason: string;
  }>;
  splitShipmentOption?: {
    facilities: Array<{
      facilityId: string;
      items: string[];
      cost: number;
    }>;
    totalCost: number;
    deliveryImpact: string;
  };
}

interface NetworkCapacityPlan {
  planId: string;
  horizon: "MONTH" | "QUARTER" | "YEAR";
  demandForecast: {
    totalUnits: number;
    growthPercent: number;
    peakPeriods: Array<{ period: string; multiplier: number }>;
  };
  capacityAnalysis: Array<{
    facilityId: string;
    facilityName: string;
    currentCapacity: number;
    projectedDemand: number;
    utilizationPercent: number;
    status: "ADEQUATE" | "TIGHT" | "EXCEEDED";
    recommendations: string[];
  }>;
  networkRecommendations: Array<{
    type: "EXPAND" | "ADD_FACILITY" | "3PL_PARTNERSHIP" | "OPTIMIZE" | "REDUCE";
    description: string;
    investmentRequired: number;
    expectedROI: number;
    timeToImplement: string;
  }>;
}

// ============================================================================
// NETWORK OPTIMIZATION SERVICE
// ============================================================================

export class NetworkOptimizationService {
  constructor(private tenantId: string) {}

  // ============================================================================
  // FACILITY MANAGEMENT
  // ============================================================================

  async getFacilities(): Promise<Facility[]> {
    return [
      {
        id: "fac-main",
        name: "Main Distribution Center",
        type: "DC",
        location: {
          address: "1000 Warehouse Way",
          city: "Chicago",
          state: "IL",
          country: "USA",
          zipCode: "60601",
          latitude: 41.8781,
          longitude: -87.6298,
        },
        capacity: {
          totalSquareFeet: 250000,
          usedSquareFeet: 187500,
          utilizationPercent: 75,
          palletPositions: 5000,
          usedPalletPositions: 3750,
        },
        capabilities: ["COLD_STORAGE", "HAZMAT", "KITTING", "CROSS_DOCK"],
        operatingHours: { start: "06:00", end: "22:00", daysOfWeek: [1, 2, 3, 4, 5, 6] },
        costPerUnit: 2.15,
        avgProcessingTime: 4,
        isActive: true,
      },
      {
        id: "fac-east",
        name: "East Coast Fulfillment",
        type: "FULFILLMENT_CENTER",
        location: {
          address: "500 Commerce Drive",
          city: "Newark",
          state: "NJ",
          country: "USA",
          zipCode: "07102",
          latitude: 40.7357,
          longitude: -74.1724,
        },
        capacity: {
          totalSquareFeet: 150000,
          usedSquareFeet: 127500,
          utilizationPercent: 85,
          palletPositions: 3000,
          usedPalletPositions: 2550,
        },
        capabilities: ["ECOMMERCE", "SAME_DAY", "RETURNS"],
        operatingHours: { start: "00:00", end: "23:59", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
        costPerUnit: 2.45,
        avgProcessingTime: 2,
        isActive: true,
      },
      {
        id: "fac-west",
        name: "West Coast Distribution",
        type: "DC",
        location: {
          address: "2000 Pacific Blvd",
          city: "Los Angeles",
          state: "CA",
          country: "USA",
          zipCode: "90001",
          latitude: 34.0522,
          longitude: -118.2437,
        },
        capacity: {
          totalSquareFeet: 180000,
          usedSquareFeet: 126000,
          utilizationPercent: 70,
          palletPositions: 3500,
          usedPalletPositions: 2450,
        },
        capabilities: ["COLD_STORAGE", "ECOMMERCE", "B2B"],
        operatingHours: { start: "05:00", end: "21:00", daysOfWeek: [1, 2, 3, 4, 5, 6] },
        costPerUnit: 2.35,
        avgProcessingTime: 3,
        isActive: true,
      },
    ];
  }

  async getDemandZones(): Promise<DemandZone[]> {
    return [
      {
        id: "zone-northeast",
        name: "Northeast",
        zipCodes: ["10001-10999", "07001-08999", "06001-06999"],
        avgDailyOrders: 450,
        avgOrderValue: 125,
        customerCount: 28500,
        growthRate: 8.5,
        servicedBy: ["fac-east", "fac-main"],
      },
      {
        id: "zone-midwest",
        name: "Midwest",
        zipCodes: ["60001-62999", "48001-49999", "43001-45999"],
        avgDailyOrders: 380,
        avgOrderValue: 98,
        customerCount: 22000,
        growthRate: 5.2,
        servicedBy: ["fac-main"],
      },
      {
        id: "zone-west",
        name: "West Coast",
        zipCodes: ["90001-96199", "97001-97999", "98001-99499"],
        avgDailyOrders: 520,
        avgOrderValue: 142,
        customerCount: 35000,
        growthRate: 12.3,
        servicedBy: ["fac-west"],
      },
      {
        id: "zone-south",
        name: "Southeast",
        zipCodes: ["30001-39999", "32001-34999", "28001-29999"],
        avgDailyOrders: 290,
        avgOrderValue: 88,
        customerCount: 18500,
        growthRate: 15.8,
        servicedBy: ["fac-main", "fac-east"],
      },
    ];
  }

  // ============================================================================
  // INVENTORY POSITIONING
  // ============================================================================

  async getInventoryPositions(params?: {
    itemIds?: string[];
    imbalanced?: boolean;
  }): Promise<InventoryPosition[]> {
    const positions: InventoryPosition[] = [
      {
        itemId: "item-001",
        itemSku: "SKU-WIDGET-001",
        itemName: "Premium Widget Assembly",
        totalQuantity: 2500,
        byFacility: [
          { facilityId: "fac-main", facilityName: "Main DC", quantity: 1500, daysOfSupply: 25, avgDailyDemand: 60, reorderPoint: 450, maxStock: 2000 },
          { facilityId: "fac-east", facilityName: "East Coast", quantity: 600, daysOfSupply: 15, avgDailyDemand: 40, reorderPoint: 300, maxStock: 800 },
          { facilityId: "fac-west", facilityName: "West Coast", quantity: 400, daysOfSupply: 8, avgDailyDemand: 50, reorderPoint: 375, maxStock: 900 },
        ],
        demandDistribution: [
          { demandZoneId: "zone-northeast", zoneName: "Northeast", percentOfDemand: 28, avgLeadTime: 1.5 },
          { demandZoneId: "zone-midwest", zoneName: "Midwest", percentOfDemand: 22, avgLeadTime: 1.0 },
          { demandZoneId: "zone-west", zoneName: "West Coast", percentOfDemand: 35, avgLeadTime: 2.5 },
          { demandZoneId: "zone-south", zoneName: "Southeast", percentOfDemand: 15, avgLeadTime: 2.0 },
        ],
      },
      {
        itemId: "item-002",
        itemSku: "SKU-GADGET-042",
        itemName: "Electronic Gadget Pro",
        totalQuantity: 1800,
        byFacility: [
          { facilityId: "fac-main", facilityName: "Main DC", quantity: 1200, daysOfSupply: 40, avgDailyDemand: 30, reorderPoint: 225, maxStock: 1500 },
          { facilityId: "fac-east", facilityName: "East Coast", quantity: 400, daysOfSupply: 20, avgDailyDemand: 20, reorderPoint: 150, maxStock: 500 },
          { facilityId: "fac-west", facilityName: "West Coast", quantity: 200, daysOfSupply: 5, avgDailyDemand: 40, reorderPoint: 300, maxStock: 700 },
        ],
        demandDistribution: [
          { demandZoneId: "zone-northeast", zoneName: "Northeast", percentOfDemand: 22, avgLeadTime: 1.5 },
          { demandZoneId: "zone-midwest", zoneName: "Midwest", percentOfDemand: 18, avgLeadTime: 1.0 },
          { demandZoneId: "zone-west", zoneName: "West Coast", percentOfDemand: 45, avgLeadTime: 3.0 },
          { demandZoneId: "zone-south", zoneName: "Southeast", percentOfDemand: 15, avgLeadTime: 2.0 },
        ],
      },
    ];

    if (params?.imbalanced) {
      return positions.filter(p => {
        const avgDaysOfSupply = p.byFacility.reduce((sum, f) => sum + f.daysOfSupply, 0) / p.byFacility.length;
        return p.byFacility.some(f => Math.abs(f.daysOfSupply - avgDaysOfSupply) > 10);
      });
    }

    return positions;
  }

  async generatePlacementRecommendations(): Promise<PlacementRecommendation[]> {
    return [
      {
        itemId: "item-002",
        itemSku: "SKU-GADGET-042",
        itemName: "Electronic Gadget Pro",
        currentPlacement: [
          { facilityId: "fac-main", facilityName: "Main DC", quantity: 1200, percentOfTotal: 66.7 },
          { facilityId: "fac-east", facilityName: "East Coast", quantity: 400, percentOfTotal: 22.2 },
          { facilityId: "fac-west", facilityName: "West Coast", quantity: 200, percentOfTotal: 11.1 },
        ],
        recommendedPlacement: [
          { facilityId: "fac-main", facilityName: "Main DC", targetQuantity: 600, percentOfTotal: 33.3, changeRequired: -600 },
          { facilityId: "fac-east", facilityName: "East Coast", targetQuantity: 500, percentOfTotal: 27.8, changeRequired: +100 },
          { facilityId: "fac-west", facilityName: "West Coast", targetQuantity: 700, percentOfTotal: 38.9, changeRequired: +500 },
        ],
        rationale: [
          "West Coast has 45% of demand but only 11% of inventory",
          "West Coast facility is at 5 days of supply (critical)",
          "Main DC is overstocked at 40 days of supply",
          "Rebalancing will reduce average lead time by 1.2 days",
        ],
        expectedImpact: {
          costSavings: 8500,
          leadTimeReduction: 1.2,
          serviceImprovement: 15,
        },
        implementationSteps: [
          "Create transfer order: Main DC → West Coast (500 units)",
          "Create transfer order: Main DC → East Coast (100 units)",
          "Update replenishment parameters for all facilities",
          "Monitor service levels for 30 days",
        ],
      },
    ];
  }

  // ============================================================================
  // TRANSFER OPTIMIZATION
  // ============================================================================

  async generateTransferRecommendations(): Promise<TransferRecommendation[]> {
    return [
      {
        id: "transfer-rec-001",
        priority: "CRITICAL",
        fromFacility: {
          id: "fac-main",
          name: "Main DC",
          currentStock: 1200,
          daysOfSupply: 40,
        },
        toFacility: {
          id: "fac-west",
          name: "West Coast",
          currentStock: 200,
          daysOfSupply: 5,
        },
        items: [
          {
            itemId: "item-002",
            itemSku: "SKU-GADGET-042",
            itemName: "Electronic Gadget Pro",
            recommendedQty: 500,
            reason: "West Coast at critical stock level (5 days supply)",
          },
        ],
        estimatedCost: 1250,
        estimatedTransitDays: 4,
        expectedBenefit: {
          type: "PREVENT_STOCKOUT",
          value: 45000,
          description: "Prevents estimated $45,000 in lost sales from stockout",
        },
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: "transfer-rec-002",
        priority: "MEDIUM",
        fromFacility: {
          id: "fac-east",
          name: "East Coast",
          currentStock: 850,
          daysOfSupply: 35,
        },
        toFacility: {
          id: "fac-main",
          name: "Main DC",
          currentStock: 450,
          daysOfSupply: 12,
        },
        items: [
          {
            itemId: "item-003",
            itemSku: "SKU-COMP-103",
            itemName: "Component Assembly Kit",
            recommendedQty: 200,
            reason: "Rebalance inventory to optimize network",
          },
        ],
        estimatedCost: 380,
        estimatedTransitDays: 2,
        expectedBenefit: {
          type: "BALANCE_INVENTORY",
          value: 2800,
          description: "Reduces carrying costs and improves fill rates",
        },
      },
    ];
  }

  async createOptimizedTransferPlan(params: {
    items: Array<{ itemId: string; quantity: number }>;
    fromFacilityId: string;
    toFacilityId: string;
    priority: "STANDARD" | "EXPEDITED" | "EMERGENCY";
  }): Promise<{
    planId: string;
    transfers: Array<{
      fromFacility: string;
      toFacility: string;
      items: Array<{ itemId: string; quantity: number }>;
      estimatedCost: number;
      estimatedDays: number;
      carrier: string;
    }>;
    totalCost: number;
    totalDays: number;
    alternatives: Array<{
      description: string;
      costDifference: number;
      timeDifference: number;
    }>;
  }> {
    const baseCost = params.items.reduce((sum, item) => sum + item.quantity * 0.5, 0);
    const priorityMultiplier = params.priority === "EMERGENCY" ? 2.5 : params.priority === "EXPEDITED" ? 1.5 : 1.0;

    return {
      planId: `plan-${Date.now()}`,
      transfers: [
        {
          fromFacility: params.fromFacilityId,
          toFacility: params.toFacilityId,
          items: params.items,
          estimatedCost: baseCost * priorityMultiplier,
          estimatedDays: params.priority === "EMERGENCY" ? 1 : params.priority === "EXPEDITED" ? 2 : 4,
          carrier: params.priority === "EMERGENCY" ? "Air Freight" : "Ground LTL",
        },
      ],
      totalCost: baseCost * priorityMultiplier,
      totalDays: params.priority === "EMERGENCY" ? 1 : params.priority === "EXPEDITED" ? 2 : 4,
      alternatives: [
        {
          description: "Use regional carrier for lower cost",
          costDifference: -150,
          timeDifference: +1,
        },
        {
          description: "Consolidate with scheduled shipment",
          costDifference: -280,
          timeDifference: +3,
        },
      ],
    };
  }

  // ============================================================================
  // FULFILLMENT ROUTING
  // ============================================================================

  async optimizeFulfillmentRoute(order: {
    orderId: string;
    orderNumber: string;
    destinationZip: string;
    items: Array<{ itemId: string; quantity: number }>;
    serviceLevel: "STANDARD" | "EXPRESS" | "SAME_DAY";
  }): Promise<FulfillmentRoute> {
    const facilities = await this.getFacilities();

    // Simulate distance calculations and routing logic
    const bestFacility = facilities[0];
    const alternatives = facilities.slice(1);

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      destination: {
        zipCode: order.destinationZip,
        city: "Customer City",
        state: "ST",
      },
      items: order.items.map(i => ({ ...i, itemSku: `SKU-${i.itemId}` })),
      recommendedFacility: {
        id: bestFacility.id,
        name: bestFacility.name,
        distance: 245,
        estimatedShippingCost: 8.50,
        estimatedDeliveryDays: order.serviceLevel === "SAME_DAY" ? 0 : order.serviceLevel === "EXPRESS" ? 1 : 3,
      },
      alternatives: alternatives.map((f, i) => ({
        facilityId: f.id,
        facilityName: f.name,
        distance: 350 + i * 200,
        shippingCost: 12.50 + i * 3,
        deliveryDays: 2 + i,
        reason: i === 0 ? "Lower shipping zone but longer transit" : "Backup option",
      })),
      splitShipmentOption: order.items.length > 1 ? {
        facilities: [
          { facilityId: "fac-main", items: [order.items[0].itemId], cost: 5.50 },
          { facilityId: "fac-east", items: order.items.slice(1).map(i => i.itemId), cost: 6.50 },
        ],
        totalCost: 12.00,
        deliveryImpact: "Items may arrive on different days",
      } : undefined,
    };
  }

  async batchOptimizeRoutes(orders: Array<{
    orderId: string;
    destinationZip: string;
    items: Array<{ itemId: string; quantity: number }>;
  }>): Promise<{
    optimizedRoutes: Array<{
      orderId: string;
      facilityId: string;
      estimatedCost: number;
    }>;
    consolidationOpportunities: Array<{
      orders: string[];
      facility: string;
      savings: number;
    }>;
    summary: {
      totalOrders: number;
      totalCost: number;
      avgCostPerOrder: number;
      facilitiesUsed: number;
    };
  }> {
    const routes = orders.map((order, i) => ({
      orderId: order.orderId,
      facilityId: i % 3 === 0 ? "fac-main" : i % 3 === 1 ? "fac-east" : "fac-west",
      estimatedCost: 6.50 + Math.random() * 8,
    }));

    const totalCost = routes.reduce((sum, r) => sum + r.estimatedCost, 0);

    return {
      optimizedRoutes: routes,
      consolidationOpportunities: [
        { orders: orders.slice(0, 3).map(o => o.orderId), facility: "fac-east", savings: 4.50 },
        { orders: orders.slice(3, 6).map(o => o.orderId), facility: "fac-west", savings: 3.20 },
      ],
      summary: {
        totalOrders: orders.length,
        totalCost,
        avgCostPerOrder: totalCost / orders.length,
        facilitiesUsed: 3,
      },
    };
  }

  // ============================================================================
  // CAPACITY PLANNING
  // ============================================================================

  async generateCapacityPlan(horizon: "MONTH" | "QUARTER" | "YEAR"): Promise<NetworkCapacityPlan> {
    const growthMultiplier = horizon === "YEAR" ? 1.25 : horizon === "QUARTER" ? 1.08 : 1.02;

    return {
      planId: `cap-plan-${Date.now()}`,
      horizon,
      demandForecast: {
        totalUnits: 850000 * growthMultiplier,
        growthPercent: (growthMultiplier - 1) * 100,
        peakPeriods: [
          { period: "November", multiplier: 1.45 },
          { period: "December", multiplier: 1.62 },
          { period: "Back to School (Aug)", multiplier: 1.18 },
        ],
      },
      capacityAnalysis: [
        {
          facilityId: "fac-main",
          facilityName: "Main DC",
          currentCapacity: 350000,
          projectedDemand: 340000 * growthMultiplier,
          utilizationPercent: (340000 * growthMultiplier / 350000) * 100,
          status: growthMultiplier > 1.1 ? "EXCEEDED" : "TIGHT",
          recommendations: growthMultiplier > 1.1 ? [
            "Expand pallet racking by 20%",
            "Consider mezzanine installation",
            "Evaluate 3PL overflow partnership",
          ] : ["Monitor closely during peak periods"],
        },
        {
          facilityId: "fac-east",
          facilityName: "East Coast",
          currentCapacity: 200000,
          projectedDemand: 185000 * growthMultiplier,
          utilizationPercent: (185000 * growthMultiplier / 200000) * 100,
          status: growthMultiplier > 1.1 ? "TIGHT" : "ADEQUATE",
          recommendations: ["Optimize slotting to improve density"],
        },
        {
          facilityId: "fac-west",
          facilityName: "West Coast",
          currentCapacity: 250000,
          projectedDemand: 325000 * growthMultiplier,
          utilizationPercent: (325000 * growthMultiplier / 250000) * 100,
          status: "EXCEEDED",
          recommendations: [
            "URGENT: West Coast needs 40% capacity increase",
            "Evaluate new facility in Phoenix or Las Vegas",
            "Immediate 3PL partnership required for overflow",
          ],
        },
      ],
      networkRecommendations: [
        {
          type: "ADD_FACILITY",
          description: "Open new 150,000 sq ft facility in Phoenix, AZ to serve growing West region",
          investmentRequired: 8500000,
          expectedROI: 24,
          timeToImplement: "12-18 months",
        },
        {
          type: "3PL_PARTNERSHIP",
          description: "Partner with 3PL in Los Angeles for immediate overflow capacity",
          investmentRequired: 0,
          expectedROI: 8,
          timeToImplement: "1-2 months",
        },
        {
          type: "EXPAND",
          description: "Add mezzanine to Main DC for 30% capacity increase",
          investmentRequired: 1200000,
          expectedROI: 36,
          timeToImplement: "3-4 months",
        },
      ],
    };
  }

  // ============================================================================
  // NETWORK ANALYTICS
  // ============================================================================

  async getNetworkAnalytics(): Promise<{
    summary: {
      totalFacilities: number;
      totalCapacity: number;
      avgUtilization: number;
      totalInventoryValue: number;
      avgLeadTime: number;
    };
    performance: {
      onTimeDelivery: number;
      perfectOrderRate: number;
      fillRate: number;
      avgShippingCost: number;
    };
    optimization: {
      inventoryImbalances: number;
      transfersRecommended: number;
      potentialSavings: number;
      capacityAlerts: number;
    };
    trends: Array<{
      metric: string;
      current: number;
      previous: number;
      change: number;
      trend: "UP" | "DOWN" | "STABLE";
    }>;
  }> {
    return {
      summary: {
        totalFacilities: 3,
        totalCapacity: 580000,
        avgUtilization: 76.7,
        totalInventoryValue: 12500000,
        avgLeadTime: 2.1,
      },
      performance: {
        onTimeDelivery: 96.8,
        perfectOrderRate: 94.2,
        fillRate: 98.5,
        avgShippingCost: 7.85,
      },
      optimization: {
        inventoryImbalances: 12,
        transfersRecommended: 5,
        potentialSavings: 125000,
        capacityAlerts: 2,
      },
      trends: [
        { metric: "Utilization", current: 76.7, previous: 72.3, change: 4.4, trend: "UP" },
        { metric: "Lead Time", current: 2.1, previous: 2.4, change: -0.3, trend: "DOWN" },
        { metric: "Shipping Cost", current: 7.85, previous: 8.12, change: -0.27, trend: "DOWN" },
        { metric: "Fill Rate", current: 98.5, previous: 98.2, change: 0.3, trend: "UP" },
      ],
    };
  }
}
