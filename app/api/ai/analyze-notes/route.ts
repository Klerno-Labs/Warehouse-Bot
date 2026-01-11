import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { prisma } from '@server/prisma';

/**
 * POST /api/ai/analyze-notes
 * Analyze production order notes to identify inventory discrepancies and patterns
 *
 * Request body:
 * {
 *   startDate?: string,  // ISO date string
 *   endDate?: string,    // ISO date string
 *   itemId?: string      // Optional: analyze specific item
 *   departmentId?: string // Optional: analyze specific department
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const body = await req.json();
    const { startDate, endDate, itemId, departmentId } = body;

    // Build date filter
    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, lte: new Date(endDate) };
    }

    // Default to last 30 days if no dates provided
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.createdAt = { gte: thirtyDaysAgo };
    }

    // Fetch production orders with notes
    const productionOrders = await prisma.productionOrder.findMany({
      where: {
        tenantId,
        notes: { not: null },
        ...dateFilter,
        ...(itemId && {
          bom: {
            itemId,
          },
        }),
      },
      select: {
        id: true,
        orderNumber: true,
        notes: true,
        status: true,
        priority: true,
        qtyOrdered: true,
        qtyCompleted: true,
        createdAt: true,
        bom: {
          select: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch consumption records with notes
    const consumptions = await prisma.productionConsumption.findMany({
      where: {
        productionOrder: {
          tenantId,
        },
        notes: { not: null },
        ...dateFilter,
      },
      select: {
        id: true,
        notes: true,
        qtyBase: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        productionOrder: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    // Analyze notes for patterns
    const analysis = analyzeNotes(productionOrders, consumptions);

    return NextResponse.json({
      summary: analysis.summary,
      issues: analysis.issues,
      patterns: analysis.patterns,
      recommendations: analysis.recommendations,
      analyzedRecords: {
        productionOrders: productionOrders.length,
        consumptions: consumptions.length,
      },
      dateRange: {
        start: dateFilter.createdAt?.gte,
        end: dateFilter.createdAt?.lte || new Date(),
      },
    });
  } catch (error) {
    console.error('Error analyzing notes:', error);
    return NextResponse.json(
      { error: 'Failed to analyze notes' },
      { status: 500 }
    );
  }
}

interface NoteIssue {
  id: string;
  type: 'shortage' | 'quality' | 'delay' | 'wrong_item' | 'damage' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: 'production_order' | 'consumption';
  orderNumber?: string;
  itemName?: string;
  itemSku?: string;
  note: string;
  date: Date;
  extractedInfo: {
    quantity?: number;
    reason?: string;
  };
}

interface NotePattern {
  type: string;
  frequency: number;
  affectedItems: Array<{ name: string; sku: string; count: number }>;
  suggestion: string;
}

function analyzeNotes(productionOrders: any[], consumptions: any[]) {
  const issues: NoteIssue[] = [];
  const patternCounts: Record<string, { count: number; items: Map<string, number> }> = {
    shortage: { count: 0, items: new Map() },
    quality: { count: 0, items: new Map() },
    delay: { count: 0, items: new Map() },
    wrong_item: { count: 0, items: new Map() },
    damage: { count: 0, items: new Map() },
    other: { count: 0, items: new Map() },
  };

  // Keywords for issue detection
  const issuePatterns = {
    shortage: [
      /short(age)?/i, /missing/i, /not enough/i, /insufficient/i, /ran out/i,
      /out of stock/i, /no stock/i, /need more/i, /not available/i, /backorder/i,
    ],
    quality: [
      /defect/i, /quality/i, /reject/i, /fail/i, /damaged/i, /broken/i,
      /scrap/i, /rework/i, /inspection/i, /ncr/i, /non-conform/i, /bad/i,
    ],
    delay: [
      /delay/i, /late/i, /behind/i, /waiting/i, /hold/i, /pending/i,
      /backordered/i, /not received/i, /slow/i,
    ],
    wrong_item: [
      /wrong/i, /incorrect/i, /mislabel/i, /mix-?up/i, /switched/i,
      /different/i, /not match/i,
    ],
    damage: [
      /damage/i, /broken/i, /crushed/i, /bent/i, /dent/i, /scratch/i,
      /torn/i, /leak/i,
    ],
  };

  // Analyze production order notes
  for (const order of productionOrders) {
    if (!order.notes) continue;

    const note = order.notes.toLowerCase();
    const itemName = order.bom?.item?.name || 'Unknown';
    const itemSku = order.bom?.item?.sku || 'N/A';

    for (const [issueType, patterns] of Object.entries(issuePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(note)) {
          const issue: NoteIssue = {
            id: order.id,
            type: issueType as NoteIssue['type'],
            severity: determineSeverity(order.notes, issueType, order.priority),
            source: 'production_order',
            orderNumber: order.orderNumber,
            itemName,
            itemSku,
            note: order.notes,
            date: order.createdAt,
            extractedInfo: extractQuantityAndReason(order.notes),
          };
          issues.push(issue);

          // Track pattern
          patternCounts[issueType].count++;
          const itemKey = `${itemName}|${itemSku}`;
          patternCounts[issueType].items.set(
            itemKey,
            (patternCounts[issueType].items.get(itemKey) || 0) + 1
          );
          break; // Only count once per issue type
        }
      }
    }
  }

  // Analyze consumption notes
  for (const consumption of consumptions) {
    if (!consumption.notes) continue;

    const note = consumption.notes.toLowerCase();
    const itemName = consumption.item?.name || 'Unknown';
    const itemSku = consumption.item?.sku || 'N/A';

    for (const [issueType, patterns] of Object.entries(issuePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(note)) {
          const issue: NoteIssue = {
            id: consumption.id,
            type: issueType as NoteIssue['type'],
            severity: determineSeverity(consumption.notes, issueType, 'NORMAL'),
            source: 'consumption',
            orderNumber: consumption.productionOrder?.orderNumber,
            itemName,
            itemSku,
            note: consumption.notes,
            date: consumption.createdAt,
            extractedInfo: extractQuantityAndReason(consumption.notes),
          };
          issues.push(issue);

          // Track pattern
          patternCounts[issueType].count++;
          const itemKey = `${itemName}|${itemSku}`;
          patternCounts[issueType].items.set(
            itemKey,
            (patternCounts[issueType].items.get(itemKey) || 0) + 1
          );
          break;
        }
      }
    }
  }

  // Build patterns summary
  const patterns: NotePattern[] = [];
  for (const [type, data] of Object.entries(patternCounts)) {
    if (data.count > 0) {
      const affectedItems = Array.from(data.items.entries())
        .map(([key, count]) => {
          const [name, sku] = key.split('|');
          return { name, sku, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      patterns.push({
        type,
        frequency: data.count,
        affectedItems,
        suggestion: getPatternSuggestion(type, data.count, affectedItems),
      });
    }
  }

  // Sort issues by severity and date
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Generate summary
  const summary = {
    totalIssuesFound: issues.length,
    bySeverity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    },
    byType: {
      shortage: patternCounts.shortage.count,
      quality: patternCounts.quality.count,
      delay: patternCounts.delay.count,
      wrong_item: patternCounts.wrong_item.count,
      damage: patternCounts.damage.count,
      other: patternCounts.other.count,
    },
    topAffectedItems: getTopAffectedItems(issues, 5),
  };

  // Generate recommendations
  const recommendations = generateRecommendations(summary, patterns, issues);

  return {
    summary,
    issues: issues.slice(0, 50), // Limit to 50 most relevant issues
    patterns: patterns.sort((a, b) => b.frequency - a.frequency),
    recommendations,
  };
}

function determineSeverity(
  note: string,
  issueType: string,
  priority: string
): 'critical' | 'high' | 'medium' | 'low' {
  const noteUpper = note.toUpperCase();

  // Critical keywords
  if (
    noteUpper.includes('URGENT') ||
    noteUpper.includes('CRITICAL') ||
    noteUpper.includes('STOP') ||
    noteUpper.includes('SAFETY') ||
    priority === 'URGENT'
  ) {
    return 'critical';
  }

  // High severity for quality and shortage issues
  if (issueType === 'quality' || issueType === 'shortage') {
    return priority === 'HIGH' ? 'critical' : 'high';
  }

  // Medium for delays and wrong items
  if (issueType === 'delay' || issueType === 'wrong_item') {
    return 'medium';
  }

  return 'low';
}

function extractQuantityAndReason(note: string): { quantity?: number; reason?: string } {
  const result: { quantity?: number; reason?: string } = {};

  // Try to extract quantity
  const qtyMatch = note.match(/(\d+)\s*(units?|pcs?|pieces?|ea|each)/i);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1], 10);
  }

  // Try to extract reason after "because", "due to", etc.
  const reasonMatch = note.match(
    /(?:because|due to|reason:|caused by|resulted from)\s*:?\s*(.+?)(?:\.|$)/i
  );
  if (reasonMatch) {
    result.reason = reasonMatch[1].trim();
  }

  return result;
}

function getTopAffectedItems(issues: NoteIssue[], limit: number) {
  const itemCounts = new Map<string, { name: string; sku: string; count: number }>();

  for (const issue of issues) {
    const key = issue.itemSku || issue.itemName;
    const existing = itemCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      itemCounts.set(key, {
        name: issue.itemName || 'Unknown',
        sku: issue.itemSku || 'N/A',
        count: 1,
      });
    }
  }

  return Array.from(itemCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getPatternSuggestion(
  type: string,
  count: number,
  affectedItems: Array<{ name: string; count: number }>
): string {
  const topItem = affectedItems[0]?.name || 'items';

  switch (type) {
    case 'shortage':
      return count > 5
        ? `Frequent shortages detected (${count} instances). Consider increasing safety stock for ${topItem} and reviewing reorder points.`
        : `Some shortage issues noted. Monitor inventory levels for ${topItem}.`;

    case 'quality':
      return count > 3
        ? `Multiple quality issues identified (${count} instances). Consider a quality review for ${topItem} and supplier evaluation.`
        : `Quality concerns noted. Review inspection procedures for ${topItem}.`;

    case 'delay':
      return count > 5
        ? `Recurring delays detected (${count} instances). Review lead times and supplier performance.`
        : `Some delays noted. Consider buffer time in scheduling.`;

    case 'wrong_item':
      return count > 2
        ? `Item mix-ups occurring (${count} instances). Review picking procedures and labeling for ${topItem}.`
        : `Item identification issue noted. Verify SKU labels.`;

    case 'damage':
      return count > 3
        ? `Damage issues recurring (${count} instances). Review handling procedures and packaging for ${topItem}.`
        : `Damage noted. Check storage conditions.`;

    default:
      return `${count} issues noted. Review for patterns and root causes.`;
  }
}

function generateRecommendations(
  summary: any,
  patterns: NotePattern[],
  issues: NoteIssue[]
): string[] {
  const recommendations: string[] = [];

  // Priority recommendations based on severity
  if (summary.bySeverity.critical > 0) {
    recommendations.push(
      `URGENT: Address ${summary.bySeverity.critical} critical issue(s) immediately.`
    );
  }

  // Shortage recommendations
  if (summary.byType.shortage > 5) {
    recommendations.push(
      'High frequency of shortages detected. Review and update reorder points across affected items.'
    );
    recommendations.push(
      'Consider implementing automated low-stock alerts to prevent future shortages.'
    );
  }

  // Quality recommendations
  if (summary.byType.quality > 3) {
    recommendations.push(
      'Multiple quality issues found. Schedule a quality audit and review supplier certifications.'
    );
  }

  // Delay recommendations
  if (summary.byType.delay > 5) {
    recommendations.push(
      'Recurring delays detected. Review production scheduling and consider adding buffer time.'
    );
  }

  // Item-specific recommendations
  if (summary.topAffectedItems.length > 0) {
    const topItem = summary.topAffectedItems[0];
    if (topItem.count >= 3) {
      recommendations.push(
        `Focus attention on ${topItem.name} (SKU: ${topItem.sku}) - appears in ${topItem.count} issue notes.`
      );
    }
  }

  // General recommendations if no specific issues
  if (recommendations.length === 0) {
    if (summary.totalIssuesFound > 0) {
      recommendations.push(
        'Issues found in notes. Continue monitoring and address individual concerns as they arise.'
      );
    } else {
      recommendations.push(
        'No significant issues detected in notes. Production appears to be running smoothly.'
      );
    }
  }

  return recommendations;
}
