import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';

/**
 * GET /api/quality/capas/[id]
 * Get detailed CAPA information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capa = await storage.cAPA.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
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
    console.error('Error fetching CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPA' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quality/capas/[id]
 * Update CAPA progress and status
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QC, Supervisor, and Admin can update CAPAs
    if (!['Admin', 'Supervisor', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingCAPA = await storage.cAPA.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
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
        id: params.id,
      },
      data: updateData,
      include: {
        ncr: true,
      },
    });

    return NextResponse.json({ capa });
  } catch (error) {
    console.error('Error updating CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to update CAPA' },
      { status: 500 }
    );
  }
}
