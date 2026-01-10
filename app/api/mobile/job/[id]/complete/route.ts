import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * POST /api/mobile/job/[id]/complete
 * Mark a production order as complete
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const jobId = params.id;

    // Find the production order
    const productionOrder = await storage.productionOrder.findFirst({
      where: {
        OR: [
          { id: jobId },
          { orderNumber: jobId },
        ],
        tenantId: context.user.tenantId,
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
        completedById: context.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: updated.orderNumber,
      completedAt: updated.completedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
