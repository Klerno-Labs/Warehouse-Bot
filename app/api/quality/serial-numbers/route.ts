import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/quality/serial-numbers
 * Get all serial numbers with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const lotId = searchParams.get('lotId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: user.tenantId,
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
    console.error('Error fetching serial numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch serial numbers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quality/serial-numbers
 * Create new serial number(s)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only certain roles can create serial numbers
    if (!['Admin', 'Supervisor', 'Inventory', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

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
        tenantId: user.tenantId,
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
            tenantId: user.tenantId,
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
    console.error('Error creating serial numbers:', error);
    return NextResponse.json(
      { error: 'Failed to create serial numbers' },
      { status: 500 }
    );
  }
}
