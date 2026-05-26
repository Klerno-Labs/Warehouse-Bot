import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/inspections/[id]
 * Get detailed inspection information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const inspection = await storage.prisma.qualityInspection.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quality/inspections/[id]
 * Update inspection status and results
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only QC, Supervisor, and Admin can update inspections
    const roleCheck = requireRole(context, ['Admin', 'Supervisor'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const existingInspection = await storage.prisma.qualityInspection.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
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
                checkedBy: checkpoint.checkedBy || context.user.email,
              },
            });
          }
        })
      );
    }

    const inspection = await storage.prisma.qualityInspection.update({
      where: {
        id: id,
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
      await storage.prisma.lot.update({
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
    return handleApiError(error);
  }
}
