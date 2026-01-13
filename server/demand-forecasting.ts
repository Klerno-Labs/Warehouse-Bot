/**
 * AI-Powered Demand Forecasting System
 *
 * Machine learning models for predicting demand, seasonal adjustments,
 * and inventory optimization
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type ForecastMethod = "SIMPLE_MOVING_AVERAGE" | "WEIGHTED_MOVING_AVERAGE" | "EXPONENTIAL_SMOOTHING" | "HOLT_WINTERS" | "LINEAR_REGRESSION" | "ARIMA";
export type SeasonalPattern = "NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface ForecastConfig {
  method: ForecastMethod;
  periodDays: number;
  forecastHorizon: number; // Days to forecast
  seasonalPattern?: SeasonalPattern;
  confidenceLevel?: number; // 0.9 = 90% confidence interval
}

export interface ForecastResult {
  itemId: string;
  itemSku: string;
  itemName: string;
  method: ForecastMethod;
  forecast: DailyForecast[];
  totalForecastedDemand: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    bias: number; // Forecast Bias
  };
  seasonalFactors?: number[];
  trend?: {
    direction: "UP" | "DOWN" | "STABLE";
    strength: number; // 0-1
    changePercent: number;
  };
}

export interface DailyForecast {
  date: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  isSeasonalPeak?: boolean;
}

export interface HistoricalDemand {
  date: Date;
  quantity: number;
}

// ============================================================
// FORECASTING SERVICE
// ============================================================

export class DemandForecastingService {
  /**
   * Generate demand forecast for an item
   */
  static async generateForecast(params: {
    tenantId: string;
    itemId: string;
    config: ForecastConfig;
  }): Promise<ForecastResult> {
    const { tenantId, itemId, config } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error("Item not found");

    // Get historical demand data
    const historicalData = await this.getHistoricalDemand(tenantId, itemId, config.periodDays);

    if (historicalData.length < 7) {
      throw new Error("Insufficient historical data for forecasting. Need at least 7 days of data.");
    }

    // Generate forecast based on method
    let forecast: DailyForecast[];
    let accuracy: ForecastResult["accuracy"];

    switch (config.method) {
      case "EXPONENTIAL_SMOOTHING":
        ({ forecast, accuracy } = this.exponentialSmoothing(historicalData, config));
        break;
      case "HOLT_WINTERS":
        ({ forecast, accuracy } = this.holtWinters(historicalData, config));
        break;
      case "LINEAR_REGRESSION":
        ({ forecast, accuracy } = this.linearRegression(historicalData, config));
        break;
      case "WEIGHTED_MOVING_AVERAGE":
        ({ forecast, accuracy } = this.weightedMovingAverage(historicalData, config));
        break;
      case "SIMPLE_MOVING_AVERAGE":
      default:
        ({ forecast, accuracy } = this.simpleMovingAverage(historicalData, config));
        break;
    }

    // Calculate confidence interval
    const totalForecast = forecast.reduce((sum, f) => sum + f.predictedDemand, 0);
    const stdDev = this.calculateStdDev(historicalData.map((h) => h.quantity));

    // Calculate trend
    const trend = this.calculateTrend(historicalData);

    return {
      itemId,
      itemSku: item.sku,
      itemName: item.name,
      method: config.method,
      forecast,
      totalForecastedDemand: Math.round(totalForecast),
      confidenceInterval: {
        lower: Math.round(totalForecast - stdDev * 1.96),
        upper: Math.round(totalForecast + stdDev * 1.96),
      },
      accuracy,
      trend,
    };
  }

  /**
   * Get historical demand for an item
   */
  private static async getHistoricalDemand(
    tenantId: string,
    itemId: string,
    periodDays: number
  ): Promise<HistoricalDemand[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const events = await prisma.inventoryEvent.findMany({
      where: {
        tenantId,
        itemId,
        eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate by day
    const dailyDemand = new Map<string, number>();

    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split("T")[0];
      const currentQty = dailyDemand.get(dateKey) || 0;
      dailyDemand.set(dateKey, currentQty + Math.abs(event.qtyBase));
    }

    // Fill in missing days with 0
    const result: HistoricalDemand[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split("T")[0];
      result.push({
        date: new Date(currentDate),
        quantity: dailyDemand.get(dateKey) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Simple Moving Average forecast
   */
  private static simpleMovingAverage(
    data: HistoricalDemand[],
    config: ForecastConfig
  ): { forecast: DailyForecast[]; accuracy: ForecastResult["accuracy"] } {
    const windowSize = Math.min(7, Math.floor(data.length / 2));
    const recentData = data.slice(-windowSize);
    const average = recentData.reduce((sum, d) => sum + d.quantity, 0) / windowSize;
    const stdDev = this.calculateStdDev(recentData.map((d) => d.quantity));

    const forecast: DailyForecast[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < config.forecastHorizon; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split("T")[0],
        predictedDemand: Math.round(average),
        lowerBound: Math.max(0, Math.round(average - stdDev * 1.96)),
        upperBound: Math.round(average + stdDev * 1.96),
      });
    }

    // Calculate accuracy metrics using holdout
    const accuracy = this.calculateAccuracy(data, windowSize, "SMA");

    return { forecast, accuracy };
  }

  /**
   * Weighted Moving Average forecast
   */
  private static weightedMovingAverage(
    data: HistoricalDemand[],
    config: ForecastConfig
  ): { forecast: DailyForecast[]; accuracy: ForecastResult["accuracy"] } {
    const windowSize = Math.min(7, Math.floor(data.length / 2));
    const recentData = data.slice(-windowSize);

    // Weights: more recent data has higher weight
    const weights = recentData.map((_, i) => i + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const weightedAverage = recentData.reduce(
      (sum, d, i) => sum + d.quantity * weights[i],
      0
    ) / totalWeight;

    const stdDev = this.calculateStdDev(recentData.map((d) => d.quantity));

    const forecast: DailyForecast[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < config.forecastHorizon; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Apply slight decay for longer horizons
      const decayFactor = Math.pow(0.98, i);
      const adjustedForecast = weightedAverage * decayFactor;

      forecast.push({
        date: date.toISOString().split("T")[0],
        predictedDemand: Math.round(adjustedForecast),
        lowerBound: Math.max(0, Math.round(adjustedForecast - stdDev * 1.96)),
        upperBound: Math.round(adjustedForecast + stdDev * 1.96),
      });
    }

    const accuracy = this.calculateAccuracy(data, windowSize, "WMA");

    return { forecast, accuracy };
  }

  /**
   * Exponential Smoothing forecast
   */
  private static exponentialSmoothing(
    data: HistoricalDemand[],
    config: ForecastConfig
  ): { forecast: DailyForecast[]; accuracy: ForecastResult["accuracy"] } {
    const alpha = 0.3; // Smoothing factor
    let smoothed = data[0].quantity;

    // Apply exponential smoothing to historical data
    for (const point of data) {
      smoothed = alpha * point.quantity + (1 - alpha) * smoothed;
    }

    const stdDev = this.calculateStdDev(data.map((d) => d.quantity));

    const forecast: DailyForecast[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < config.forecastHorizon; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split("T")[0],
        predictedDemand: Math.round(smoothed),
        lowerBound: Math.max(0, Math.round(smoothed - stdDev * 1.96)),
        upperBound: Math.round(smoothed + stdDev * 1.96),
      });
    }

    const accuracy = this.calculateAccuracy(data, Math.min(7, data.length - 1), "ES");

    return { forecast, accuracy };
  }

  /**
   * Holt-Winters (Triple Exponential Smoothing) with seasonality
   */
  private static holtWinters(
    data: HistoricalDemand[],
    config: ForecastConfig
  ): { forecast: DailyForecast[]; accuracy: ForecastResult["accuracy"] } {
    const alpha = 0.3; // Level smoothing
    const beta = 0.1; // Trend smoothing
    const gamma = 0.2; // Seasonal smoothing
    const seasonLength = 7; // Weekly seasonality

    if (data.length < seasonLength * 2) {
      // Fall back to exponential smoothing if not enough data
      return this.exponentialSmoothing(data, config);
    }

    // Initialize level and trend
    let level = data.slice(0, seasonLength).reduce((sum, d) => sum + d.quantity, 0) / seasonLength;
    let trend = (data[seasonLength].quantity - data[0].quantity) / seasonLength;

    // Initialize seasonal factors
    const seasonal: number[] = [];
    for (let i = 0; i < seasonLength; i++) {
      const avgSeason = data
        .filter((_, idx) => idx % seasonLength === i)
        .reduce((sum, d) => sum + d.quantity, 0) / Math.ceil(data.length / seasonLength);
      seasonal.push(level > 0 ? avgSeason / level : 1);
    }

    // Apply Holt-Winters
    for (let i = seasonLength; i < data.length; i++) {
      const prevLevel = level;
      const seasonIndex = i % seasonLength;

      level = alpha * (data[i].quantity / seasonal[seasonIndex]) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonal[seasonIndex] = gamma * (data[i].quantity / level) + (1 - gamma) * seasonal[seasonIndex];
    }

    const stdDev = this.calculateStdDev(data.map((d) => d.quantity));

    const forecast: DailyForecast[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < config.forecastHorizon; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const seasonIndex = (data.length + i) % seasonLength;
      const forecastValue = (level + (i + 1) * trend) * seasonal[seasonIndex];

      forecast.push({
        date: date.toISOString().split("T")[0],
        predictedDemand: Math.round(Math.max(0, forecastValue)),
        lowerBound: Math.max(0, Math.round(forecastValue - stdDev * 1.96)),
        upperBound: Math.round(forecastValue + stdDev * 1.96),
        isSeasonalPeak: seasonal[seasonIndex] > 1.2,
      });
    }

    const accuracy = this.calculateAccuracy(data, seasonLength, "HW");

    return { forecast, accuracy };
  }

  /**
   * Linear Regression forecast
   */
  private static linearRegression(
    data: HistoricalDemand[],
    config: ForecastConfig
  ): { forecast: DailyForecast[]; accuracy: ForecastResult["accuracy"] } {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map((d) => d.quantity);

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate standard error
    const residuals = y.map((val, i) => val - (slope * x[i] + intercept));
    const stdError = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2));

    const forecast: DailyForecast[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < config.forecastHorizon; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const forecastValue = slope * (n + i) + intercept;

      forecast.push({
        date: date.toISOString().split("T")[0],
        predictedDemand: Math.round(Math.max(0, forecastValue)),
        lowerBound: Math.max(0, Math.round(forecastValue - stdError * 1.96)),
        upperBound: Math.round(forecastValue + stdError * 1.96),
      });
    }

    const accuracy = this.calculateAccuracy(data, Math.min(7, data.length - 1), "LR");

    return { forecast, accuracy };
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
  }

  /**
   * Calculate forecast accuracy metrics
   */
  private static calculateAccuracy(
    data: HistoricalDemand[],
    holdoutSize: number,
    method: string
  ): ForecastResult["accuracy"] {
    if (data.length <= holdoutSize) {
      return { mape: 0, rmse: 0, bias: 0 };
    }

    const trainData = data.slice(0, -holdoutSize);
    const testData = data.slice(-holdoutSize);

    // Simple forecast for validation
    const avgTrain = trainData.reduce((sum, d) => sum + d.quantity, 0) / trainData.length;

    let sumAbsPercent = 0;
    let sumSquaredError = 0;
    let sumError = 0;
    let validPoints = 0;

    for (const actual of testData) {
      if (actual.quantity > 0) {
        const error = actual.quantity - avgTrain;
        sumAbsPercent += Math.abs(error / actual.quantity);
        sumSquaredError += error * error;
        sumError += error;
        validPoints++;
      }
    }

    return {
      mape: validPoints > 0 ? (sumAbsPercent / validPoints) * 100 : 0,
      rmse: Math.sqrt(sumSquaredError / holdoutSize),
      bias: sumError / holdoutSize,
    };
  }

  /**
   * Calculate trend direction and strength
   */
  private static calculateTrend(data: HistoricalDemand[]): ForecastResult["trend"] {
    if (data.length < 2) {
      return { direction: "STABLE", strength: 0, changePercent: 0 };
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.quantity, 0) / secondHalf.length;

    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    let direction: "UP" | "DOWN" | "STABLE";
    if (changePercent > 10) direction = "UP";
    else if (changePercent < -10) direction = "DOWN";
    else direction = "STABLE";

    const strength = Math.min(1, Math.abs(changePercent) / 50);

    return { direction, strength, changePercent: Math.round(changePercent * 10) / 10 };
  }

  /**
   * Batch forecast for multiple items
   */
  static async batchForecast(params: {
    tenantId: string;
    itemIds?: string[];
    config: ForecastConfig;
  }): Promise<ForecastResult[]> {
    const { tenantId, itemIds, config } = params;

    // Get items to forecast
    const items = await prisma.item.findMany({
      where: {
        tenantId,
        ...(itemIds && { id: { in: itemIds } }),
      },
    });

    const results: ForecastResult[] = [];

    for (const item of items) {
      try {
        const forecast = await this.generateForecast({
          tenantId,
          itemId: item.id,
          config,
        });
        results.push(forecast);
      } catch (error) {
        // Skip items with insufficient data
        console.log(`Skipping forecast for ${item.sku}: insufficient data`);
      }
    }

    return results;
  }

  /**
   * Get demand anomalies (unusual spikes or drops)
   */
  static async detectAnomalies(params: {
    tenantId: string;
    itemId: string;
    periodDays: number;
    threshold?: number; // Standard deviations from mean
  }): Promise<any[]> {
    const { tenantId, itemId, periodDays, threshold = 2 } = params;

    const data = await this.getHistoricalDemand(tenantId, itemId, periodDays);

    const values = data.map((d) => d.quantity);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = this.calculateStdDev(values);

    const anomalies = data.filter((d) => {
      const zScore = stdDev > 0 ? Math.abs(d.quantity - mean) / stdDev : 0;
      return zScore > threshold;
    });

    return anomalies.map((a) => ({
      date: a.date,
      quantity: a.quantity,
      expected: mean,
      deviation: ((a.quantity - mean) / mean) * 100,
      type: a.quantity > mean ? "SPIKE" : "DROP",
    }));
  }

  /**
   * Get seasonal factors for an item
   */
  static async getSeasonalFactors(params: {
    tenantId: string;
    itemId: string;
    pattern: SeasonalPattern;
  }): Promise<{ period: string; factor: number }[]> {
    const { tenantId, itemId, pattern } = params;

    const periodDays = pattern === "YEARLY" ? 365 : pattern === "QUARTERLY" ? 90 : pattern === "MONTHLY" ? 30 : 7;
    const data = await this.getHistoricalDemand(tenantId, itemId, periodDays * 4);

    const overallMean = data.reduce((sum, d) => sum + d.quantity, 0) / data.length;

    if (pattern === "WEEKLY") {
      const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayTotals: number[] = Array(7).fill(0);
      const dayCounts: number[] = Array(7).fill(0);

      for (const d of data) {
        const dow = d.date.getDay();
        dayTotals[dow] += d.quantity;
        dayCounts[dow]++;
      }

      return dayOfWeek.map((day, i) => ({
        period: day,
        factor: overallMean > 0 && dayCounts[i] > 0
          ? (dayTotals[i] / dayCounts[i]) / overallMean
          : 1,
      }));
    }

    if (pattern === "MONTHLY") {
      const monthTotals: number[] = Array(12).fill(0);
      const monthCounts: number[] = Array(12).fill(0);

      for (const d of data) {
        const month = d.date.getMonth();
        monthTotals[month] += d.quantity;
        monthCounts[month]++;
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      return monthNames.map((month, i) => ({
        period: month,
        factor: overallMean > 0 && monthCounts[i] > 0
          ? (monthTotals[i] / monthCounts[i]) / overallMean
          : 1,
      }));
    }

    return [{ period: "All", factor: 1 }];
  }
}
