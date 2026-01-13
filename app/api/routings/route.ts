import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/routings
 * List all production routings for tenant
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    const routings = await storage.productionRouting.findMany({
      where: {
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}

/**
 * POST /api/routings
 * Create a new production routing with steps
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ['Admin', 'Supervisor']);
    if (roleCheck instanceof NextResponse) return roleCheck;

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
          tenantId: context.user.tenantId,
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
        tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}
