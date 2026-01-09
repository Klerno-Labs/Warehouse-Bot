import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, setSessionCookie } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';

/**
 * POST /api/auth/switch-tenant
 * Switch user's active tenant
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
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
          userId: user.id,
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

    // Update session with new tenant
    const updatedUser = {
      ...user,
      tenantId: access.tenantId,
      tenantName: access.tenant.name,
      role: access.role
    };

    // Set new session cookie
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: access.tenant.id,
        name: access.tenant.name,
        slug: access.tenant.slug
      },
      role: access.role
    });

    await setSessionCookie(response, updatedUser);

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
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tenants user has access to
    const accessList = await storage.userTenantAccess.findMany({
      where: {
        userId: user.id
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
        isActive: user.tenantId === access.tenant.id,
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
