/**
 * Automated Replenishment System
 *
 * Safety stock optimization, EOQ calculations, and automatic reorder
 * point management with ML-based recommendations
 */

import { prisma } from "./prisma";
import { DemandForecastingService } from "./demand-forecasting";

// ============================================================
// TYPES
// ============================================================

export type ReplenishmentMethod = "REORDER_POINT" | "MIN_MAX" | "PERIODIC" | "EOQ" | "DEMAND_DRIVEN";

export interface ReplenishmentPolicy {
  method: ReplenishmentMethod;
  safetyStockDays: number;
  reviewPeriodDays: number;
  serviceLevel: number; // e.g., 0.95 for 95%
  leadTimeDays: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  orderMultiple?: number;
}

export interface ReplenishmentSuggestion {
  itemId: string;
  itemSku: string;
  itemName: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  maxLevel?: number;
  suggestedOrderQty: number;
  economicOrderQty?: number;
  estimatedCost: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  daysUntilStockout: number;
  forecastedDemand: number;
  supplierId?: string;
  supplierName?: string;
  leadTimeDays: number;
}

export interface SafetyStockCalculation {
  itemId: string;
  demandStdDev: number;
  leadTimeStdDev: number;
  serviceLevel: number;
  safetyStock: number;
  method: string;
}

export interface EOQCalculation {
  itemId: string;
  annualDemand: number;
  orderingCost: number;
  holdingCostPercent: number;
  unitCost: number;
  eoq: number;
  ordersPerYear: number;
  totalAnnualCost: number;
}

// ============================================================
// AUTO REPLENISHMENT SERVICE
// ============================================================

export class AutoReplenishmentService {
  // Default policy
  private static DEFAULT_POLICY: ReplenishmentPolicy = {
    method: "DEMAND_DRIVEN",
    safetyStockDays: 7,
    reviewPeriodDays: 1,
    serviceLevel: 0.95,
    leadTimeDays: 7,
  };

  /**
   * Generate replenishment suggestions for all items
   */
  static async generateSuggestions(params: {
    tenantId: string;
    siteId?: string;
    itemIds?: string[];
    policy?: Partial<ReplenishmentPolicy>;
  }): Promise<ReplenishmentSuggestion[]> {
    const { tenantId, siteId, itemIds, policy } = params;

    const effectivePolicy = { ...this.DEFAULT_POLICY, ...policy };

    // Get items to analyze
    const items = await prisma.item.findMany({
      where: {
        tenantId,
        ...(itemIds && { id: { in: itemIds } }),
      },
      include: {
        balances: {
          where: siteId ? { siteId } : undefined,
        },
      },
    });

    const suggestions: ReplenishmentSuggestion[] = [];

    for (const item of items) {
      try {
        const suggestion = await this.analyzeItem(
          tenantId,
          item,
          siteId,
          effectivePolicy
        );
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(`Error analyzing item ${item.sku}:`, error);
      }
    }

    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return suggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Analyze individual item for replenishment needs
   */
  private static async analyzeItem(
    tenantId: string,
    item: any,
    siteId: string | undefined,
    policy: ReplenishmentPolicy
  ): Promise<ReplenishmentSuggestion | null> {
    // Calculate current stock
    const currentStock = item.balances.reduce(
      (sum: number, b: any) => sum + b.qtyBase,
      0
    );

    // Get historical demand
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const demandEvents = await prisma.inventoryEvent.findMany({
      where: {
        itemId: item.id,
        eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalDemand = demandEvents.reduce(
      (sum, e) => sum + Math.abs(e.qtyBase),
      0
    );
    const dailyDemand = totalDemand / 30;

    // If no demand, skip
    if (dailyDemand === 0 && currentStock > 0) {
      return null;
    }

    // Calculate lead time
    const leadTimeDays = item.leadTimeDays || policy.leadTimeDays;

    // Calculate safety stock
    const safetyStock = await this.calculateSafetyStock({
      tenantId,
      itemId: item.id,
      policy,
    });

    // Calculate reorder point
    const reorderPoint = dailyDemand * leadTimeDays + safetyStock.safetyStock;

    // Calculate days until stockout
    const daysUntilStockout =
      dailyDemand > 0 ? Math.floor(currentStock / dailyDemand) : 999;

    // Determine if replenishment needed
    if (currentStock > reorderPoint && daysUntilStockout > leadTimeDays) {
      return null;
    }

    // Calculate suggested order quantity based on method
    let suggestedOrderQty: number;
    let economicOrderQty: number | undefined;

    switch (policy.method) {
      case "EOQ":
        const eoqCalc = this.calculateEOQ({
          annualDemand: dailyDemand * 365,
          orderingCost: 50, // Default ordering cost
          holdingCostPercent: 0.2,
          unitCost: item.costBase || 10,
        });
        economicOrderQty = eoqCalc.eoq;
        suggestedOrderQty = eoqCalc.eoq;
        break;

      case "MIN_MAX":
        const maxLevel = reorderPoint * 2;
        suggestedOrderQty = Math.max(0, maxLevel - currentStock);
        break;

      case "DEMAND_DRIVEN":
        // Use forecast
        try {
          const forecast = await DemandForecastingService.generateForecast({
            tenantId,
            itemId: item.id,
            config: {
              method: "EXPONENTIAL_SMOOTHING",
              periodDays: 30,
              forecastHorizon: leadTimeDays + policy.safetyStockDays,
            },
          });
          suggestedOrderQty = Math.max(
            0,
            forecast.totalForecastedDemand - currentStock + safetyStock.safetyStock
          );
        } catch {
          // Fall back to simple calculation
          suggestedOrderQty = Math.max(
            0,
            dailyDemand * (leadTimeDays + policy.safetyStockDays) - currentStock
          );
        }
        break;

      case "REORDER_POINT":
      default:
        suggestedOrderQty = Math.max(
          0,
          reorderPoint + dailyDemand * policy.safetyStockDays - currentStock
        );
        break;
    }

    // Apply constraints
    if (policy.minOrderQty) {
      suggestedOrderQty = Math.max(suggestedOrderQty, policy.minOrderQty);
    }
    if (policy.maxOrderQty) {
      suggestedOrderQty = Math.min(suggestedOrderQty, policy.maxOrderQty);
    }
    if (policy.orderMultiple) {
      suggestedOrderQty =
        Math.ceil(suggestedOrderQty / policy.orderMultiple) * policy.orderMultiple;
    }

    // Round to whole number
    suggestedOrderQty = Math.ceil(suggestedOrderQty);

    if (suggestedOrderQty <= 0) {
      return null;
    }

    // Determine priority
    let priority: ReplenishmentSuggestion["priority"];
    let reason: string;

    if (currentStock <= 0) {
      priority = "CRITICAL";
      reason = "Out of stock";
    } else if (daysUntilStockout <= leadTimeDays) {
      priority = "CRITICAL";
      reason = `Will stock out in ${daysUntilStockout} days, before lead time`;
    } else if (currentStock <= safetyStock.safetyStock) {
      priority = "HIGH";
      reason = "Below safety stock level";
    } else if (currentStock <= reorderPoint) {
      priority = "MEDIUM";
      reason = "At or below reorder point";
    } else {
      priority = "LOW";
      reason = "Proactive replenishment";
    }

    // Get preferred supplier
    const supplier = await prisma.supplier.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    });

    return {
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      currentStock,
      safetyStock: Math.round(safetyStock.safetyStock),
      reorderPoint: Math.round(reorderPoint),
      suggestedOrderQty,
      economicOrderQty,
      estimatedCost: suggestedOrderQty * (item.costBase || 0),
      priority,
      reason,
      daysUntilStockout,
      forecastedDemand: Math.round(dailyDemand * leadTimeDays),
      supplierId: supplier?.id,
      supplierName: supplier?.name,
      leadTimeDays,
    };
  }

  /**
   * Calculate safety stock
   */
  static async calculateSafetyStock(params: {
    tenantId: string;
    itemId: string;
    policy: ReplenishmentPolicy;
  }): Promise<SafetyStockCalculation> {
    const { tenantId, itemId, policy } = params;

    // Get historical demand for standard deviation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const demandEvents = await prisma.inventoryEvent.findMany({
      where: {
        itemId,
        eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Aggregate daily demand
    const dailyDemands = new Map<string, number>();
    for (const event of demandEvents) {
      const dateKey = event.createdAt.toISOString().split("T")[0];
      const current = dailyDemands.get(dateKey) || 0;
      dailyDemands.set(dateKey, current + Math.abs(event.qtyBase));
    }

    const demandValues = Array.from(dailyDemands.values());
    const demandMean =
      demandValues.length > 0
        ? demandValues.reduce((sum, v) => sum + v, 0) / demandValues.length
        : 0;

    // Calculate standard deviation
    const demandStdDev =
      demandValues.length > 1
        ? Math.sqrt(
            demandValues.reduce((sum, v) => sum + Math.pow(v - demandMean, 2), 0) /
              (demandValues.length - 1)
          )
        : demandMean * 0.2; // Assume 20% CV if insufficient data

    // Z-score for service level
    const zScore = this.getZScore(policy.serviceLevel);

    // Lead time standard deviation (assume 20% of lead time)
    const leadTimeStdDev = policy.leadTimeDays * 0.2;

    // Safety stock formula (considering both demand and lead time variability)
    const safetyStock = zScore * Math.sqrt(
      policy.leadTimeDays * Math.pow(demandStdDev, 2) +
        Math.pow(demandMean, 2) * Math.pow(leadTimeStdDev, 2)
    );

    return {
      itemId,
      demandStdDev,
      leadTimeStdDev,
      serviceLevel: policy.serviceLevel,
      safetyStock: Math.max(0, Math.round(safetyStock)),
      method: "Standard deviation based",
    };
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   */
  static calculateEOQ(params: {
    annualDemand: number;
    orderingCost: number;
    holdingCostPercent: number;
    unitCost: number;
  }): EOQCalculation {
    const { annualDemand, orderingCost, holdingCostPercent, unitCost } = params;

    const annualHoldingCost = unitCost * holdingCostPercent;

    // EOQ formula: sqrt(2 * D * S / H)
    const eoq =
      annualHoldingCost > 0
        ? Math.sqrt((2 * annualDemand * orderingCost) / annualHoldingCost)
        : annualDemand;

    const ordersPerYear = annualDemand / eoq;

    // Total annual cost = (D/Q) * S + (Q/2) * H
    const totalAnnualCost =
      ordersPerYear * orderingCost + (eoq / 2) * annualHoldingCost;

    return {
      itemId: "", // To be filled by caller
      annualDemand,
      orderingCost,
      holdingCostPercent,
      unitCost,
      eoq: Math.round(eoq),
      ordersPerYear: Math.round(ordersPerYear * 10) / 10,
      totalAnnualCost: Math.round(totalAnnualCost),
    };
  }

  /**
   * Get Z-score for service level
   */
  private static getZScore(serviceLevel: number): number {
    // Common service levels and their Z-scores
    const zScores: Record<number, number> = {
      0.5: 0,
      0.75: 0.67,
      0.8: 0.84,
      0.85: 1.04,
      0.9: 1.28,
      0.95: 1.65,
      0.97: 1.88,
      0.99: 2.33,
      0.999: 3.09,
    };

    // Find closest match
    const levels = Object.keys(zScores)
      .map(Number)
      .sort((a, b) => Math.abs(a - serviceLevel) - Math.abs(b - serviceLevel));

    return zScores[levels[0]];
  }

  /**
   * Automatically create purchase orders from suggestions
   */
  static async createPurchaseOrders(params: {
    tenantId: string;
    siteId: string;
    suggestions: ReplenishmentSuggestion[];
    userId: string;
    autoApprove?: boolean;
  }): Promise<any[]> {
    const { tenantId, siteId, suggestions, userId, autoApprove } = params;

    // Group suggestions by supplier
    const supplierGroups = new Map<string, ReplenishmentSuggestion[]>();

    for (const suggestion of suggestions) {
      const supplierId = suggestion.supplierId || "UNKNOWN";
      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, []);
      }
      supplierGroups.get(supplierId)!.push(suggestion);
    }

    const createdPOs: any[] = [];

    for (const [supplierId, items] of supplierGroups) {
      if (supplierId === "UNKNOWN") {
        console.log(`Skipping ${items.length} items with no supplier`);
        continue;
      }

      // Generate PO number
      const poNumber = `PO-AUTO-${Date.now()}`;

      // Calculate totals
      const subtotal = items.reduce((sum, i) => sum + i.estimatedCost, 0);

      // Get expected delivery date
      const maxLeadTime = Math.max(...items.map((i) => i.leadTimeDays));
      const expectedDelivery = new Date();
      expectedDelivery.setDate(expectedDelivery.getDate() + maxLeadTime);

      // Create PO
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId,
          siteId,
          supplierId,
          poNumber,
          status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
          orderDate: new Date(),
          expectedDelivery,
          subtotal,
          total: subtotal,
          notes: "Auto-generated by replenishment system",
          createdByUserId: userId,
          approvedByUserId: autoApprove ? userId : null,
          approvedAt: autoApprove ? new Date() : null,
          lines: {
            create: items.map((item, index) => ({
              itemId: item.itemId,
              lineNumber: index + 1,
              description: item.itemName,
              qtyOrdered: item.suggestedOrderQty,
              uom: "EA",
              unitPrice: item.estimatedCost / item.suggestedOrderQty,
              lineTotal: item.estimatedCost,
              status: "PENDING",
              notes: item.reason,
            })),
          },
        },
        include: {
          lines: true,
          supplier: true,
        },
      });

      createdPOs.push(po);
    }

    return createdPOs;
  }

  /**
   * Optimize reorder points based on historical performance
   */
  static async optimizeReorderPoints(params: {
    tenantId: string;
    itemId: string;
    historicalDays?: number;
  }): Promise<{
    currentReorderPoint: number;
    optimizedReorderPoint: number;
    stockoutEvents: number;
    averageStockLevel: number;
    recommendations: string[];
  }> {
    const { tenantId, itemId, historicalDays = 90 } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error("Item not found");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historicalDays);

    // Count stockout events (balance going to 0)
    const balanceHistory = await prisma.inventoryEvent.findMany({
      where: {
        itemId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    let stockoutEvents = 0;
    let runningBalance = 0;
    let totalBalance = 0;
    let balanceSnapshots = 0;

    for (const event of balanceHistory) {
      runningBalance += event.qtyBase;
      totalBalance += runningBalance;
      balanceSnapshots++;

      if (runningBalance <= 0) {
        stockoutEvents++;
      }
    }

    const averageStockLevel =
      balanceSnapshots > 0 ? totalBalance / balanceSnapshots : 0;

    // Calculate optimized reorder point
    const safetyStock = await this.calculateSafetyStock({
      tenantId,
      itemId,
      policy: this.DEFAULT_POLICY,
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const demandEvents = await prisma.inventoryEvent.findMany({
      where: {
        itemId,
        eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalDemand = demandEvents.reduce(
      (sum, e) => sum + Math.abs(e.qtyBase),
      0
    );
    const dailyDemand = totalDemand / 30;
    const leadTimeDays = item.leadTimeDays || 7;

    const optimizedReorderPoint = Math.round(
      dailyDemand * leadTimeDays + safetyStock.safetyStock
    );

    const recommendations: string[] = [];

    if (stockoutEvents > 0) {
      recommendations.push(
        `${stockoutEvents} stockout events detected. Consider increasing safety stock.`
      );
    }

    if (averageStockLevel > optimizedReorderPoint * 3) {
      recommendations.push(
        `Average stock level (${Math.round(averageStockLevel)}) is high. Consider reducing order quantities.`
      );
    }

    if (item.reorderPointBase && item.reorderPointBase < optimizedReorderPoint * 0.8) {
      recommendations.push(
        `Current reorder point may be too low. Recommend increasing to ${optimizedReorderPoint}.`
      );
    }

    return {
      currentReorderPoint: item.reorderPointBase || 0,
      optimizedReorderPoint,
      stockoutEvents,
      averageStockLevel: Math.round(averageStockLevel),
      recommendations,
    };
  }

  /**
   * Get replenishment dashboard metrics
   */
  static async getDashboardMetrics(tenantId: string, siteId?: string): Promise<any> {
    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: {
          where: siteId ? { siteId } : undefined,
        },
      },
    });

    let outOfStock = 0;
    let lowStock = 0;
    let adequateStock = 0;
    let overStock = 0;

    for (const item of items) {
      const currentStock = item.balances.reduce(
        (sum: number, b: any) => sum + b.qtyBase,
        0
      );
      const reorderPoint = item.reorderPointBase || 0;
      const maxQty = item.maxQtyBase || reorderPoint * 2;

      if (currentStock <= 0) {
        outOfStock++;
      } else if (currentStock <= reorderPoint) {
        lowStock++;
      } else if (currentStock > maxQty) {
        overStock++;
      } else {
        adequateStock++;
      }
    }

    // Get pending POs
    const pendingPOs = await prisma.purchaseOrder.count({
      where: {
        tenantId,
        status: { in: ["PENDING_APPROVAL", "APPROVED", "SENT"] },
      },
    });

    // Calculate total inventory value
    const totalValue = items.reduce((sum, item) => {
      const stock = item.balances.reduce(
        (s: number, b: any) => s + b.qtyBase,
        0
      );
      return sum + stock * (item.costBase || 0);
    }, 0);

    return {
      stockStatus: {
        outOfStock,
        lowStock,
        adequateStock,
        overStock,
      },
      totalItems: items.length,
      totalValue: Math.round(totalValue),
      pendingPurchaseOrders: pendingPOs,
      healthScore: Math.round(
        ((adequateStock + overStock) / items.length) * 100
      ),
    };
  }
}
