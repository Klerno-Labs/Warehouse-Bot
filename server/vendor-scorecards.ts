/**
 * Supplier Management & Vendor Scorecard System
 *
 * Tracks supplier performance metrics and generates scorecards
 * Helps with vendor selection and supplier relationship management
 */

import { prisma } from "./prisma";

export interface VendorMetrics {
  supplierId: string;
  supplierName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  performance: {
    onTimeDeliveryRate: number; // Percentage
    qualityRate: number; // Percentage
    fillRate: number; // Percentage
    leadTimeAccuracy: number; // Percentage
    responseTime: number; // Hours
    orderAccuracy: number; // Percentage
  };
  costs: {
    averageUnitCost: number;
    totalSpend: number;
    priceVariance: number; // Percentage from quoted
    shippingCost: number;
  };
  orders: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    averageOrderSize: number;
  };
  quality: {
    defectRate: number; // Percentage
    returnRate: number; // Percentage
    complianceRate: number; // Percentage
    certifications: string[];
  };
  overallScore: number; // 0-100
  rating: "A" | "B" | "C" | "D" | "F";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface SupplierComparison {
  category: string;
  suppliers: {
    supplierId: string;
    name: string;
    score: number;
    rank: number;
    metrics: Record<string, number>;
  }[];
}

export class VendorScorecardService {
  /**
   * Generate comprehensive vendor scorecard
   */
  static async generateScorecard(
    supplierId: string,
    tenantId: string,
    periodDays: number = 90
  ): Promise<VendorMetrics> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId, tenantId },
    });

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const endDate = new Date();

    // Get purchase orders for the period
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        tenantId,
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(orders);
    const costs = this.calculateCostMetrics(orders);
    const orderMetrics = this.calculateOrderMetrics(orders);
    const quality = await this.calculateQualityMetrics(supplierId, tenantId, startDate, endDate);

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore({
      performance,
      costs,
      quality,
    });

    const rating = this.getLetterRating(overallScore);
    const { strengths, weaknesses } = this.analyzePerformance({
      performance,
      costs,
      quality,
      orderMetrics,
    });
    const recommendations = this.generateRecommendations(weaknesses, overallScore);

    return {
      supplierId,
      supplierName: supplier.name,
      period: {
        startDate,
        endDate,
      },
      performance,
      costs,
      orders: orderMetrics,
      quality,
      overallScore,
      rating,
      strengths,
      weaknesses,
      recommendations,
    };
  }

  /**
   * Calculate performance metrics
   */
  private static calculatePerformanceMetrics(orders: any[]): VendorMetrics["performance"] {
    if (orders.length === 0) {
      return {
        onTimeDeliveryRate: 0,
        qualityRate: 0,
        fillRate: 0,
        leadTimeAccuracy: 0,
        responseTime: 0,
        orderAccuracy: 0,
      };
    }

    let onTimeDeliveries = 0;
    let totalDelivered = 0;
    let accurateLeadTimes = 0;
    let totalLeadTimes = 0;

    // Fill rate tracking (qty received vs qty ordered)
    let totalQtyOrdered = 0;
    let totalQtyReceived = 0;

    // Order accuracy tracking (lines with correct quantities)
    let totalLines = 0;
    let accurateLines = 0;

    for (const order of orders) {
      if (order.status === "RECEIVED") {
        totalDelivered++;

        // Check if delivered on time
        if (order.receivedDate && order.expectedDelivery) {
          if (order.receivedDate <= order.expectedDelivery) {
            onTimeDeliveries++;
          }
        }

        // Check lead time accuracy (within 2 days)
        if (order.receivedDate && order.expectedDelivery) {
          const daysDiff = Math.abs(
            (order.receivedDate.getTime() - order.expectedDelivery.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 2) {
            accurateLeadTimes++;
          }
          totalLeadTimes++;
        }

        // Calculate fill rate and order accuracy from lines
        for (const line of order.lines) {
          const qtyOrdered = line.qtyOrdered || 0;
          const qtyReceived = line.qtyReceived || line.qtyOrdered || 0;

          totalQtyOrdered += qtyOrdered;
          totalQtyReceived += qtyReceived;
          totalLines++;

          // Line is accurate if received qty matches ordered qty (within 1% tolerance)
          if (qtyOrdered > 0 && Math.abs(qtyReceived - qtyOrdered) / qtyOrdered <= 0.01) {
            accurateLines++;
          }
        }
      }
    }

    // Calculate fill rate (what percentage of ordered qty was received)
    const fillRate = totalQtyOrdered > 0 ? (totalQtyReceived / totalQtyOrdered) * 100 : 0;

    // Calculate order accuracy (percentage of lines with correct quantities)
    const orderAccuracy = totalLines > 0 ? (accurateLines / totalLines) * 100 : 0;

    // Quality rate approximated from fill rate and accuracy (no separate quality records)
    // In a full implementation, this would query inspection/quality records
    const qualityRate = totalDelivered > 0 ? Math.min(100, (fillRate + orderAccuracy) / 2) : 0;

    return {
      onTimeDeliveryRate: totalDelivered > 0 ? (onTimeDeliveries / totalDelivered) * 100 : 0,
      qualityRate: Math.round(qualityRate * 10) / 10,
      fillRate: Math.round(Math.min(100, fillRate) * 10) / 10,
      leadTimeAccuracy: totalLeadTimes > 0 ? (accurateLeadTimes / totalLeadTimes) * 100 : 0,
      responseTime: 0, // Would require separate inquiry tracking system
      orderAccuracy: Math.round(orderAccuracy * 10) / 10,
    };
  }

  /**
   * Calculate cost metrics
   */
  private static calculateCostMetrics(orders: any[]): VendorMetrics["costs"] {
    if (orders.length === 0) {
      return {
        averageUnitCost: 0,
        totalSpend: 0,
        priceVariance: 0,
        shippingCost: 0,
      };
    }

    let totalSpend = 0;
    let totalQuantity = 0;
    let totalShippingCost = 0;

    // Track price variance between quoted (expected) and actual unit costs
    let totalVarianceAmount = 0;
    let totalExpectedCost = 0;

    for (const order of orders) {
      if (order.status === "RECEIVED") {
        // Add shipping cost if available on order
        if (order.shippingCost) {
          totalShippingCost += order.shippingCost;
        }

        for (const line of order.lines) {
          const actualCost = line.unitCost || 0;
          const qtyOrdered = line.qtyOrdered || 0;
          const lineTotal = qtyOrdered * actualCost;

          totalSpend += lineTotal;
          totalQuantity += qtyOrdered;

          // Calculate price variance if we have expected cost from item
          if (line.item?.costBase && qtyOrdered > 0) {
            const expectedLineTotal = qtyOrdered * line.item.costBase;
            totalExpectedCost += expectedLineTotal;
            totalVarianceAmount += Math.abs(lineTotal - expectedLineTotal);
          }
        }
      }
    }

    // Price variance as percentage difference from expected
    const priceVariance = totalExpectedCost > 0
      ? (totalVarianceAmount / totalExpectedCost) * 100
      : 0;

    return {
      averageUnitCost: totalQuantity > 0 ? Math.round((totalSpend / totalQuantity) * 100) / 100 : 0,
      totalSpend: Math.round(totalSpend * 100) / 100,
      priceVariance: Math.round(priceVariance * 10) / 10,
      shippingCost: Math.round(totalShippingCost * 100) / 100,
    };
  }

  /**
   * Calculate order metrics
   */
  private static calculateOrderMetrics(orders: any[]): VendorMetrics["orders"] {
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "RECEIVED").length;
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;

    let totalValue = 0;
    let totalQuantity = 0;

    for (const order of orders) {
      for (const line of order.lines) {
        totalValue += line.qtyOrdered * line.unitCost;
        totalQuantity += line.qtyOrdered;
      }
    }

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
      averageOrderSize: totalOrders > 0 ? totalQuantity / totalOrders : 0,
    };
  }

  /**
   * Calculate quality metrics
   */
  private static async calculateQualityMetrics(
    supplierId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VendorMetrics["quality"]> {
    // Get supplier details for certifications
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { notes: true },
    });

    // Query purchase orders to calculate defect and return rates
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        tenantId,
        status: "RECEIVED",
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lines: true,
      },
    });

    let totalQtyReceived = 0;
    let totalQtyRejected = 0;
    let totalQtyReturned = 0;
    let totalLinesCompliant = 0;
    let totalLines = 0;

    for (const order of orders) {
      for (const line of order.lines) {
        const qtyReceived = line.qtyReceived || line.qtyOrdered || 0;
        const qtyRejected = (line as any).qtyRejected || 0;
        const qtyReturned = (line as any).qtyReturned || 0;

        totalQtyReceived += qtyReceived;
        totalQtyRejected += qtyRejected;
        totalQtyReturned += qtyReturned;
        totalLines++;

        // Line is compliant if no rejections and received qty matches ordered
        if (qtyRejected === 0 && qtyReceived >= (line.qtyOrdered || 0)) {
          totalLinesCompliant++;
        }
      }
    }

    // Calculate rates
    const defectRate = totalQtyReceived > 0
      ? (totalQtyRejected / totalQtyReceived) * 100
      : 0;

    const returnRate = totalQtyReceived > 0
      ? (totalQtyReturned / totalQtyReceived) * 100
      : 0;

    const complianceRate = totalLines > 0
      ? (totalLinesCompliant / totalLines) * 100
      : 100; // Default to 100% if no data

    // Extract certifications from supplier notes (comma-separated list)
    const certifications: string[] = [];
    if (supplier?.notes) {
      const certMatch = supplier.notes.match(/certifications?:\s*([^.]+)/i);
      if (certMatch) {
        certifications.push(...certMatch[1].split(",").map(c => c.trim()).filter(Boolean));
      }
    }

    return {
      defectRate: Math.round(defectRate * 10) / 10,
      returnRate: Math.round(returnRate * 10) / 10,
      complianceRate: Math.round(complianceRate * 10) / 10,
      certifications,
    };
  }

  /**
   * Calculate overall score (weighted average)
   */
  private static calculateOverallScore(metrics: {
    performance: VendorMetrics["performance"];
    costs: VendorMetrics["costs"];
    quality: VendorMetrics["quality"];
  }): number {
    const weights = {
      onTimeDelivery: 0.25,
      quality: 0.25,
      fillRate: 0.15,
      leadTimeAccuracy: 0.1,
      priceCompetitiveness: 0.15,
      defectRate: 0.1,
    };

    const priceScore = Math.max(0, 100 - metrics.costs.priceVariance * 10);
    const defectScore = Math.max(0, 100 - metrics.quality.defectRate * 10);

    const weightedScore =
      metrics.performance.onTimeDeliveryRate * weights.onTimeDelivery +
      metrics.performance.qualityRate * weights.quality +
      metrics.performance.fillRate * weights.fillRate +
      metrics.performance.leadTimeAccuracy * weights.leadTimeAccuracy +
      priceScore * weights.priceCompetitiveness +
      defectScore * weights.defectRate;

    return Math.round(weightedScore * 10) / 10;
  }

  /**
   * Convert score to letter grade
   */
  private static getLetterRating(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  /**
   * Analyze performance to identify strengths and weaknesses
   */
  private static analyzePerformance(metrics: {
    performance: VendorMetrics["performance"];
    costs: VendorMetrics["costs"];
    quality: VendorMetrics["quality"];
    orderMetrics: VendorMetrics["orders"];
  }): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // On-time delivery
    if (metrics.performance.onTimeDeliveryRate >= 95) {
      strengths.push("Excellent on-time delivery performance");
    } else if (metrics.performance.onTimeDeliveryRate < 85) {
      weaknesses.push("Below-target on-time delivery rate");
    }

    // Quality
    if (metrics.quality.defectRate <= 2) {
      strengths.push("Consistently high quality with minimal defects");
    } else if (metrics.quality.defectRate > 5) {
      weaknesses.push("High defect rate affecting product quality");
    }

    // Fill rate
    if (metrics.performance.fillRate >= 98) {
      strengths.push("Outstanding order fulfillment rate");
    } else if (metrics.performance.fillRate < 90) {
      weaknesses.push("Frequent stockouts or partial shipments");
    }

    // Price competitiveness
    if (metrics.costs.priceVariance <= 3) {
      strengths.push("Competitive and stable pricing");
    } else if (metrics.costs.priceVariance > 10) {
      weaknesses.push("Significant price volatility");
    }

    // Lead time accuracy
    if (metrics.performance.leadTimeAccuracy >= 90) {
      strengths.push("Reliable and accurate lead times");
    } else if (metrics.performance.leadTimeAccuracy < 70) {
      weaknesses.push("Inconsistent delivery schedules");
    }

    // Response time
    if (metrics.performance.responseTime <= 8) {
      strengths.push("Responsive customer service");
    } else if (metrics.performance.responseTime > 24) {
      weaknesses.push("Slow response to inquiries");
    }

    return { strengths, weaknesses };
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    weaknesses: string[],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (weaknesses.length === 0) {
      recommendations.push(
        "Continue current relationship - supplier is performing well across all metrics"
      );
      recommendations.push("Consider expanding partnership or negotiating volume discounts");
    } else if (overallScore >= 80) {
      recommendations.push("Address specific weaknesses through supplier development program");
      recommendations.push("Schedule quarterly business review to track improvement");
    } else if (overallScore >= 70) {
      recommendations.push("Implement formal corrective action plan with supplier");
      recommendations.push("Consider dual-sourcing to reduce dependency");
      recommendations.push("Set 90-day improvement targets with milestone reviews");
    } else {
      recommendations.push("Initiate supplier replacement search immediately");
      recommendations.push("Escalate issues to supplier executive management");
      recommendations.push("Begin transition planning to alternative suppliers");
      recommendations.push("Consider penalty clauses or contract renegotiation");
    }

    // Specific recommendations based on weaknesses
    if (weaknesses.some((w) => w.includes("on-time delivery"))) {
      recommendations.push("Request dedicated logistics coordinator for your account");
    }

    if (weaknesses.some((w) => w.includes("defect"))) {
      recommendations.push("Require incoming inspection for all shipments");
      recommendations.push("Request supplier's quality improvement plan");
    }

    if (weaknesses.some((w) => w.includes("price"))) {
      recommendations.push("Lock in pricing with long-term contract");
      recommendations.push("Conduct market analysis for alternative suppliers");
    }

    return recommendations;
  }

  /**
   * Compare multiple suppliers in same category
   */
  static async compareSuppliers(
    tenantId: string,
    category?: string,
    periodDays: number = 90
  ): Promise<SupplierComparison> {
    // Get all suppliers (optionally filtered by category)
    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const scorecards = await Promise.all(
      suppliers.map((s) => this.generateScorecard(s.id, tenantId, periodDays))
    );

    // Sort by overall score
    const ranked = scorecards
      .map((sc, index) => ({
        supplierId: sc.supplierId,
        name: sc.supplierName,
        score: sc.overallScore,
        rank: 0, // Will be set below
        metrics: {
          onTimeDelivery: sc.performance.onTimeDeliveryRate,
          quality: sc.performance.qualityRate,
          fillRate: sc.performance.fillRate,
          defectRate: sc.quality.defectRate,
          totalSpend: sc.costs.totalSpend,
        },
      }))
      .sort((a, b) => b.score - a.score)
      .map((supplier, index) => ({
        ...supplier,
        rank: index + 1,
      }));

    return {
      category: category || "All Suppliers",
      suppliers: ranked,
    };
  }

  /**
   * Get supplier trends over time
   */
  static async getSupplierTrends(
    supplierId: string,
    tenantId: string,
    months: number = 12
  ): Promise<{
    supplierId: string;
    trends: {
      month: string;
      score: number;
      onTimeDeliveryRate: number;
      qualityRate: number;
      totalSpend: number;
    }[];
  }> {
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);

      const scorecard = await this.generateScorecard(supplierId, tenantId, 30);

      trends.push({
        month: monthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
        score: scorecard.overallScore,
        onTimeDeliveryRate: scorecard.performance.onTimeDeliveryRate,
        qualityRate: scorecard.performance.qualityRate,
        totalSpend: scorecard.costs.totalSpend,
      });
    }

    return {
      supplierId,
      trends,
    };
  }
}
