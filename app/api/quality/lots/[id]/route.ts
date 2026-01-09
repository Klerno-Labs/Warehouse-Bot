import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/quality/lots/[id]
 * Get detailed lot information
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

    const lot = await storage.lot.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
      include: {
        item: true,
        supplier: true,
        productionOrder: {
          include: {
            bom: true,
          },
        },
        holdReason: true,
        serialNumbers: {
          include: {
            location: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        inspections: {
          include: {
            plan: true,
            checkpoints: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        lotHistory: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    return NextResponse.json({ lot });
  } catch (error) {
    console.error('Error fetching lot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lot' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quality/lots/[id]
 * Update lot information or status
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

    // Only certain roles can update lots
    if (!['Admin', 'Supervisor', 'Inventory', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingLot = await storage.lot.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
    });

    if (!existingLot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      qcStatus,
      qcDate,
      qcNotes,
      holdReasonId,
      expirationDate,
      notes,
      qtyAvailable,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (qcStatus !== undefined) updateData.qcStatus = qcStatus;
    if (qcDate !== undefined) updateData.qcDate = qcDate ? new Date(qcDate) : null;
    if (qcNotes !== undefined) updateData.qcNotes = qcNotes;
    if (holdReasonId !== undefined) updateData.holdReasonId = holdReasonId;
    if (expirationDate !== undefined) updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (qtyAvailable !== undefined) updateData.qtyAvailable = qtyAvailable;

    const lot = await storage.lot.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        item: true,
        supplier: true,
        holdReason: true,
      },
    });

    // Create history entry for significant changes
    if (status !== undefined && status !== existingLot.status) {
      await storage.lotHistory.create({
        data: {
          lotId: lot.id,
          eventType: status === 'HOLD' ? 'HOLD' : status === 'AVAILABLE' ? 'RELEASE' : 'STATUS_CHANGED',
          qtyBefore: existingLot.qtyAvailable,
          qtyAfter: lot.qtyAvailable,
          qtyChanged: 0,
          notes: `Status changed from ${existingLot.status} to ${status}`,
        },
      });
    }

    if (qcStatus !== undefined && qcStatus !== existingLot.qcStatus) {
      await storage.lotHistory.create({
        data: {
          lotId: lot.id,
          eventType: qcStatus === 'PASSED' ? 'QC_PASSED' : qcStatus === 'FAILED' ? 'QC_FAILED' : 'QC_UPDATED',
          qtyBefore: existingLot.qtyAvailable,
          qtyAfter: lot.qtyAvailable,
          qtyChanged: 0,
          notes: `QC status changed to ${qcStatus}`,
        },
      });
    }

    if (qtyAvailable !== undefined && qtyAvailable !== existingLot.qtyAvailable) {
      await storage.lotHistory.create({
        data: {
          lotId: lot.id,
          eventType: 'CONSUMED',
          qtyBefore: existingLot.qtyAvailable,
          qtyAfter: qtyAvailable,
          qtyChanged: qtyAvailable - existingLot.qtyAvailable,
          notes: body.historyNotes || 'Quantity adjusted',
        },
      });
    }

    return NextResponse.json({ lot });
  } catch (error) {
    console.error('Error updating lot:', error);
    return NextResponse.json(
      { error: 'Failed to update lot' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quality/lots/[id]
 * Delete a lot (only if no serial numbers or transactions)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can delete lots
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const lot = await storage.lot.findUnique({
      where: {
        id: params.id,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: {
            serialNumbers: true,
            inspections: true,
          },
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Check if lot has any serial numbers or inspections
    if (lot._count.serialNumbers > 0) {
      return NextResponse.json(
        { error: `Cannot delete lot. It has ${lot._count.serialNumbers} serial numbers.` },
        { status: 400 }
      );
    }

    if (lot._count.inspections > 0) {
      return NextResponse.json(
        { error: `Cannot delete lot. It has ${lot._count.inspections} quality inspections.` },
        { status: 400 }
      );
    }

    // Delete lot history first
    await storage.lotHistory.deleteMany({
      where: { lotId: params.id },
    });

    // Delete the lot
    await storage.lot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lot:', error);
    return NextResponse.json(
      { error: 'Failed to delete lot' },
      { status: 500 }
    );
  }
}
