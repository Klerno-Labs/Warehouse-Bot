import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * POST /api/ai/inventory-assistant
 * AI-powered inventory discrepancy analysis and fix suggestions
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, locationId, expectedQty, actualQty, description } = body;

    if (!itemId || expectedQty === undefined || actualQty === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, expectedQty, actualQty' },
        { status: 400 }
      );
    }

    const discrepancy = expectedQty - actualQty;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get item details
    const item = await storage.prisma.item.findFirst({
      where: {
        id: itemId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        baseUom: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Get recent inventory events
    const recentEvents = await storage.prisma.inventoryEvent.findMany({
      where: {
        tenantId: user.tenantId,
        itemId,
        ...(locationId && {
          OR: [
            { fromLocationId: locationId },
            { toLocationId: locationId },
          ],
        }),
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        fromLocation: true,
        toLocation: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Get recent production consumption
    const recentConsumptions = await storage.prisma.productionConsumption.findMany({
      where: {
        itemId,
        ...(locationId && { fromLocationId: locationId }),
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        productionOrder: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    // Get recent cycle counts
    const recentCycleCounts = await storage.prisma.cycleCountLine.findMany({
      where: {
        itemId,
        ...(locationId && { locationId }),
        cycleCount: {
          status: { in: ['COMPLETED'] },
        },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        cycleCount: {
          select: {
            name: true,
            completedAt: true,
          },
        },
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Get recent sales shipments
    const recentShipments = await storage.prisma.shipmentLine.findMany({
      where: {
        itemId,
        shipment: {
          status: { in: ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      include: {
        shipment: {
          select: {
            shipmentNumber: true,
            shipDate: true,
            salesOrder: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    // Get recent receipts
    const recentReceipts = await storage.prisma.receiptLine.findMany({
      where: {
        itemId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        receipt: {
          select: {
            receiptNumber: true,
            receiptDate: true,
            purchaseOrder: {
              select: {
                poNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    // Analyze the discrepancy and generate insights
    const analysis = analyzeDiscrepancy({
      item,
      discrepancy,
      expectedQty,
      actualQty,
      locationId,
      recentEvents,
      recentConsumptions,
      recentCycleCounts,
      recentShipments,
      recentReceipts,
    });

    return NextResponse.json({
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        baseUom: item.baseUom,
      },
      discrepancy: {
        expected: expectedQty,
        actual: actualQty,
        variance: discrepancy,
        percentage: expectedQty > 0 ? ((discrepancy / expectedQty) * 100).toFixed(2) : 0,
      },
      analysis,
      recentActivity: {
        events: recentEvents.slice(0, 10).map((e) => ({
          id: e.id,
          type: e.eventType,
          qty: e.qtyBase,
          from: e.fromLocation?.label,
          to: e.toLocation?.label,
          user: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : 'System',
          date: e.createdAt,
        })),
        consumptions: recentConsumptions.slice(0, 5).map((c) => ({
          id: c.id,
          qty: c.qtyBase,
          productionOrder: c.productionOrder.orderNumber,
          date: c.createdAt,
        })),
        cycleCounts: recentCycleCounts.slice(0, 5).map((cc) => ({
          id: cc.id,
          expected: cc.expectedQtyBase,
          counted: cc.countedQtyBase,
          variance: cc.varianceQtyBase,
          date: cc.cycleCount.completedAt,
        })),
        shipments: recentShipments.slice(0, 5).map((s) => ({
          id: s.id,
          qty: s.qtyShipped,
          shipmentNumber: s.shipment.shipmentNumber,
          date: s.shipment.shipDate,
        })),
        receipts: recentReceipts.slice(0, 5).map((r) => ({
          id: r.id,
          qty: r.qtyReceived,
          receiptNumber: r.receipt.receiptNumber,
          date: r.receipt.receiptDate,
        })),
      },
    });
  } catch (error) {
    console.error('Error in inventory assistant:', error);
    return NextResponse.json(
      { error: 'Failed to analyze inventory discrepancy' },
      { status: 500 }
    );
  }
}

interface AnalysisParams {
  item: any;
  discrepancy: number;
  expectedQty: number;
  actualQty: number;
  locationId?: string;
  recentEvents: any[];
  recentConsumptions: any[];
  recentCycleCounts: any[];
  recentShipments: any[];
  recentReceipts: any[];
}

function analyzeDiscrepancy(params: AnalysisParams) {
  const {
    discrepancy,
    expectedQty,
    actualQty,
    recentEvents,
    recentConsumptions,
    recentCycleCounts,
    recentShipments,
    recentReceipts,
  } = params;

  const possibleCauses: Array<{
    cause: string;
    likelihood: 'high' | 'medium' | 'low';
    evidence: string[];
    suggestedAction: string;
  }> = [];

  const isMissing = discrepancy > 0;
  const isExtra = discrepancy < 0;
  const absDiscrepancy = Math.abs(discrepancy);

  // Analysis 1: Check for unreported consumption
  if (isMissing) {
    const totalConsumption = recentConsumptions.reduce((sum, c) => sum + c.qtyBase, 0);
    if (totalConsumption > 0) {
      const evidence = recentConsumptions.slice(0, 3).map(c =>
        `${c.qtyBase} used in ${c.productionOrder.orderNumber}`
      );
      possibleCauses.push({
        cause: 'Production Consumption Not Recorded',
        likelihood: 'high',
        evidence,
        suggestedAction: 'Verify all production orders have reported consumption. Check if any jobs used material without recording it in the system.',
      });
    }
  }

  // Analysis 2: Check for duplicate transactions
  const duplicateEvents = findDuplicateEvents(recentEvents);
  if (duplicateEvents.length > 0) {
    possibleCauses.push({
      cause: 'Duplicate Transaction Entries',
      likelihood: 'high',
      evidence: duplicateEvents.map(d =>
        `${d.eventType} of ${d.qtyBase} units recorded ${d.count} times around ${new Date(d.date).toLocaleString()}`
      ),
      suggestedAction: 'Review and delete duplicate inventory events. Check if material was moved/issued multiple times in system but only once physically.',
    });
  }

  // Analysis 3: Check recent shipments
  if (isMissing && recentShipments.length > 0) {
    const evidence = recentShipments.slice(0, 3).map(s =>
      `${s.qtyShipped} shipped in ${s.shipment.shipmentNumber}`
    );

    possibleCauses.push({
      cause: 'Shipment Picked But Not Recorded',
      likelihood: 'medium',
      evidence,
      suggestedAction: 'Verify all shipments have corresponding inventory transactions. Check pick tasks and ensure inventory was deducted.',
    });
  }

  // Analysis 4: Check for location transfers
  const transferEvents = recentEvents.filter(e => e.eventType === 'MOVE');
  if (transferEvents.length > 0 && isMissing) {
    possibleCauses.push({
      cause: 'Material Moved to Different Location',
      likelihood: 'high',
      evidence: transferEvents.slice(0, 3).map(e =>
        `${e.qtyBase} moved from ${e.fromLocation?.label} to ${e.toLocation?.label} on ${new Date(e.createdAt).toLocaleDateString()}`
      ),
      suggestedAction: 'Check if material was moved to another location. Review the destination locations for the missing quantity.',
    });
  }

  // Analysis 5: Check for receiving errors
  if (isExtra && recentReceipts.length > 0) {
    possibleCauses.push({
      cause: 'Double Receipt or Over-Receipt',
      likelihood: 'medium',
      evidence: recentReceipts.slice(0, 3).map(r =>
        `${r.qtyReceived} received in ${r.receipt.receiptNumber} from PO ${r.receipt.purchaseOrder?.poNumber || 'N/A'}`
      ),
      suggestedAction: 'Verify receipt quantities against packing slips. Check if material was received twice or if wrong quantity was entered.',
    });
  }

  // Analysis 6: Check cycle count history
  if (recentCycleCounts.length > 0) {
    const lastCount = recentCycleCounts[0];
    if (lastCount.varianceQtyBase !== 0) {
      possibleCauses.push({
        cause: 'Previous Cycle Count Variance Not Resolved',
        likelihood: 'medium',
        evidence: [
          `Last count on ${new Date(lastCount.cycleCount.completedAt || '').toLocaleDateString()} showed variance of ${lastCount.varianceQtyBase}`,
        ],
        suggestedAction: 'Review previous cycle count adjustments. Current discrepancy may be related to unresolved prior variance.',
      });
    }
  }

  // Analysis 7: Check for scrap/hold events
  const scrapEvents = recentEvents.filter(e => e.eventType === 'SCRAP');
  if (scrapEvents.length > 0 && isMissing) {
    possibleCauses.push({
      cause: 'Material Scrapped',
      likelihood: 'medium',
      evidence: scrapEvents.map(e =>
        `${e.qtyBase} scrapped on ${new Date(e.createdAt).toLocaleDateString()}`
      ),
      suggestedAction: 'Verify scrap transactions are legitimate. Ensure scrap was properly documented with reason codes.',
    });
  }

  // Analysis 8: User activity pattern
  const userActivity = analyzeUserActivity(recentEvents);
  if (userActivity.suspiciousPattern) {
    possibleCauses.push({
      cause: 'Unusual User Activity Pattern',
      likelihood: 'low',
      evidence: userActivity.evidence,
      suggestedAction: userActivity.suggestion,
    });
  }

  // Sort by likelihood
  const likelihoodOrder = { high: 0, medium: 1, low: 2 };
  possibleCauses.sort((a, b) => likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]);

  // Generate summary
  const summary = isMissing
    ? `${absDiscrepancy} units are missing (${((absDiscrepancy / expectedQty) * 100).toFixed(1)}% variance)`
    : `${absDiscrepancy} extra units found (${((absDiscrepancy / Math.abs(actualQty)) * 100).toFixed(1)}% variance)`;

  return {
    summary,
    severity: absDiscrepancy / expectedQty > 0.1 ? 'high' : absDiscrepancy / expectedQty > 0.05 ? 'medium' : 'low',
    possibleCauses,
    recommendedNextSteps: generateNextSteps(possibleCauses, isMissing, absDiscrepancy),
  };
}

function findDuplicateEvents(events: any[]) {
  const duplicates: any[] = [];
  const eventMap = new Map<string, any[]>();

  events.forEach(event => {
    const key = `${event.eventType}-${event.qtyBase}-${event.fromLocationId}-${event.toLocationId}`;
    const existing = eventMap.get(key) || [];
    existing.push(event);
    eventMap.set(key, existing);
  });

  eventMap.forEach((group) => {
    if (group.length > 1) {
      const timeDiff = new Date(group[0].createdAt).getTime() - new Date(group[group.length - 1].createdAt).getTime();
      if (Math.abs(timeDiff) < 3600000) { // Within 1 hour
        duplicates.push({
          eventType: group[0].eventType,
          qtyBase: group[0].qtyBase,
          count: group.length,
          date: group[0].createdAt,
        });
      }
    }
  });

  return duplicates;
}

function analyzeUserActivity(events: any[]) {
  const userCounts = new Map<string, number>();

  events.forEach(event => {
    if (event.createdBy) {
      const user = `${event.createdBy.firstName} ${event.createdBy.lastName}`;
      userCounts.set(user, (userCounts.get(user) || 0) + 1);
    }
  });

  const sortedUsers = Array.from(userCounts.entries()).sort((a, b) => b[1] - a[1]);

  if (sortedUsers.length > 0 && sortedUsers[0][1] > events.length * 0.7) {
    return {
      suspiciousPattern: true,
      evidence: [`${sortedUsers[0][0]} made ${sortedUsers[0][1]} out of ${events.length} recent transactions`],
      suggestion: `Review all transactions by ${sortedUsers[0][0]}. Check if transactions were entered correctly.`,
    };
  }

  return { suspiciousPattern: false, evidence: [], suggestion: '' };
}

function generateNextSteps(causes: any[], isMissing: boolean, variance: number) {
  const steps: string[] = [];

  if (causes.length === 0) {
    steps.push('1. Perform a physical cycle count to verify actual quantity');
    steps.push('2. Review all transactions in the last 30 days');
    steps.push('3. Check if material is in a different location');
    return steps;
  }

  if (causes[0].likelihood === 'high') {
    steps.push(`1. ${causes[0].suggestedAction}`);
  }

  steps.push('2. Perform immediate physical count to confirm actual quantity');

  if (isMissing) {
    steps.push('3. Check all nearby locations and work-in-progress areas');
    steps.push('4. Review production orders that used this material');
  } else {
    steps.push('3. Verify recent receipts against packing slips');
    steps.push('4. Check for duplicate receipt entries');
  }

  steps.push('5. Create cycle count adjustment once root cause is identified');
  steps.push('6. Update standard operating procedures if systemic issue is found');

  return steps;
}
