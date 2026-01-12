import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * POST /api/auth/switch-tenant
 * Switch user's active tenant
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Get user to check tenant access
    const user = await storage.getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has access to this tenant
    const userTenants = user.tenantAccess || [user.tenantId];
    if (!userTenants.includes(tenantId)) {
      return NextResponse.json(
        { error: 'User does not have access to this tenant' },
        { status: 403 }
      );
    }

    // Verify tenant exists
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Create new session with updated tenant
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      message: 'Tenant switched successfully',
    });

    // Update session cookie with new tenant
    await setSessionCookie(response, {
      userId: session.userId,
      tenantId: tenantId,
      email: session.email,
      role: session.role,
    });

    return response;
  } catch (error) {
    console.error('Error switching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to switch tenant' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/switch-tenant
 * Get list of tenants user has access to
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await storage.getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all tenants user has access to
    const userTenants = user.tenantAccess || [user.tenantId];
    const tenants = await Promise.all(
      userTenants.map(async (tenantId: string) => {
        const tenant = await storage.getTenant(tenantId);
        if (tenant) {
          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            isActive: tenantId === session.tenantId,
          };
        }
        return null;
      })
    );

    return NextResponse.json({
      tenants: tenants.filter(Boolean),
      currentTenantId: session.tenantId,
    });
  } catch (error) {
    console.error('Error fetching tenant access:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
