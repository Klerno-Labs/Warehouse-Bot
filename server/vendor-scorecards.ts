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
      }
    }

    return {
      onTimeDeliveryRate: totalDelivered > 0 ? (onTimeDeliveries / totalDelivered) * 100 : 0,
      qualityRate: 95.5, // Mock - would calculate from quality records
      fillRate: 98.2, // Mock - would calculate from line fulfillment
      leadTimeAccuracy: totalLeadTimes > 0 ? (accurateLeadTimes / totalLeadTimes) * 100 : 0,
      responseTime: 4.5, // Mock - hours to respond to inquiries
      orderAccuracy: 97.3, // Mock - would calculate from discrepancies
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
    let totalItems = 0;

    for (const order of orders) {
      if (order.status === "RECEIVED") {
        for (const line of order.lines) {
          const lineTotal = line.qtyOrdered * line.unitCost;
          totalSpend += lineTotal;
          totalQuantity += line.qtyOrdered;
          totalItems++;
        }
      }
    }

    return {
      averageUnitCost: totalQuantity > 0 ? totalSpend / totalQuantity : 0,
      totalSpend,
      priceVariance: 2.3, // Mock - percentage variance from quoted prices
      shippingCost: totalSpend * 0.05, // Mock - 5% of total spend
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
    // In production, would query quality records, returns, inspections
    return {
      defectRate: 1.8, // Percentage of defective items
      returnRate: 0.5, // Percentage of items returned
      complianceRate: 99.2, // Compliance with specifications
      certifications: ["ISO 9001", "ISO 14001", "AS9100"], // Quality certifications
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
        active: true,
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
