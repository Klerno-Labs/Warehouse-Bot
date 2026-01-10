import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * DELETE /api/admin/badges/[id]
 * Deactivate a badge (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can deactivate badges' },
        { status: 403 }
      );
    }

    const badgeId = params.id;

    // Get the badge
    const badge = await storage.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Verify badge belongs to same tenant
    if (badge.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot deactivate badge from another tenant' },
        { status: 403 }
      );
    }

    // Deactivate the badge
    await storage.prisma.badge.update({
      where: { id: badgeId },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Badge deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating badge:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate badge' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/badges/[id]
 * Reactivate or update a badge
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can update badges' },
        { status: 403 }
      );
    }

    const badgeId = params.id;
    const { isActive, badgeNumber } = await req.json();

    const badge = await storage.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    if (badge.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Cannot update badge from another tenant' },
        { status: 403 }
      );
    }

    // If changing badge number, check uniqueness
    if (badgeNumber && badgeNumber !== badge.badgeNumber) {
      const existing = await storage.prisma.badge.findFirst({
        where: {
          badgeNumber,
          tenantId: user.tenantId,
          id: { not: badgeId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'This badge number is already in use' },
          { status: 400 }
        );
      }
    }

    // Update the badge
    const updatedBadge = await storage.prisma.badge.update({
      where: { id: badgeId },
      data: {
        ...(badgeNumber !== undefined && { badgeNumber }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      badge: {
        id: updatedBadge.id,
        badgeNumber: updatedBadge.badgeNumber,
        isActive: updatedBadge.isActive,
        user: updatedBadge.user,
      },
    });
  } catch (error) {
    console.error('Error updating badge:', error);
    return NextResponse.json(
      { error: 'Failed to update badge' },
      { status: 500 }
    );
  }
}
