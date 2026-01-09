import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * PATCH /api/routings/[id]
 * Update an existing production routing
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

    if (user.role !== 'Admin' && user.role !== 'Supervisor') {
      return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, itemId, isDefault, steps } = body;

    // Verify routing belongs to tenant
    const existingRouting = await storage.productionRouting.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!existingRouting) {
      return NextResponse.json({ error: 'Routing not found' }, { status: 404 });
    }

    if (existingRouting.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existingRouting.isDefault) {
      await storage.productionRouting.updateMany({
        where: {
          tenantId: user.tenantId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update routing with steps
    const routing = await storage.productionRouting.update({
      where: { id },
      data: {
        name: name || existingRouting.name,
        description: description !== undefined ? description : existingRouting.description,
        itemId: itemId !== undefined ? (itemId || null) : existingRouting.itemId,
        isDefault: isDefault !== undefined ? isDefault : existingRouting.isDefault,
        ...(steps && {
          steps: {
            deleteMany: {}, // Delete all existing steps
            create: steps.map((step: any, index: number) => ({
              departmentId: step.departmentId,
              sequence: step.sequence !== undefined ? step.sequence : index + 1,
              required: step.required ?? true,
              canSkip: step.canSkip ?? false,
              estimatedMinutes: step.estimatedMinutes,
            })),
          },
        }),
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

    return NextResponse.json({ routing });
  } catch (error) {
    console.error('Error updating routing:', error);
    return NextResponse.json(
      { error: 'Failed to update routing' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/routings/[id]
 * Delete a production routing
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

    if (user.role !== 'Admin' && user.role !== 'Supervisor') {
      return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    const { id } = params;

    // Verify routing belongs to tenant
    const routing = await storage.productionRouting.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true, // Check if routing is used by any production orders
          },
        },
      },
    });

    if (!routing) {
      return NextResponse.json({ error: 'Routing not found' }, { status: 404 });
    }

    if (routing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if routing is in use
    if (routing._count && routing._count.jobs > 0) {
      return NextResponse.json(
        { error: `Cannot delete routing. It is currently used by ${routing._count.jobs} production order(s).` },
        { status: 400 }
      );
    }

    // Delete routing (steps will cascade delete due to schema)
    await storage.productionRouting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting routing:', error);
    return NextResponse.json(
      { error: 'Failed to delete routing' },
      { status: 500 }
    );
  }
}
