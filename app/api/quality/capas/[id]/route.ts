import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/capas/[id]
 * Get detailed CAPA information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const capa = await storage.cAPA.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
      include: {
        ncr: {
          include: {
            item: true,
            inspection: true,
          },
        },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
    }

    return NextResponse.json({ capa });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quality/capas/[id]
 * Update CAPA progress and status
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only QC, Supervisor, and Admin can update CAPAs
    const roleCheck = requireRole(context, ['Admin', 'Supervisor'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const existingCAPA = await storage.cAPA.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
    });

    if (!existingCAPA) {
      return NextResponse.json({ error: 'CAPA not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      rootCauseAnalysis,
      proposedActions,
      responsiblePerson,
      targetDate,
      implementationPlan,
      implementedAt,
      verificationMethod,
      verifiedAt,
      verifiedBy,
      verificationNotes,
      effectivenessCheck,
      effectivenessDate,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (rootCauseAnalysis !== undefined) updateData.rootCauseAnalysis = rootCauseAnalysis;
    if (proposedActions !== undefined) updateData.proposedActions = proposedActions;
    if (responsiblePerson !== undefined) updateData.responsiblePerson = responsiblePerson;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (implementationPlan !== undefined) updateData.implementationPlan = implementationPlan;
    if (implementedAt !== undefined) updateData.implementedAt = implementedAt ? new Date(implementedAt) : null;
    if (verificationMethod !== undefined) updateData.verificationMethod = verificationMethod;
    if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : null;
    if (verifiedBy !== undefined) updateData.verifiedBy = verifiedBy;
    if (verificationNotes !== undefined) updateData.verificationNotes = verificationNotes;
    if (effectivenessCheck !== undefined) updateData.effectivenessCheck = effectivenessCheck;
    if (effectivenessDate !== undefined) updateData.effectivenessDate = effectivenessDate ? new Date(effectivenessDate) : null;

    const capa = await storage.cAPA.update({
      where: {
        id: id,
      },
      data: updateData,
      include: {
        ncr: true,
      },
    });

    return NextResponse.json({ capa });
  } catch (error) {
    return handleApiError(error);
  }
}
