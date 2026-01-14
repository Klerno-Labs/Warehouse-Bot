import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * PATCH /api/routings/[id]
 * Update an existing production routing
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ['Admin', 'Supervisor']);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
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

    if (existingRouting.tenantId !== context.user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existingRouting.isDefault) {
      await storage.productionRouting.updateMany({
        where: {
          tenantId: context.user.tenantId,
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
    return handleApiError(error);
  }
}

/**
 * DELETE /api/routings/[id]
 * Delete a production routing
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ['Admin', 'Supervisor']);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;

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

    if (routing.tenantId !== context.user.tenantId) {
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
    return handleApiError(error);
  }
}
