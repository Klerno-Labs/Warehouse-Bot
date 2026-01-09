import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@/app/api/_utils/session';
import storage from '@/server/storage';

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

    // Check if user has access to this tenant
    const access = await storage.userTenantAccess.findUnique({
      where: {
        userId_tenantId: {
          userId: session.userId,
          tenantId: tenantId
        }
      },
      include: {
        tenant: true
      }
    });

    if (!access) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Set new session cookie for the new tenant
    setSessionCookie(session.userId);

    return NextResponse.json({
      success: true,
      tenant: {
        id: access.tenant.id,
        name: access.tenant.name,
        slug: access.tenant.slug
      },
      role: access.role
    });
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

    // Get all tenants user has access to
    const accessList = await storage.userTenantAccess.findMany({
      where: {
        userId: session.userId
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandLogo: true,
            brandColor: true,
            primaryColor: true,
            logoUrl: true
          }
        }
      },
      orderBy: {
        isDefault: 'desc'
      }
    });

    return NextResponse.json({
      tenants: accessList.map(access => ({
        id: access.tenant.id,
        name: access.tenant.name,
        slug: access.tenant.slug,
        role: access.role,
        isDefault: access.isDefault,
        isActive: session.tenantId === access.tenant.id,
        branding: {
          logo: access.tenant.brandLogo || access.tenant.logoUrl,
          color: access.tenant.brandColor || access.tenant.primaryColor
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching tenant access:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
