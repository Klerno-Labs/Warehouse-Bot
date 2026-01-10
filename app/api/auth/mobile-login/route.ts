import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/mobile-login
 * Mobile-specific login for operators and floor personnel
 *
 * TODO: Implement badge-based authentication when Badge schema is finalized
 * This endpoint is currently disabled and returns a not-implemented status.
 *
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

    // Find user by badge number - placeholder
    // TODO: Implement badge lookup when Badge schema is finalized
    return NextResponse.json(
      {
        error: 'Badge login not yet implemented',
        message: 'This feature will be available once the Badge schema is finalized.'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
