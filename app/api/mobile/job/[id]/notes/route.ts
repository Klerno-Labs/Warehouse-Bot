import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * POST /api/mobile/job/[id]/notes
 * Add a note to a production order
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, type } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const jobId = params.id;

    // Find the production order
    const productionOrder = await storage.prisma.productionOrder.findFirst({
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

    // Create the note
    const note = await storage.prisma.productionOrderNote.create({
      data: {
        productionOrderId: productionOrder.id,
        content,
        noteType: type || 'info',
        createdById: user.id,
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
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}
