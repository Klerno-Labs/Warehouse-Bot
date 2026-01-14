import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/serial-numbers/[id]
 * Get detailed serial number information with full history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const serialNumber = await storage.serialNumber.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
      include: {
        item: true,
        lot: {
          include: {
            productionOrder: true,
          },
        },
        location: true,
        customer: true,
        salesOrder: true,
        shipment: {
          include: {
            carrier: true,
          },
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number not found' }, { status: 404 });
    }

    return NextResponse.json({ serialNumber });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quality/serial-numbers/[id]
 * Update serial number status or location
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only certain roles can update serial numbers
    const roleCheck = requireRole(context, ['Admin', 'Supervisor', 'Inventory'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const existingSerial = await storage.serialNumber.findUnique({
      where: {
        id: id,
        tenantId: context.user.tenantId,
      },
    });

    if (!existingSerial) {
      return NextResponse.json({ error: 'Serial number not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      qcStatus,
      currentLocationId,
      customerId,
      salesOrderId,
      shipmentId,
      shippedDate,
      notes,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (qcStatus !== undefined) updateData.qcStatus = qcStatus;
    if (currentLocationId !== undefined) updateData.currentLocationId = currentLocationId;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (salesOrderId !== undefined) updateData.salesOrderId = salesOrderId;
    if (shipmentId !== undefined) updateData.shipmentId = shipmentId;
    if (shippedDate !== undefined) updateData.shippedDate = shippedDate ? new Date(shippedDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    const serialNumber = await storage.serialNumber.update({
      where: {
        id: id,
      },
      data: updateData,
      include: {
        item: true,
        lot: true,
        location: true,
        customer: true,
      },
    });

    // Create history entries for significant changes
    const historyEntries = [];

    if (status !== undefined && status !== existingSerial.status) {
      historyEntries.push({
        serialNumberId: serialNumber.id,
        eventType: 'STATUS_CHANGED',
        statusBefore: existingSerial.status,
        statusAfter: status,
        notes: body.historyNotes || `Status changed from ${existingSerial.status} to ${status}`,
      });
    }

    if (currentLocationId !== undefined && currentLocationId !== existingSerial.currentLocationId) {
      historyEntries.push({
        serialNumberId: serialNumber.id,
        eventType: 'LOCATION_MOVED',
        locationBefore: existingSerial.currentLocationId,
        locationAfter: currentLocationId,
        notes: body.historyNotes || 'Location changed',
      });
    }

    if (status === 'SHIPPED' && status !== existingSerial.status) {
      historyEntries.push({
        serialNumberId: serialNumber.id,
        eventType: 'SHIPPED',
        statusBefore: existingSerial.status,
        statusAfter: 'SHIPPED',
        notes: `Shipped to customer ${customerId}`,
      });
    }

    if (qcStatus !== undefined && qcStatus !== existingSerial.qcStatus) {
      historyEntries.push({
        serialNumberId: serialNumber.id,
        eventType: 'QC_TESTED',
        statusBefore: existingSerial.qcStatus,
        statusAfter: qcStatus,
        notes: `QC status: ${qcStatus}`,
      });
    }

    if (historyEntries.length > 0) {
      await Promise.all(
        historyEntries.map((entry) => storage.serialNumberHistory.create({ data: entry }))
      );
    }

    return NextResponse.json({ serialNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
