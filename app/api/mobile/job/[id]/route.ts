import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/mobile/job/[id]
 * Get job details for mobile operator view
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const { id } = await params;
    const jobId = id;

    // Fetch production order with all related data
    const productionOrder = await storage.productionOrder.findFirst({
      where: {
        OR: [
          { id: jobId },
          { orderNumber: jobId },
        ],
        tenantId: context.user.tenantId,
      },
      include: {
        item: {
          select: {
            sku: true,
            name: true,
            baseUom: true,
          },
        },
        bom: {
          include: {
            components: {
              include: {
                componentItem: {
                  select: {
                    sku: true,
                    name: true,
                    balances: {
                      select: {
                        qtyBase: true,
                        location: {
                          select: {
                            label: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        consumptions: {
          select: {
            qtyBase: true,
            itemId: true,
          },
        },
      },
    });

    if (!productionOrder) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get job notes
    const notes = await storage.productionOrderNote.findMany({
      where: {
        productionOrderId: productionOrder.id,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate quantities consumed per component
    const consumptionsByItem = productionOrder.consumptions.reduce((acc: Record<string, number>, consumption) => {
      if (!acc[consumption.itemId]) {
        acc[consumption.itemId] = 0;
      }
      acc[consumption.itemId] += consumption.qtyBase;
      return acc;
    }, {});

    // Format components with availability
    const components = productionOrder.bom?.components.map((bomComponent) => {
      const totalAvailable = bomComponent.componentItem.balances.reduce(
        (sum, balance) => sum + balance.qtyBase,
        0
      );
      const primaryLocation = bomComponent.componentItem.balances[0]?.location?.label || 'Unknown';
      const qtyNeeded = bomComponent.qtyBase * productionOrder.qtyOrdered;
      const qtyConsumed = consumptionsByItem[bomComponent.componentItemId] || 0;
      const qtyRemaining = qtyNeeded - qtyConsumed;

      return {
        id: bomComponent.id,
        sku: bomComponent.componentItem.sku,
        name: bomComponent.componentItem.name,
        qtyNeeded: qtyRemaining > 0 ? qtyRemaining : qtyNeeded,
        qtyAvailable: totalAvailable,
        uom: bomComponent.uom,
        location: primaryLocation,
      };
    }) || [];

    // Calculate completed quantity
    const qtyCompleted = productionOrder.qtyCompleted || 0;

    // Determine priority based on due date
    const dueDate = productionOrder.dueDate ? new Date(productionOrder.dueDate) : null;
    const now = new Date();
    let priority = 'low';
    if (dueDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) priority = 'overdue';
      else if (daysUntilDue <= 1) priority = 'high';
      else if (daysUntilDue <= 3) priority = 'medium';
    }

    // Format response
    const jobData = {
      id: productionOrder.id,
      orderNumber: productionOrder.orderNumber,
      itemSku: productionOrder.item.sku,
      itemName: productionOrder.item.name,
      qtyOrdered: productionOrder.qtyOrdered,
      qtyCompleted,
      status: productionOrder.status,
      dueDate: productionOrder.dueDate?.toISOString() || null,
      priority,
      components,
      instructions: productionOrder.notes || 'Follow standard operating procedures for this item.',
      workstation: productionOrder.workstation || 'General Production',
      estimatedTime: productionOrder.estimatedHours || 0,
      notes: notes.map((note) => ({
        id: note.id,
        timestamp: note.createdAt.toISOString(),
        user: `${note.createdBy.firstName} ${note.createdBy.lastName}`,
        content: note.content,
        type: note.noteType || 'info',
      })),
    };

    return NextResponse.json(jobData);
  } catch (error) {
    return handleApiError(error);
  }
}
