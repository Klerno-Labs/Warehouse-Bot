import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/quality/inspections/[id]
 * Get detailed inspection information
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

    const inspection = await storage.qualityInspection.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
      include: {
        item: true,
        lot: true,
        productionOrder: true,
        purchaseOrder: true,
        plan: {
          include: {
            checkpointTemplates: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        checkpoints: {
          orderBy: { sequence: 'asc' },
        },
        ncrs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quality/inspections/[id]
 * Update inspection status and results
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

    // Only QC, Supervisor, and Admin can update inspections
    if (!['Admin', 'Supervisor', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingInspection = await storage.qualityInspection.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
    });

    if (!existingInspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      overallResult,
      qtyPassed,
      qtyFailed,
      startedAt,
      completedAt,
      notes,
      internalNotes,
      checkpoints,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (overallResult !== undefined) updateData.overallResult = overallResult;
    if (qtyPassed !== undefined) updateData.qtyPassed = qtyPassed;
    if (qtyFailed !== undefined) updateData.qtyFailed = qtyFailed;
    if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    // Update checkpoints if provided
    if (checkpoints && Array.isArray(checkpoints)) {
      await Promise.all(
        checkpoints.map(async (checkpoint: any) => {
          if (checkpoint.id) {
            await storage.qualityCheckpoint.update({
              where: { id: checkpoint.id },
              data: {
                result: checkpoint.result,
                measuredValue: checkpoint.measuredValue,
                notes: checkpoint.notes,
                checkedAt: checkpoint.checkedAt ? new Date(checkpoint.checkedAt) : new Date(),
                checkedBy: checkpoint.checkedBy || user.email,
              },
            });
          }
        })
      );
    }

    const inspection = await storage.qualityInspection.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        item: true,
        lot: true,
        checkpoints: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    // Auto-update lot QC status if this is a lot inspection
    if (inspection.lotId && overallResult) {
      await storage.lot.update({
        where: { id: inspection.lotId },
        data: {
          qcStatus: overallResult === 'ACCEPT' ? 'PASSED' : overallResult === 'REJECT' ? 'FAILED' : 'CONDITIONAL',
          qcDate: new Date(),
          qcNotes: notes || internalNotes,
        },
      });
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Error updating inspection:', error);
    return NextResponse.json(
      { error: 'Failed to update inspection' },
      { status: 500 }
    );
  }
}
