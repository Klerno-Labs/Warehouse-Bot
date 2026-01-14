import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/ncrs/[id]
 * Get detailed NCR information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const ncr = await storage.nonConformanceReport.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quality/ncrs/[id]
 * Update NCR status and disposition
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only QC, Supervisor, and Admin can update NCRs
    const roleCheck = requireRole(context, ['Admin', 'Supervisor'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const existingNCR = await storage.nonConformanceReport.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
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
        id: id,
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
    return handleApiError(error);
  }
}
