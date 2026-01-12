import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  jobs: KanbanJob[];
}

interface KanbanJob {
  id: string;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate?: string;
  assignedTo?: string;
  workstation?: string;
  progress: number;
  routingStep?: string;
  estimatedHours?: number;
  actualHours?: number;
}

/**
 * GET /api/production/kanban
 * Fetch all production jobs with routing information for Kanban board
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get production orders
    const productionOrders = await storage.getProductionOrders(user.tenantId);

    // Define Kanban columns
    const columns: KanbanColumn[] = [
      { id: 'backlog', title: 'Backlog', status: 'BACKLOG', color: '#6B7280', jobs: [] },
      { id: 'queued', title: 'Queued', status: 'QUEUED', color: '#3B82F6', jobs: [] },
      { id: 'in_progress', title: 'In Progress', status: 'IN_PROGRESS', color: '#F59E0B', jobs: [] },
      { id: 'quality_check', title: 'Quality Check', status: 'QUALITY_CHECK', color: '#8B5CF6', jobs: [] },
      { id: 'completed', title: 'Completed', status: 'COMPLETED', color: '#10B981', jobs: [] },
      { id: 'on_hold', title: 'On Hold', status: 'ON_HOLD', color: '#EF4444', jobs: [] },
    ];

    // Map production orders to Kanban jobs
    for (const order of productionOrders) {
      const job: KanbanJob = {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        itemSku: order.itemSku || order.sku || 'N/A',
        itemName: order.itemName || order.name || 'Unknown Item',
        quantity: order.quantity || 1,
        priority: mapPriority(order.priority),
        dueDate: order.dueDate,
        assignedTo: order.assignedTo || order.operator,
        workstation: order.workstation || order.station,
        progress: calculateProgress(order),
        routingStep: order.currentStep || order.routingStep,
        estimatedHours: order.estimatedHours,
        actualHours: order.actualHours,
      };

      // Find the appropriate column
      const status = normalizeStatus(order.status);
      const column = columns.find(c => c.status === status);
      if (column) {
        column.jobs.push(job);
      } else {
        // Default to backlog if status doesn't match
        columns[0].jobs.push(job);
      }
    }

    // Sort jobs within each column by priority and due date
    for (const column of columns) {
      column.jobs.sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
    }

    // Calculate summary stats
    const summary = {
      totalJobs: productionOrders.length,
      byStatus: columns.map(c => ({
        status: c.title,
        count: c.jobs.length,
        color: c.color,
      })),
      byPriority: {
        urgent: productionOrders.filter((o: any) => mapPriority(o.priority) === 'URGENT').length,
        high: productionOrders.filter((o: any) => mapPriority(o.priority) === 'HIGH').length,
        normal: productionOrders.filter((o: any) => mapPriority(o.priority) === 'NORMAL').length,
        low: productionOrders.filter((o: any) => mapPriority(o.priority) === 'LOW').length,
      },
      overdue: productionOrders.filter((o: any) =>
        o.dueDate && new Date(o.dueDate) < new Date() && o.status !== 'COMPLETED'
      ).length,
    };

    return NextResponse.json({
      columns,
      summary,
    });
  } catch (error) {
    console.error('Kanban board error:', error);
    return NextResponse.json({ error: 'Failed to fetch kanban data' }, { status: 500 });
  }
}

/**
 * PATCH /api/production/kanban
 * Update a job's status (move between columns)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, newStatus, newPosition } = await req.json();

    if (!jobId || !newStatus) {
      return NextResponse.json(
        { error: 'jobId and newStatus are required' },
        { status: 400 }
      );
    }

    // Update the production order status
    await storage.updateProductionOrder(jobId, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Job status updated successfully',
    });
  } catch (error) {
    console.error('Kanban update error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

function mapPriority(priority: any): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  if (!priority) return 'NORMAL';
  const p = String(priority).toUpperCase();
  if (p === 'URGENT' || p === 'CRITICAL' || p === '1') return 'URGENT';
  if (p === 'HIGH' || p === '2') return 'HIGH';
  if (p === 'LOW' || p === '4') return 'LOW';
  return 'NORMAL';
}

function normalizeStatus(status: any): string {
  if (!status) return 'BACKLOG';
  const s = String(status).toUpperCase().replace(/[\s-]/g, '_');
  if (['PENDING', 'NEW', 'DRAFT'].includes(s)) return 'BACKLOG';
  if (['QUEUED', 'SCHEDULED', 'READY'].includes(s)) return 'QUEUED';
  if (['IN_PROGRESS', 'ACTIVE', 'PROCESSING', 'STARTED'].includes(s)) return 'IN_PROGRESS';
  if (['QC', 'QUALITY', 'QUALITY_CHECK', 'INSPECTION'].includes(s)) return 'QUALITY_CHECK';
  if (['COMPLETED', 'DONE', 'FINISHED'].includes(s)) return 'COMPLETED';
  if (['ON_HOLD', 'HOLD', 'PAUSED', 'BLOCKED'].includes(s)) return 'ON_HOLD';
  return 'BACKLOG';
}

function calculateProgress(order: any): number {
  if (order.progress !== undefined) return order.progress;
  if (order.status === 'COMPLETED') return 100;
  if (order.status === 'IN_PROGRESS') {
    // Calculate based on actual vs estimated hours if available
    if (order.estimatedHours && order.actualHours) {
      return Math.min(Math.round((order.actualHours / order.estimatedHours) * 100), 99);
    }
    return 50;
  }
  if (order.status === 'QUALITY_CHECK') return 90;
  if (order.status === 'QUEUED') return 10;
  return 0;
}
