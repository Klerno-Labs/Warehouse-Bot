import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/admin/badges
 * Get all badges for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const badges = await storage.prisma.badge.findMany({
      where: {
        tenantId: user.tenantId,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      badges: badges.map((badge) => ({
        id: badge.id,
        badgeNumber: badge.badgeNumber,
        isActive: badge.isActive,
        user: badge.user,
        createdAt: badge.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/badges
 * Create a new badge for a user
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Executive and above can create badges
    const allowedRoles = ['Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only executives can create badges' },
        { status: 403 }
      );
    }

    const { badgeNumber, userId } = await req.json();

    if (!badgeNumber || !userId) {
      return NextResponse.json(
        { error: 'Badge number and user ID are required' },
        { status: 400 }
      );
    }

    // Check if badge number already exists
    const existingBadge = await storage.prisma.badge.findFirst({
      where: {
        badgeNumber,
        tenantId: user.tenantId,
      },
    });

    if (existingBadge) {
      return NextResponse.json(
        { error: 'This badge number is already in use' },
        { status: 400 }
      );
    }

    // Check if user already has an active badge
    const userBadge = await storage.prisma.badge.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (userBadge) {
      return NextResponse.json(
        { error: 'User already has an active badge' },
        { status: 400 }
      );
    }

    // Verify user belongs to same tenant
    const targetUser = await storage.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'User not found or belongs to another tenant' },
        { status: 404 }
      );
    }

    // Create the badge
    const badge = await storage.prisma.badge.create({
      data: {
        badgeNumber,
        userId,
        tenantId: user.tenantId,
        isActive: true,
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
        id: badge.id,
        badgeNumber: badge.badgeNumber,
        isActive: badge.isActive,
        user: badge.user,
      },
    });
  } catch (error) {
    console.error('Error creating badge:', error);
    return NextResponse.json(
      { error: 'Failed to create badge' },
      { status: 500 }
    );
  }
}
