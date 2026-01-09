import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * POST /api/mobile/job/[id]/complete
 * Mark a production order as complete
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Find the production order
    const productionOrder = await storage.productionOrder.findFirst({
      where: {
        OR: [
          { id: jobId },
          { orderNumber: jobId },
        ],
        tenantId: user.tenantId,
      },
    });

    if (!productionOrder) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update status to completed
    const updated = await storage.productionOrder.update({
      where: {
        id: productionOrder.id,
      },
      data: {
        status: 'COMPLETED',
        qtyCompleted: productionOrder.qtyOrdered,
        completedAt: new Date(),
        completedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: updated.orderNumber,
      completedAt: updated.completedAt,
    });
  } catch (error) {
    console.error('Error completing job:', error);
    return NextResponse.json(
      { error: 'Failed to complete job' },
      { status: 500 }
    );
  }
}
