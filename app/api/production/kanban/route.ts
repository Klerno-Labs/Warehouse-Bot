import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';

/**
 * GET /api/production/kanban
 * Fetch all production jobs with routing information for Kanban board
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all production orders with their current step information
    const productionOrders = await storage.productionOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'ACTIVE', 'PAUSED'],
        },
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        routing: {
          include: {
            steps: {
              include: {
                department: true,
              },
              orderBy: {
                sequence: 'asc',
              },
            },
          },
        },
        operations: {
          include: {
            productionOrder: {
              select: {
                orderNumber: true,
              },
            },
          },
          orderBy: {
            sequence: 'asc',
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform production orders into Kanban jobs
    const jobs = productionOrders.map((po) => {
      // Calculate current step based on operations
      const totalSteps = po.operations.length;
      const completedSteps = po.operations.filter(
        (op) => op.status === 'COMPLETED'
      ).length;

      // Find current operation (first non-completed)
      const currentOperation = po.operations.find(
        (op) => op.status !== 'COMPLETED' && op.status !== 'SKIPPED'
      );

      // Calculate current step sequence based on routing
      let currentStepSequence: number | undefined;
      if (currentOperation && po.routing) {
        // Match operation department to routing step
        const matchingStep = po.routing.steps.find(
          (step) => step.department.code === currentOperation.department
        );
        currentStepSequence = matchingStep?.sequence;
      }

      return {
        id: po.id,
        orderNumber: po.orderNumber,
        itemName: po.item?.name || 'Unknown Item',
        itemSku: po.item?.sku || '',
        quantity: po.qtyOrdered,
        status: po.status,
        currentStepSequence,
        completedSteps,
        totalSteps,
        assignedTo: po.assignedTo?.name,
        startedAt: po.startedAt?.toISOString(),
        dueDate: po.dueDate?.toISOString(),
        routing: po.routing
          ? {
              id: po.routing.id,
              name: po.routing.name,
              steps: po.routing.steps.map((step) => ({
                sequence: step.sequence,
                required: step.required,
                canSkip: step.canSkip,
                estimatedMinutes: step.estimatedMinutes,
                department: {
                  id: step.department.id,
                  name: step.department.name,
                  code: step.department.code,
                  color: step.department.color,
                  icon: step.department.icon,
                  allowConcurrent: step.department.allowConcurrent,
                  requireQC: step.department.requireQC,
                  defaultDuration: step.department.defaultDuration,
                  order: step.department.order,
                  isActive: step.department.isActive,
                },
              })),
            }
          : undefined,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching Kanban data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Kanban data' },
      { status: 500 }
    );
  }
}
