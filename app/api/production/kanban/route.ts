import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { prisma } from '@server/prisma';

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

    const tenantId = user.tenantId;

    // Fetch departments to use as kanban columns
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    // Fetch active production orders
    const productionOrders = await prisma.productionOrder.findMany({
      where: {
        tenantId,
        status: { in: ['PLANNED', 'RELEASED', 'PENDING', 'IN_PROGRESS', 'PAUSED'] },
      },
      include: {
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
        site: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Get job operations for routing info
    const jobOperations = await prisma.jobOperation.findMany({
      where: {
        productionOrderId: {
          in: productionOrders.map(po => po.id),
        },
      },
      orderBy: { sequence: 'asc' },
    });

    // Group operations by production order
    const operationsByOrder = new Map<string, typeof jobOperations>();
    jobOperations.forEach(op => {
      const existing = operationsByOrder.get(op.productionOrderId) || [];
      existing.push(op);
      operationsByOrder.set(op.productionOrderId, existing);
    });

    // Build kanban columns based on status
    const columns = [
      { id: 'planned', name: 'Planned', status: 'PLANNED', color: '#94a3b8' },
      { id: 'released', name: 'Released', status: 'RELEASED', color: '#60a5fa' },
      { id: 'pending', name: 'Pending', status: 'PENDING', color: '#fbbf24' },
      { id: 'in-progress', name: 'In Progress', status: 'IN_PROGRESS', color: '#34d399' },
      { id: 'paused', name: 'Paused', status: 'PAUSED', color: '#f87171' },
    ];

    // Map production orders to cards
    const cards = productionOrders.map(order => {
      const operations = operationsByOrder.get(order.id) || [];
      const currentOperation = operations.find(op => op.status === 'IN_PROGRESS') ||
                               operations.find(op => op.status === 'PENDING') ||
                               operations[0];

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        priority: order.priority,
        item: order.bom?.item ? {
          id: order.bom.item.id,
          name: order.bom.item.name,
          sku: order.bom.item.sku,
        } : null,
        quantity: {
          ordered: order.qtyOrdered,
          completed: order.qtyCompleted,
          remaining: order.qtyOrdered - order.qtyCompleted,
        },
        progress: order.qtyOrdered > 0
          ? Math.round((order.qtyCompleted / order.qtyOrdered) * 100)
          : 0,
        site: order.site?.name,
        dueDate: order.dueDate,
        scheduledStart: order.scheduledStart,
        scheduledEnd: order.scheduledEnd,
        createdBy: order.createdBy
          ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
          : null,
        currentDepartment: currentOperation?.department || null,
        currentOperation: currentOperation ? {
          id: currentOperation.id,
          sequence: currentOperation.sequence,
          department: currentOperation.department,
          status: currentOperation.status,
        } : null,
        operationsCount: operations.length,
        completedOperations: operations.filter(op => op.status === 'COMPLETE').length,
        notes: order.notes,
      };
    });

    // Group cards by column
    const columnData = columns.map(col => ({
      ...col,
      cards: cards.filter(card => card.status === col.status),
      count: cards.filter(card => card.status === col.status).length,
    }));

    // Also provide department-based view
    const departmentView = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      cards: cards.filter(card => card.currentDepartment === dept.id),
      count: cards.filter(card => card.currentDepartment === dept.id).length,
    }));

    // Add "Unassigned" column for orders without current department
    const unassignedCards = cards.filter(card => !card.currentDepartment);
    if (unassignedCards.length > 0) {
      departmentView.unshift({
        id: 'unassigned',
        name: 'Unassigned',
        cards: unassignedCards,
        count: unassignedCards.length,
      });
    }

    return NextResponse.json({
      columns: columnData,
      departmentView,
      summary: {
        total: cards.length,
        byStatus: columns.reduce((acc, col) => {
          acc[col.id] = cards.filter(c => c.status === col.status).length;
          return acc;
        }, {} as Record<string, number>),
        overdue: cards.filter(c => c.dueDate && new Date(c.dueDate) < new Date()).length,
        highPriority: cards.filter(c => c.priority === 'HIGH' || c.priority === 'URGENT').length,
      },
    });
  } catch (error) {
    console.error('Kanban board error:', error);
    return NextResponse.json({ error: 'Failed to fetch kanban data' }, { status: 500 });
  }
}

/**
 * PATCH /api/production/kanban
 * Update production order status (for drag-and-drop)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, newStatus, newDepartment } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const tenantId = user.tenantId;

    // Verify order belongs to tenant
    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    // Update status if provided
    if (newStatus) {
      const validStatuses = ['PLANNED', 'RELEASED', 'PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = newStatus;

      // Set timestamps based on status change
      if (newStatus === 'IN_PROGRESS' && !order.actualStart) {
        updateData.actualStart = new Date();
      }
      if (newStatus === 'COMPLETED') {
        updateData.actualEnd = new Date();
      }
    }

    // Update department assignment if moving between departments
    if (newDepartment) {
      // Find or create job operation for this department
      const existingOp = await prisma.jobOperation.findFirst({
        where: {
          productionOrderId: orderId,
          department: newDepartment,
        },
      });

      if (!existingOp) {
        // Get max sequence
        const maxSeq = await prisma.jobOperation.aggregate({
          where: { productionOrderId: orderId },
          _max: { sequence: true },
        });

        await prisma.jobOperation.create({
          data: {
            productionOrderId: orderId,
            department: newDepartment,
            sequence: (maxSeq._max.sequence || 0) + 1,
            status: 'PENDING',
          },
        });
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.productionOrder.update({
        where: { id: orderId },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Production order updated',
    });
  } catch (error) {
    console.error('Kanban update error:', error);
    return NextResponse.json({ error: 'Failed to update kanban card' }, { status: 500 });
  }
}
