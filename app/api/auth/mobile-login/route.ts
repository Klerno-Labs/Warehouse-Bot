import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@app/api/_utils/session';

/**
 * POST /api/auth/mobile-login
 * Mobile-specific login for operators and floor personnel
 *
 * Uses badge number + PIN (user password) for authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { badgeNumber, pin, department } = await req.json();

    if (!badgeNumber || !pin) {
      return NextResponse.json(
        { error: 'Badge number and PIN are required' },
        { status: 400 }
      );
    }

    // Find badge by badge number
    const badge = await prisma.badge.findFirst({
      where: {
        badgeNumber,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            password: true,
            firstName: true,
            lastName: true,
            role: true,
            siteIds: true,
            isActive: true,
            assignedDepartments: true,
            assignedWorkcells: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!badge) {
      return NextResponse.json(
        { error: 'Invalid badge number' },
        { status: 401 }
      );
    }

    const user = badge.user;

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 401 }
      );
    }

    // Verify PIN (using user's password)
    const isValidPin = await bcrypt.compare(pin, user.password);
    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Verify department access if specified
    if (department && user.assignedDepartments.length > 0) {
      if (!user.assignedDepartments.includes(department)) {
        return NextResponse.json(
          { error: 'You do not have access to this department' },
          { status: 403 }
        );
      }
    }

    // Create session
    const sessionUser = {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      siteIds: user.siteIds,
      isActive: user.isActive,
    };

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        assignedDepartments: user.assignedDepartments,
        assignedWorkcells: user.assignedWorkcells,
      },
      message: 'Login successful',
    });

    // Set session cookie
    await createSession(sessionUser, response);

    return response;
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
