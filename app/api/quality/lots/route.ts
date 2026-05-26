import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/lots
 * Get all lots with filtering and search
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const status = searchParams.get('status');
    const qcStatus = searchParams.get('qcStatus');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: context.user.tenantId,
    };

    if (itemId) {
      where.itemId = itemId;
    }

    if (status) {
      where.status = status;
    }

    if (qcStatus) {
      where.qcStatus = qcStatus;
    }

    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { supplierLotNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const lots = await storage.prisma.lot.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            baseUom: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        productionOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        serialNumbers: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            serialNumbers: true,
            inspections: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ lots });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quality/lots
 * Create a new lot
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only certain roles can create lots
    const roleCheck = requireRole(context, ['Admin', 'Supervisor', 'Inventory'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      itemId,
      lotNumber,
      qtyProduced,
      uom,
      productionDate,
      expirationDate,
      supplierId,
      productionOrderId,
      batchNumber,
      supplierLotNumber,
      notes,
    } = body;

    // Validate required fields
    if (!itemId || !lotNumber || !qtyProduced || !uom || !productionDate) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, lotNumber, qtyProduced, uom, productionDate' },
        { status: 400 }
      );
    }

    // Check if lot number already exists for this item
    const existingLot = await storage.prisma.lot.findUnique({
      where: {
        tenantId_itemId_lotNumber: {
          tenantId: context.user.tenantId,
          itemId,
          lotNumber,
        },
      },
    });

    if (existingLot) {
      return NextResponse.json(
        { error: 'Lot number already exists for this item' },
        { status: 400 }
      );
    }

    // Create the lot
    const lot = await storage.prisma.lot.create({
      data: {
        tenantId: context.user.tenantId,
        itemId,
        lotNumber,
        qtyProduced,
        qtyAvailable: qtyProduced,
        uom,
        productionDate: new Date(productionDate),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        supplierId,
        productionOrderId,
        batchNumber,
        supplierLotNumber,
        notes,
        status: 'AVAILABLE',
        qcStatus: 'PENDING',
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            baseUom: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Create lot history entry
    await storage.prisma.lotHistory.create({
      data: {
        lotId: lot.id,
        eventType: 'CREATED',
        qtyBefore: 0,
        qtyAfter: qtyProduced,
        qtyChanged: qtyProduced,
        notes: 'Lot created',
      },
    });

    return NextResponse.json({ lot }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
