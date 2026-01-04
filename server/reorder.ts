/**
 * Automated Reorder Suggestions Engine
 *
 * Analyzes inventory levels, consumption patterns, and lead times
 * to generate intelligent reorder recommendations
 */

import { prisma } from "./prisma";

export interface ReorderSuggestion {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  daysUntilStockout: number;
  averageDailyUsage: number;
  leadTimeDays: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
}

export interface ReorderAnalysis {
  totalSuggestions: number;
  criticalItems: number;
  estimatedTotalCost: number;
  suggestions: ReorderSuggestion[];
}

export class ReorderService {
  /**
   * Generate reorder suggestions for all items in a tenant
   */
  static async generateSuggestions(tenantId: string, siteId?: string): Promise<ReorderAnalysis> {
    // Get all items with inventory balances
    const items = await prisma.item.findMany({
      where: {
        tenantId,
        balances: siteId
          ? {
              some: {
                siteId,
              },
            }
          : undefined,
      },
      include: {
        balances: {
          where: siteId ? { siteId } : undefined,
          include: {
            location: true,
            site: true,
          },
        },
      },
    });

    const suggestions: ReorderSuggestion[] = [];

    for (const item of items) {
      // Calculate total current stock across all locations
      const currentStock = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);

      // Skip if no reorder point set
      if (!item.reorderPointBase || item.reorderPointBase === 0) continue;

      // Check if below reorder point
      if (currentStock <= item.reorderPointBase) {
        // Get usage data from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentEvents = await prisma.inventoryEvent.findMany({
          where: {
            itemId: item.id,
            createdAt: { gte: thirtyDaysAgo },
            eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE", "SCRAP"] },
          },
          select: {
            qtyBase: true,
            createdAt: true,
          },
        });

        // Calculate average daily usage
        const totalUsage = recentEvents.reduce((sum, e) => sum + Math.abs(e.qtyBase), 0);
        const averageDailyUsage = totalUsage / 30;

        // Estimate days until stockout
        const daysUntilStockout =
          averageDailyUsage > 0 ? Math.floor(currentStock / averageDailyUsage) : 999;

        // Determine lead time (use default if not set)
        const leadTimeDays = item.leadTimeDays || 7;

        // Calculate suggested order quantity
        // Formula: (Average Daily Usage × Lead Time) + Safety Stock - Current Stock
        const safetyStock = item.reorderPointBase;
        // Use base UOM ordering quantity or calculated qty
        const minOrderQty = 10; // Default minimum order quantity
        const suggestedOrderQty = Math.max(
          Math.ceil(averageDailyUsage * leadTimeDays + safetyStock - currentStock),
          minOrderQty
        );

        // Estimate cost
        const estimatedCost = suggestedOrderQty * (item.costBase || 0);

        // Determine priority
        let priority: ReorderSuggestion["priority"];
        let reason: string;

        if (currentStock <= 0) {
          priority = "critical";
          reason = "OUT OF STOCK - Immediate action required";
        } else if (daysUntilStockout <= leadTimeDays) {
          priority = "critical";
          reason = `Stock will run out in ${daysUntilStockout} days (lead time: ${leadTimeDays} days)`;
        } else if (currentStock < item.reorderPointBase * 0.5) {
          priority = "high";
          reason = "Below 50% of reorder point";
        } else if (currentStock <= item.reorderPointBase) {
          priority = "medium";
          reason = "Below reorder point";
        } else {
          priority = "low";
          reason = "Approaching reorder point";
        }

        suggestions.push({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          currentStock,
          reorderPoint: item.reorderPointBase,
          reorderQuantity: suggestedOrderQty,
          daysUntilStockout,
          averageDailyUsage,
          leadTimeDays,
          suggestedOrderQty,
          estimatedCost,
          priority,
          reason,
        });
      }
    }

    // Sort by priority and days until stockout
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return {
      totalSuggestions: suggestions.length,
      criticalItems: suggestions.filter((s) => s.priority === "critical").length,
      estimatedTotalCost: suggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
      suggestions,
    };
  }

  /**
   * Create purchase order from reorder suggestion
   */
  static async createPurchaseOrder(
    tenantId: string,
    siteId: string,
    supplierId: string,
    suggestions: string[] // Item IDs
  ): Promise<string> {
    // Get the suggestions data
    const analysis = await this.generateSuggestions(tenantId, siteId);
    const selectedSuggestions = analysis.suggestions.filter((s) => suggestions.includes(s.itemId));

    if (selectedSuggestions.length === 0) {
      throw new Error("No valid suggestions selected");
    }

    // Get next PO number - using lastReceiptNumber as surrogate
    const lastPO = await prisma.purchaseOrder.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const nextNumber = lastPO ? Math.floor(Math.random() * 100000) : 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`;

    // Create PO (simplified - would need full PurchaseOrder schema)
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        siteId,
        supplierId,
        status: "DRAFT",
        orderDate: new Date(),
        expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        lines: {
          create: selectedSuggestions.map((s, index) => ({
            tenantId,
            lineNumber: index + 1,
            itemId: s.itemId,
            uom: "EA", // Default UOM
            qtyOrdered: s.suggestedOrderQty,
            unitPrice: s.estimatedCost / s.suggestedOrderQty,
            lineTotal: s.estimatedCost,
            status: "PENDING",
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return po.id;
  }

  /**
   * Get reorder suggestion for a specific item
   */
  static async getItemSuggestion(
    itemId: string,
    siteId?: string
  ): Promise<ReorderSuggestion | null> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        balances: siteId
          ? {
              where: { siteId },
            }
          : undefined,
      },
    });

    if (!item) return null;

    const analysis = await this.generateSuggestions(item.tenantId, siteId);
    return analysis.suggestions.find((s) => s.itemId === itemId) || null;
  }

  /**
   * Get items that need reordering soon (next 7 days)
   */
  static async getUpcomingReorders(
    tenantId: string,
    siteId?: string,
    daysAhead: number = 7
  ): Promise<ReorderSuggestion[]> {
    const analysis = await this.generateSuggestions(tenantId, siteId);
    return analysis.suggestions.filter((s) => s.daysUntilStockout <= daysAhead);
  }
}

/**
 * Reorder Policy Configuration
 * Defines rules for when and how much to reorder
 */
export interface ReorderPolicy {
  method: "fixed" | "economic" | "dynamic";
  safetyStockDays: number; // How many days of safety stock to maintain
  reviewPeriodDays: number; // How often to review inventory levels
  minimumOrderQty?: number; // Minimum order quantity
  orderMultiple?: number; // Must order in multiples of this quantity
}

export const DEFAULT_REORDER_POLICY: ReorderPolicy = {
  method: "dynamic",
  safetyStockDays: 7,
  reviewPeriodDays: 1,
};

/**
 * Calculate Economic Order Quantity (EOQ)
 * Minimizes total inventory costs
 */
export function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number
): number {
  if (holdingCostPerUnit === 0) return annualDemand / 12; // Default to monthly demand
  return Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
}
