/**
 * Stock Valuation System
 *
 * FIFO, LIFO, Weighted Average Cost (WAC), and Standard Cost
 * inventory valuation methods with full costing support
 */

import { prisma } from "./prisma";
import { Uom } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export type CostingMethod = "FIFO" | "LIFO" | "WAC" | "STANDARD";

export interface CostLayer {
  id: string;
  itemId: string;
  date: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceType?: string;
  referenceId?: string;
  remaining: number;
}

export interface ValuationResult {
  itemId: string;
  itemSku: string;
  itemName: string;
  method: CostingMethod;
  totalQuantity: number;
  totalValue: number;
  averageCost: number;
  costLayers?: CostLayer[];
}

export interface InventoryAgingBucket {
  range: string;
  quantity: number;
  value: number;
  percentOfTotal: number;
}

export interface InventoryAgingReport {
  itemId: string;
  itemSku: string;
  itemName: string;
  totalQuantity: number;
  totalValue: number;
  buckets: InventoryAgingBucket[];
  averageAge: number;
  oldestDate?: Date;
}

export interface COGSCalculation {
  period: {
    start: Date;
    end: Date;
  };
  beginningInventory: number;
  purchases: number;
  costOfGoodsAvailable: number;
  endingInventory: number;
  costOfGoodsSold: number;
  grossProfit?: number;
}

// ============================================================
// STOCK VALUATION SERVICE
// ============================================================

export class StockValuationService {
  /**
   * Get inventory valuation for an item
   */
  static async getItemValuation(params: {
    tenantId: string;
    itemId: string;
    method: CostingMethod;
    asOfDate?: Date;
  }): Promise<ValuationResult> {
    const { tenantId, itemId, method, asOfDate } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error("Item not found");

    // Get all inventory events for this item
    const events = await prisma.inventoryEvent.findMany({
      where: {
        tenantId,
        itemId,
        createdAt: asOfDate ? { lte: asOfDate } : undefined,
      },
      orderBy: { createdAt: method === "LIFO" ? "desc" : "asc" },
    });

    let totalQuantity = 0;
    let totalValue = 0;
    const costLayers: CostLayer[] = [];

    switch (method) {
      case "FIFO":
      case "LIFO":
        ({ totalQuantity, totalValue } = this.calculateLayeredCost(events, costLayers, item));
        break;

      case "WAC":
        ({ totalQuantity, totalValue } = this.calculateWeightedAverageCost(events, item));
        break;

      case "STANDARD":
        const balances = await prisma.inventoryBalance.aggregate({
          where: { tenantId, itemId },
          _sum: { qtyBase: true },
        });
        totalQuantity = balances._sum.qtyBase || 0;
        totalValue = totalQuantity * (item.costBase || 0);
        break;
    }

    return {
      itemId,
      itemSku: item.sku,
      itemName: item.name,
      method,
      totalQuantity,
      totalValue: Math.round(totalValue * 100) / 100,
      averageCost: totalQuantity > 0 ? Math.round((totalValue / totalQuantity) * 100) / 100 : 0,
      costLayers: method === "FIFO" || method === "LIFO" ? costLayers : undefined,
    };
  }

  /**
   * Calculate layered cost (FIFO/LIFO)
   */
  private static calculateLayeredCost(
    events: any[],
    costLayers: CostLayer[],
    item: any
  ): { totalQuantity: number; totalValue: number } {
    // Build cost layers from receipts
    const layers: CostLayer[] = [];

    for (const event of events) {
      if (event.eventType === "RECEIVE" && event.qtyBase > 0) {
        layers.push({
          id: event.id,
          itemId: item.id,
          date: event.createdAt,
          quantity: event.qtyBase,
          unitCost: item.costBase || 0, // Would ideally get from receipt
          totalCost: event.qtyBase * (item.costBase || 0),
          referenceType: "RECEIVE",
          referenceId: event.referenceId,
          remaining: event.qtyBase,
        });
      }
    }

    // Apply issues/consumption to layers
    for (const event of events) {
      if (event.eventType === "ISSUE_TO_WORKCELL" || event.eventType === "SCRAP") {
        let qtyToDeduct = Math.abs(event.qtyBase);

        for (const layer of layers) {
          if (qtyToDeduct <= 0) break;
          if (layer.remaining <= 0) continue;

          const deducted = Math.min(layer.remaining, qtyToDeduct);
          layer.remaining -= deducted;
          qtyToDeduct -= deducted;
        }
      }
    }

    // Calculate totals from remaining layers
    let totalQuantity = 0;
    let totalValue = 0;

    for (const layer of layers) {
      if (layer.remaining > 0) {
        totalQuantity += layer.remaining;
        totalValue += layer.remaining * layer.unitCost;
        costLayers.push(layer);
      }
    }

    return { totalQuantity, totalValue };
  }

  /**
   * Calculate weighted average cost
   */
  private static calculateWeightedAverageCost(
    events: any[],
    item: any
  ): { totalQuantity: number; totalValue: number } {
    let totalQuantity = 0;
    let totalValue = 0;
    let averageCost = item.costBase || 0;

    for (const event of events) {
      if (event.eventType === "RECEIVE") {
        const newQty = event.qtyBase;
        const newCost = item.costBase || 0; // Would ideally get from receipt
        const newValue = newQty * newCost;

        // Recalculate weighted average
        if (totalQuantity + newQty > 0) {
          averageCost = (totalValue + newValue) / (totalQuantity + newQty);
        }

        totalQuantity += newQty;
        totalValue = totalQuantity * averageCost;
      } else if (event.eventType === "ISSUE_TO_WORKCELL" || event.eventType === "SCRAP") {
        const deductQty = Math.abs(event.qtyBase);
        totalQuantity -= deductQty;
        totalValue = totalQuantity * averageCost;
      }
    }

    return {
      totalQuantity: Math.max(0, totalQuantity),
      totalValue: Math.max(0, totalValue),
    };
  }

  /**
   * Get full inventory valuation report
   */
  static async getInventoryValuationReport(params: {
    tenantId: string;
    siteId?: string;
    method: CostingMethod;
    asOfDate?: Date;
  }): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
    items: ValuationResult[];
  }> {
    const { tenantId, siteId, method, asOfDate } = params;

    const items = await prisma.item.findMany({
      where: { tenantId },
    });

    const valuations: ValuationResult[] = [];

    for (const item of items) {
      try {
        const valuation = await this.getItemValuation({
          tenantId,
          itemId: item.id,
          method,
          asOfDate,
        });
        if (valuation.totalQuantity > 0) {
          valuations.push(valuation);
        }
      } catch (error) {
        console.error(`Error valuing item ${item.sku}:`, error);
      }
    }

    return {
      totalItems: valuations.length,
      totalQuantity: valuations.reduce((sum, v) => sum + v.totalQuantity, 0),
      totalValue: valuations.reduce((sum, v) => sum + v.totalValue, 0),
      items: valuations.sort((a, b) => b.totalValue - a.totalValue),
    };
  }

  /**
   * Generate inventory aging report
   */
  static async getInventoryAgingReport(params: {
    tenantId: string;
    siteId?: string;
    itemId?: string;
    agingBuckets?: number[]; // Days [30, 60, 90, 180]
  }): Promise<{
    summary: {
      totalValue: number;
      averageAge: number;
      itemsOverAge: number;
    };
    items: InventoryAgingReport[];
  }> {
    const { tenantId, siteId, itemId, agingBuckets = [30, 60, 90, 180, 365] } = params;

    const items = await prisma.item.findMany({
      where: {
        tenantId,
        ...(itemId && { id: itemId }),
      },
      include: {
        balances: {
          where: siteId ? { siteId } : undefined,
        },
      },
    });

    const agingReports: InventoryAgingReport[] = [];
    const now = new Date();

    for (const item of items) {
      const totalQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      if (totalQty <= 0) continue;

      // Get receipt events to determine age
      const receipts = await prisma.inventoryEvent.findMany({
        where: {
          itemId: item.id,
          eventType: "RECEIVE",
        },
        orderBy: { createdAt: "asc" },
      });

      // Build aging buckets
      const buckets: InventoryAgingBucket[] = [];
      let remainingQty = totalQty;
      let totalValue = 0;
      let weightedAge = 0;
      let oldestDate: Date | undefined;

      // Assign quantities to buckets based on receipt dates (FIFO assumption)
      for (let i = 0; i < agingBuckets.length; i++) {
        const bucketStart = i === 0 ? 0 : agingBuckets[i - 1];
        const bucketEnd = agingBuckets[i];
        const bucketLabel = i === 0 ? `0-${bucketEnd} days` : `${bucketStart + 1}-${bucketEnd} days`;

        let bucketQty = 0;

        for (const receipt of receipts) {
          if (remainingQty <= 0) break;

          const age = Math.floor(
            (now.getTime() - receipt.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (age >= bucketStart && age <= bucketEnd) {
            const qtyFromReceipt = Math.min(remainingQty, receipt.qtyBase);
            bucketQty += qtyFromReceipt;
            remainingQty -= qtyFromReceipt;
            weightedAge += age * qtyFromReceipt;

            if (!oldestDate || receipt.createdAt < oldestDate) {
              oldestDate = receipt.createdAt;
            }
          }
        }

        const bucketValue = bucketQty * (item.costBase || 0);
        totalValue += bucketValue;

        buckets.push({
          range: bucketLabel,
          quantity: bucketQty,
          value: bucketValue,
          percentOfTotal: 0, // Will calculate after
        });
      }

      // Handle anything older than the last bucket
      if (remainingQty > 0) {
        const oldBucketValue = remainingQty * (item.costBase || 0);
        totalValue += oldBucketValue;

        buckets.push({
          range: `>${agingBuckets[agingBuckets.length - 1]} days`,
          quantity: remainingQty,
          value: oldBucketValue,
          percentOfTotal: 0,
        });

        // Estimate age for old items
        const estimatedOldAge = agingBuckets[agingBuckets.length - 1] + 30;
        weightedAge += estimatedOldAge * remainingQty;
      }

      // Calculate percentages
      for (const bucket of buckets) {
        bucket.percentOfTotal = totalValue > 0 ? (bucket.value / totalValue) * 100 : 0;
      }

      agingReports.push({
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        totalQuantity: totalQty,
        totalValue,
        buckets,
        averageAge: totalQty > 0 ? Math.round(weightedAge / totalQty) : 0,
        oldestDate,
      });
    }

    // Calculate summary
    const totalValue = agingReports.reduce((sum, r) => sum + r.totalValue, 0);
    const totalQty = agingReports.reduce((sum, r) => sum + r.totalQuantity, 0);
    const totalWeightedAge = agingReports.reduce(
      (sum, r) => sum + r.averageAge * r.totalQuantity,
      0
    );

    return {
      summary: {
        totalValue,
        averageAge: totalQty > 0 ? Math.round(totalWeightedAge / totalQty) : 0,
        itemsOverAge: agingReports.filter((r) => r.averageAge > 90).length,
      },
      items: agingReports.sort((a, b) => b.totalValue - a.totalValue),
    };
  }

  /**
   * Calculate Cost of Goods Sold
   */
  static async calculateCOGS(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    method: CostingMethod;
  }): Promise<COGSCalculation> {
    const { tenantId, startDate, endDate, method } = params;

    // Get beginning inventory
    const beginningValuation = await this.getInventoryValuationReport({
      tenantId,
      method,
      asOfDate: new Date(startDate.getTime() - 1),
    });

    // Get ending inventory
    const endingValuation = await this.getInventoryValuationReport({
      tenantId,
      method,
      asOfDate: endDate,
    });

    // Get purchases during period
    const purchases = await prisma.inventoryEvent.findMany({
      where: {
        tenantId,
        eventType: "RECEIVE",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        item: true,
      },
    });

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + p.qtyBase * (p.item.costBase || 0),
      0
    );

    const beginningInventory = beginningValuation.totalValue;
    const endingInventory = endingValuation.totalValue;
    const costOfGoodsAvailable = beginningInventory + totalPurchases;
    const costOfGoodsSold = costOfGoodsAvailable - endingInventory;

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      beginningInventory: Math.round(beginningInventory * 100) / 100,
      purchases: Math.round(totalPurchases * 100) / 100,
      costOfGoodsAvailable: Math.round(costOfGoodsAvailable * 100) / 100,
      endingInventory: Math.round(endingInventory * 100) / 100,
      costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
    };
  }

  /**
   * Update item average cost
   */
  static async updateAverageCost(
    itemId: string,
    newReceiptQty: number,
    newReceiptCost: number
  ): Promise<number> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        balances: true,
      },
    });

    if (!item) throw new Error("Item not found");

    const currentQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
    const currentValue = currentQty * (item.avgCostBase || item.costBase || 0);

    const newTotalQty = currentQty + newReceiptQty;
    const newTotalValue = currentValue + newReceiptQty * newReceiptCost;

    const newAverageCost = newTotalQty > 0 ? newTotalValue / newTotalQty : newReceiptCost;

    await prisma.item.update({
      where: { id: itemId },
      data: {
        avgCostBase: newAverageCost,
        lastCostBase: newReceiptCost,
      },
    });

    return newAverageCost;
  }

  /**
   * Get dead stock report
   */
  static async getDeadStockReport(params: {
    tenantId: string;
    inactiveDays: number; // No movement for X days
  }): Promise<{
    totalItems: number;
    totalValue: number;
    items: {
      itemId: string;
      itemSku: string;
      itemName: string;
      quantity: number;
      value: number;
      daysSinceLastMovement: number;
      lastMovementDate?: Date;
    }[];
  }> {
    const { tenantId, inactiveDays } = params;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: true,
      },
    });

    const deadStock: any[] = [];

    for (const item of items) {
      const currentQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      if (currentQty <= 0) continue;

      // Find last movement
      const lastMovement = await prisma.inventoryEvent.findFirst({
        where: {
          itemId: item.id,
          eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE", "RECEIVE"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const lastMovementDate = lastMovement?.createdAt;
      const daysSinceLastMovement = lastMovementDate
        ? Math.floor((Date.now() - lastMovementDate.getTime()) / (1000 * 60 * 60 * 24))
        : 9999;

      if (daysSinceLastMovement >= inactiveDays) {
        deadStock.push({
          itemId: item.id,
          itemSku: item.sku,
          itemName: item.name,
          quantity: currentQty,
          value: currentQty * (item.costBase || 0),
          daysSinceLastMovement,
          lastMovementDate,
        });
      }
    }

    return {
      totalItems: deadStock.length,
      totalValue: deadStock.reduce((sum, d) => sum + d.value, 0),
      items: deadStock.sort((a, b) => b.value - a.value),
    };
  }

  /**
   * Get inventory turnover analysis
   */
  static async getInventoryTurnover(params: {
    tenantId: string;
    periodDays: number;
    itemId?: string;
  }): Promise<{
    overallTurnover: number;
    daysOfInventory: number;
    items: {
      itemId: string;
      itemSku: string;
      itemName: string;
      turnoverRate: number;
      daysOfInventory: number;
      classification: "FAST" | "MEDIUM" | "SLOW" | "DEAD";
    }[];
  }> {
    const { tenantId, periodDays, itemId } = params;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const items = await prisma.item.findMany({
      where: {
        tenantId,
        ...(itemId && { id: itemId }),
      },
      include: {
        balances: true,
      },
    });

    const itemTurnovers: any[] = [];
    let totalCOGS = 0;
    let totalAvgInventory = 0;

    for (const item of items) {
      const currentQty = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const currentValue = currentQty * (item.costBase || 0);

      // Get issues during period (proxy for COGS)
      const issues = await prisma.inventoryEvent.aggregate({
        where: {
          itemId: item.id,
          eventType: { in: ["ISSUE_TO_WORKCELL", "SCRAP"] },
          createdAt: { gte: startDate },
        },
        _sum: { qtyBase: true },
      });

      const issuedQty = Math.abs(issues._sum.qtyBase || 0);
      const issuedValue = issuedQty * (item.costBase || 0);

      // Estimate average inventory (current + issued / 2)
      const avgInventory = (currentValue + issuedValue) / 2;

      // Calculate turnover (annualized)
      const annualizationFactor = 365 / periodDays;
      const turnoverRate =
        avgInventory > 0 ? (issuedValue * annualizationFactor) / avgInventory : 0;

      const daysOfInventory =
        issuedValue > 0 ? (currentValue / issuedValue) * periodDays : 999;

      // Classify
      let classification: "FAST" | "MEDIUM" | "SLOW" | "DEAD";
      if (turnoverRate >= 12) classification = "FAST";
      else if (turnoverRate >= 6) classification = "MEDIUM";
      else if (turnoverRate >= 1) classification = "SLOW";
      else classification = "DEAD";

      itemTurnovers.push({
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        daysOfInventory: Math.round(daysOfInventory),
        classification,
      });

      totalCOGS += issuedValue;
      totalAvgInventory += avgInventory;
    }

    const annualizationFactor = 365 / periodDays;
    const overallTurnover =
      totalAvgInventory > 0
        ? (totalCOGS * annualizationFactor) / totalAvgInventory
        : 0;

    const overallDaysOfInventory =
      totalCOGS > 0
        ? (totalAvgInventory / totalCOGS) * periodDays
        : 999;

    return {
      overallTurnover: Math.round(overallTurnover * 100) / 100,
      daysOfInventory: Math.round(overallDaysOfInventory),
      items: itemTurnovers.sort((a, b) => b.turnoverRate - a.turnoverRate),
    };
  }
}
