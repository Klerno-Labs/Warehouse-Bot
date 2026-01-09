import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/dashboard/suggested-actions
 * AI-powered suggested next actions based on system state and user role
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suggestions = await generateSuggestedActions(user);

    return NextResponse.json({
      suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating suggested actions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'inventory' | 'purchasing' | 'production' | 'sales' | 'quality' | 'setup';
  href: string;
  icon: string;
  estimatedTime?: string;
  impact?: string;
  data?: any;
}

async function generateSuggestedActions(user: any): Promise<SuggestedAction[]> {
  const suggestions: SuggestedAction[] = [];
  const now = new Date();

  // Check for out of stock items
  const outOfStockItems = await storage.inventoryBalance.findMany({
    where: {
      tenantId: user.tenantId,
      qtyBase: 0,
      item: {
        isActive: true,
      },
    },
    include: {
      item: {
        select: {
          sku: true,
          name: true,
          reorderPoint: true,
        },
      },
    },
    take: 5,
  });

  if (outOfStockItems.length > 0) {
    suggestions.push({
      id: 'out-of-stock',
      title: 'Items Out of Stock',
      description: `${outOfStockItems.length} items need to be restocked`,
      reason: 'These items have zero inventory and may impact operations',
      priority: 'critical',
      category: 'inventory',
      href: '/modules/inventory?filter=out-of-stock',
      icon: 'alert-triangle',
      estimatedTime: '5-10 min',
      impact: 'High - May block orders',
      data: { items: outOfStockItems },
    });
  }

  // Check for low stock items
  const lowStockItems = await storage.inventoryBalance.findMany({
    where: {
      tenantId: user.tenantId,
      item: {
        isActive: true,
        reorderPoint: { not: null },
      },
    },
    include: {
      item: {
        select: {
          sku: true,
          name: true,
          reorderPoint: true,
        },
      },
    },
  });

  const lowStockCount = lowStockItems.filter(
    (balance) =>
      balance.item.reorderPoint !== null &&
      balance.qtyBase <= balance.item.reorderPoint
  ).length;

  if (lowStockCount > 0) {
    suggestions.push({
      id: 'low-stock',
      title: 'Reorder Points Reached',
      description: `${lowStockCount} items at or below reorder point`,
      reason: 'Create purchase orders to replenish inventory',
      priority: 'high',
      category: 'purchasing',
      href: '/purchasing/purchase-orders/new',
      icon: 'shopping-cart',
      estimatedTime: '10-15 min',
      impact: 'Medium - Preventive action',
    });
  }

  // Check for pending receipts (old purchase orders)
  const oldPendingPOs = await storage.purchaseOrder.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['APPROVED', 'SENT'] },
      expectedDeliveryDate: {
        lte: now,
      },
    },
    take: 5,
  });

  if (oldPendingPOs.length > 0) {
    suggestions.push({
      id: 'overdue-receipts',
      title: 'Overdue Purchase Orders',
      description: `${oldPendingPOs.length} POs past expected delivery date`,
      reason: 'Follow up with suppliers or receive these orders',
      priority: 'high',
      category: 'purchasing',
      href: '/purchasing/purchase-orders?filter=overdue',
      icon: 'clock',
      estimatedTime: '15-20 min',
      impact: 'Medium - Inventory planning',
      data: { orders: oldPendingPOs },
    });
  }

  // Check for pending production orders
  const pendingProduction = await storage.productionOrder.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['PLANNED', 'RELEASED'] },
    },
    orderBy: {
      dueDate: 'asc',
    },
    take: 10,
  });

  const overdueProduction = pendingProduction.filter(
    (po) => po.dueDate && po.dueDate < now
  );

  if (overdueProduction.length > 0) {
    suggestions.push({
      id: 'overdue-production',
      title: 'Overdue Production Orders',
      description: `${overdueProduction.length} production orders past due date`,
      reason: 'Start or expedite these jobs to meet customer commitments',
      priority: 'critical',
      category: 'production',
      href: '/manufacturing/production-orders?filter=overdue',
      icon: 'alert-circle',
      estimatedTime: '30-60 min',
      impact: 'High - Customer satisfaction',
      data: { orders: overdueProduction },
    });
  } else if (pendingProduction.length > 0) {
    suggestions.push({
      id: 'start-production',
      title: 'Production Orders Ready',
      description: `${pendingProduction.length} jobs ready to start`,
      reason: 'Begin production to meet scheduled delivery dates',
      priority: 'medium',
      category: 'production',
      href: '/manufacturing/production-board',
      icon: 'play-circle',
      estimatedTime: '20-30 min',
      impact: 'Medium - On-time delivery',
    });
  }

  // Check for pending sales orders
  const pendingSalesOrders = await storage.salesOrder.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['CONFIRMED', 'PICKING'] },
    },
    orderBy: {
      requestedDeliveryDate: 'asc',
    },
    take: 10,
  });

  const overdueSales = pendingSalesOrders.filter(
    (so) => so.requestedDeliveryDate && so.requestedDeliveryDate < now
  );

  if (overdueSales.length > 0) {
    suggestions.push({
      id: 'overdue-shipments',
      title: 'Overdue Sales Orders',
      description: `${overdueSales.length} orders past requested delivery date`,
      reason: 'Ship these orders immediately to satisfy customers',
      priority: 'critical',
      category: 'sales',
      href: '/sales/orders?filter=overdue',
      icon: 'truck',
      estimatedTime: '15-30 min',
      impact: 'High - Customer retention',
      data: { orders: overdueSales },
    });
  } else if (pendingSalesOrders.length > 0) {
    suggestions.push({
      id: 'pick-and-ship',
      title: 'Orders Ready to Ship',
      description: `${pendingSalesOrders.length} sales orders need picking`,
      reason: 'Pick and ship to meet delivery commitments',
      priority: 'medium',
      category: 'sales',
      href: '/sales/orders?status=CONFIRMED',
      icon: 'package',
      estimatedTime: '20-40 min',
      impact: 'Medium - Customer satisfaction',
    });
  }

  // Check for items needing cycle count (long time since last count)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const itemsNeedingCount = await storage.item.findMany({
    where: {
      tenantId: user.tenantId,
      isActive: true,
      cycleCountLines: {
        none: {
          createdAt: {
            gte: ninetyDaysAgo,
          },
        },
      },
    },
    take: 20,
  });

  if (itemsNeedingCount.length >= 10) {
    suggestions.push({
      id: 'cycle-count',
      title: 'Cycle Count Recommended',
      description: `${itemsNeedingCount.length} items not counted in 90+ days`,
      reason: 'Run a cycle count to verify inventory accuracy',
      priority: 'medium',
      category: 'quality',
      href: '/inventory/ai-cycle-count',
      icon: 'clipboard-check',
      estimatedTime: '30-60 min',
      impact: 'Medium - Inventory accuracy',
    });
  }

  // Check for quality inspections pending
  const pendingInspections = await storage.qualityInspection.findMany({
    where: {
      tenantId: user.tenantId,
      status: 'PENDING',
    },
    take: 10,
  });

  if (pendingInspections.length > 0) {
    suggestions.push({
      id: 'pending-inspections',
      title: 'Quality Inspections Pending',
      description: `${pendingInspections.length} inspections awaiting completion`,
      reason: 'Complete quality checks to release inventory',
      priority: 'high',
      category: 'quality',
      href: '/quality/inspections?status=PENDING',
      icon: 'check-circle',
      estimatedTime: '15-25 min',
      impact: 'High - Inventory availability',
    });
  }

  // Check for open NCRs
  const openNCRs = await storage.nonConformanceReport.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['OPEN', 'IN_REVIEW'] },
    },
    take: 10,
  });

  if (openNCRs.length > 0) {
    suggestions.push({
      id: 'open-ncrs',
      title: 'Open Quality Issues',
      description: `${openNCRs.length} non-conformance reports need attention`,
      reason: 'Resolve quality issues to prevent recurrence',
      priority: 'high',
      category: 'quality',
      href: '/quality/ncrs?status=OPEN',
      icon: 'x-circle',
      estimatedTime: '20-40 min',
      impact: 'High - Quality compliance',
    });
  }

  // Check for items with no activity (potential dead stock)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const deadStockCount = await storage.inventoryBalance.count({
    where: {
      tenantId: user.tenantId,
      qtyBase: { gt: 0 },
      item: {
        isActive: true,
        inventoryEvents: {
          none: {
            createdAt: {
              gte: sixtyDaysAgo,
            },
          },
        },
      },
    },
  });

  if (deadStockCount > 5) {
    suggestions.push({
      id: 'dead-stock',
      title: 'Review Slow-Moving Items',
      description: `${deadStockCount} items with no activity in 60+ days`,
      reason: 'Identify dead stock for disposition or clearance',
      priority: 'low',
      category: 'inventory',
      href: '/modules/inventory?filter=dead-stock',
      icon: 'archive',
      estimatedTime: '15-20 min',
      impact: 'Low - Cost optimization',
    });
  }

  // Role-specific suggestions
  if (user.role === 'Purchasing' || user.role === 'Admin') {
    // Check vendor performance
    const recentReceipts = await storage.receipt.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        purchaseOrder: {
          select: {
            supplierId: true,
          },
        },
      },
    });

    if (recentReceipts.length > 10) {
      suggestions.push({
        id: 'vendor-review',
        title: 'Review Supplier Performance',
        description: 'Analyze recent supplier deliveries and quality',
        reason: 'Optimize your supply chain and vendor relationships',
        priority: 'low',
        category: 'purchasing',
        href: '/purchasing/vendor-scorecards',
        icon: 'star',
        estimatedTime: '10-15 min',
        impact: 'Low - Long-term planning',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to top 8 suggestions
  return suggestions.slice(0, 8);
}
