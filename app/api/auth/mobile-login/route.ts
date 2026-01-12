import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@server/storage';
import { setSessionCookie } from '@app/api/_utils/session';

/**
 * POST /api/auth/mobile-login
 * Mobile-specific login for operators and floor personnel
 * Uses badge number + PIN instead of email/password
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

    // Find user by badge number
    const users = await storage.getUsers();
    const user = users.find(u =>
      u.badgeNumber === badgeNumber ||
      u.employeeId === badgeNumber
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid badge number' },
        { status: 401 }
      );
    }

    // Verify PIN (in production, this would be hashed)
    // For now, use last 4 digits of badge or default PIN
    const expectedPin = user.pin || badgeNumber.slice(-4) || '1234';
    if (pin !== expectedPin) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Check if user has mobile access role
    const mobileRoles = ['warehouse_operator', 'floor_personnel', 'picker', 'receiver', 'admin'];
    if (user.role && !mobileRoles.includes(user.role.toLowerCase().replace(/\s+/g, '_'))) {
      return NextResponse.json(
        { error: 'User does not have mobile access permissions' },
        { status: 403 }
      );
    }

    // Create session
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        department: department || user.department,
        badgeNumber: badgeNumber,
      },
      message: 'Login successful',
    });

    // Set session cookie
    await setSessionCookie(response, {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return response;
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
