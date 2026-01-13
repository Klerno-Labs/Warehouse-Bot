import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * POST /api/mobile/job/[id]/notes
 * Add a note to a production order
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const body = await req.json();
    const { content, type } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

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

    // Create the note
    const note = await storage.productionOrderNote.create({
      data: {
        productionOrderId: productionOrder.id,
        content,
        noteType: type || 'info',
        createdById: context.user.id,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: note.id,
      timestamp: note.createdAt.toISOString(),
      user: `${note.createdBy.firstName} ${note.createdBy.lastName}`,
      content: note.content,
      type: note.noteType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
