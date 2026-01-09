import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/routings
 * List all production routings for tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    const routings = await storage.productionRouting.findMany({
      where: {
        tenantId: user.tenantId,
        ...(itemId && { itemId }),
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        steps: {
          include: {
            department: true,
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ routings });
  } catch (error) {
    console.error('Error fetching routings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/routings
 * Create a new production routing with steps
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin' && user.role !== 'Supervisor') {
      return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, itemId, isDefault, steps } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'At least one routing step is required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await storage.productionRouting.updateMany({
        where: {
          tenantId: user.tenantId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create routing with steps
    const routing = await storage.productionRouting.create({
      data: {
        tenantId: user.tenantId,
        name,
        description,
        itemId: itemId || null,
        isDefault: isDefault || false,
        steps: {
          create: steps.map((step: any, index: number) => ({
            departmentId: step.departmentId,
            sequence: step.sequence !== undefined ? step.sequence : index + 1,
            required: step.required ?? true,
            canSkip: step.canSkip ?? false,
            estimatedMinutes: step.estimatedMinutes,
          })),
        },
      },
      include: {
        steps: {
          include: {
            department: true,
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
    });

    return NextResponse.json({ routing }, { status: 201 });
  } catch (error) {
    console.error('Error creating routing:', error);
    return NextResponse.json(
      { error: 'Failed to create routing' },
      { status: 500 }
    );
  }
}
