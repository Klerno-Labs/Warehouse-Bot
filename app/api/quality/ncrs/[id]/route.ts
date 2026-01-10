import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/quality/ncrs/[id]
 * Get detailed NCR information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ncr = await storage.nonConformanceReport.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
      include: {
        item: true,
        inspection: {
          include: {
            checkpoints: true,
          },
        },
        productionOrder: true,
        capas: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    return NextResponse.json({ ncr });
  } catch (error) {
    console.error('Error fetching NCR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quality/ncrs/[id]
 * Update NCR status and disposition
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QC, Supervisor, and Admin can update NCRs
    if (!['Admin', 'Supervisor', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingNCR = await storage.nonConformanceReport.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
    });

    if (!existingNCR) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      disposition,
      dispositionNotes,
      rootCause,
      reviewedBy,
      approvedBy,
      closedAt,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (disposition !== undefined) {
      updateData.disposition = disposition;
      updateData.dispositionDate = new Date();
    }
    if (dispositionNotes !== undefined) updateData.dispositionNotes = dispositionNotes;
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (reviewedBy !== undefined) {
      updateData.reviewedBy = reviewedBy;
      updateData.reviewedAt = new Date();
    }
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy;
    if (closedAt !== undefined) updateData.closedAt = closedAt ? new Date(closedAt) : null;

    const ncr = await storage.nonConformanceReport.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        item: true,
        inspection: true,
        capas: true,
      },
    });

    return NextResponse.json({ ncr });
  } catch (error) {
    console.error('Error updating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to update NCR' },
      { status: 500 }
    );
  }
}
