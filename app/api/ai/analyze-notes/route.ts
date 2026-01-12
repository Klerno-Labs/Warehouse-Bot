import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * POST /api/ai/analyze-notes
 * Analyze production order notes to identify inventory discrepancies
 *
 * Request body:
 * {
 *   startDate?: string,  // ISO date string
 *   endDate?: string,    // ISO date string
 *   itemSku?: string     // Optional: analyze specific item
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, itemSku } = await req.json();

    // Get production orders within date range
    const productionOrders = await storage.getProductionOrders(user.tenantId);

    // Filter by date range if provided
    let filteredOrders = productionOrders;
    if (startDate) {
      filteredOrders = filteredOrders.filter(
        (order: any) => new Date(order.createdAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      filteredOrders = filteredOrders.filter(
        (order: any) => new Date(order.createdAt) <= new Date(endDate)
      );
    }

    // Analyze notes for potential issues
    const analysis = {
      totalOrdersAnalyzed: filteredOrders.length,
      discrepancies: [] as Array<{
        orderId: string;
        orderNumber: string;
        issue: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
        itemSku?: string;
        suggestedAction: string;
      }>,
      patterns: [] as Array<{
        pattern: string;
        occurrences: number;
        affectedOrders: string[];
      }>,
      summary: {
        totalIssuesFound: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
      },
    };

    // Analyze each order's notes
    const patternMap = new Map<string, { count: number; orders: string[] }>();

    for (const order of filteredOrders) {
      const notes = order.notes || order.internalNotes || '';
      if (!notes) continue;

      // Check for common discrepancy keywords
      const keywords = {
        shortage: { severity: 'HIGH' as const, action: 'Verify physical count and update inventory' },
        damaged: { severity: 'MEDIUM' as const, action: 'Assess damage and process adjustment' },
        wrong: { severity: 'HIGH' as const, action: 'Identify correct item and process correction' },
        missing: { severity: 'HIGH' as const, action: 'Locate item or process inventory adjustment' },
        expired: { severity: 'MEDIUM' as const, action: 'Remove from inventory and update records' },
        excess: { severity: 'LOW' as const, action: 'Verify count and update if confirmed' },
        mismatch: { severity: 'MEDIUM' as const, action: 'Reconcile physical vs system inventory' },
        'short shipped': { severity: 'HIGH' as const, action: 'Verify shipment and adjust order' },
      };

      for (const [keyword, config] of Object.entries(keywords)) {
        if (notes.toLowerCase().includes(keyword)) {
          analysis.discrepancies.push({
            orderId: order.id,
            orderNumber: order.orderNumber || order.id,
            issue: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} mentioned in notes`,
            severity: config.severity,
            itemSku: order.itemSku || itemSku,
            suggestedAction: config.action,
          });

          // Track patterns
          if (!patternMap.has(keyword)) {
            patternMap.set(keyword, { count: 0, orders: [] });
          }
          const pattern = patternMap.get(keyword)!;
          pattern.count++;
          pattern.orders.push(order.orderNumber || order.id);
        }
      }
    }

    // Convert patterns to array
    for (const [pattern, data] of patternMap) {
      analysis.patterns.push({
        pattern: pattern.charAt(0).toUpperCase() + pattern.slice(1),
        occurrences: data.count,
        affectedOrders: data.orders,
      });
    }

    // Calculate summary
    analysis.summary.totalIssuesFound = analysis.discrepancies.length;
    analysis.summary.highSeverity = analysis.discrepancies.filter(d => d.severity === 'HIGH').length;
    analysis.summary.mediumSeverity = analysis.discrepancies.filter(d => d.severity === 'MEDIUM').length;
    analysis.summary.lowSeverity = analysis.discrepancies.filter(d => d.severity === 'LOW').length;

    // Sort patterns by occurrence
    analysis.patterns.sort((a, b) => b.occurrences - a.occurrences);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing notes:', error);
    return NextResponse.json(
      { error: 'Failed to analyze notes' },
      { status: 500 }
    );
  }
}
