import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/serial-numbers
 * Get all serial numbers with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const lotId = searchParams.get('lotId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: context.user.tenantId,
    };

    if (itemId) {
      where.itemId = itemId;
    }

    if (lotId) {
      where.lotId = lotId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.serialNumber = { contains: search, mode: 'insensitive' };
    }

    const serialNumbers = await storage.serialNumber.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        lot: {
          select: {
            id: true,
            lotNumber: true,
          },
        },
        location: {
          select: {
            id: true,
            label: true,
          },
        },
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ serialNumbers });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quality/serial-numbers
 * Create new serial number(s)
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only certain roles can create serial numbers
    const roleCheck = requireRole(context, ['Admin', 'Supervisor', 'Inventory'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      itemId,
      lotId,
      serialNumbers: serialNumberList,
      manufacturedDate,
      currentLocationId,
      notes,
    } = body;

    // Validate required fields
    if (!itemId || !serialNumberList || !Array.isArray(serialNumberList) || serialNumberList.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId and serialNumbers array' },
        { status: 400 }
      );
    }

    // Check for duplicate serial numbers
    const existingSerials = await storage.serialNumber.findMany({
      where: {
        tenantId: context.user.tenantId,
        itemId,
        serialNumber: { in: serialNumberList },
      },
    });

    if (existingSerials.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate serial numbers found',
          duplicates: existingSerials.map((s) => s.serialNumber),
        },
        { status: 400 }
      );
    }

    // Create serial numbers in bulk
    const createdSerials = await Promise.all(
      serialNumberList.map(async (serialNumber: string) => {
        const serial = await storage.serialNumber.create({
          data: {
            tenantId: context.user.tenantId,
            itemId,
            lotId,
            serialNumber,
            manufacturedDate: manufacturedDate ? new Date(manufacturedDate) : null,
            currentLocationId,
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
              },
            },
            lot: {
              select: {
                id: true,
                lotNumber: true,
              },
            },
          },
        });

        // Create history entry
        await storage.serialNumberHistory.create({
          data: {
            serialNumberId: serial.id,
            eventType: 'RECEIVED',
            statusAfter: 'AVAILABLE',
            notes: 'Serial number created',
          },
        });

        return serial;
      })
    );

    return NextResponse.json(
      {
        serialNumbers: createdSerials,
        count: createdSerials.length,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
