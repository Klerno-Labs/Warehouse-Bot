import { NextRequest, NextResponse } from 'next/server';
import storage from '@/server/storage';
import { compareSync } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { logger } from '@server/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    const badge = await storage.badge.findFirst({
      where: {
        badgeNumber,
        isActive: true,
      },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!badge || !badge.user || !badge.user.isActive) {
      return NextResponse.json(
        { error: 'Invalid badge number or inactive user' },
        { status: 401 }
      );
    }

    const user = badge.user;

    // Verify PIN (stored as hashed password)
    const isValidPin = compareSync(pin, user.password);
    if (!isValidPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // For operators, verify department assignment
    if (user.role === 'Operator') {
      if (!department) {
        return NextResponse.json(
          { error: 'Department selection is required for operators' },
          { status: 400 }
        );
      }

      // Check if operator is assigned to this department
      if (user.assignedDepartments.length > 0 && !user.assignedDepartments.includes(department)) {
        return NextResponse.json(
          { error: 'You are not assigned to this department' },
          { status: 403 }
        );
      }
    }

    // Generate mobile-specific JWT token
    const token = sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        department: department || null,
        badgeNumber,
      },
      JWT_SECRET,
      { expiresIn: '12h' } // 12-hour shift
    );

    // Return user info and token
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department,
        assignedDepartments: user.assignedDepartments,
        assignedWorkcells: user.assignedWorkcells,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    logger.error('Mobile login error', error as Error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
