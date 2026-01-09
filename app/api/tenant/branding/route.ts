import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import storage from '@/server/storage';

/**
 * GET /api/tenant/branding
 * Get tenant branding settings
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await storage.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        brandLogo: true,
        brandColor: true,
        brandColorSecondary: true,
        favicon: true,
        customCSS: true
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      branding: {
        logo: tenant.brandLogo || tenant.logoUrl,
        primaryColor: tenant.brandColor || tenant.primaryColor,
        secondaryColor: tenant.brandColorSecondary,
        favicon: tenant.favicon,
        customCSS: tenant.customCSS
      }
    });
  } catch (error) {
    console.error('Error fetching tenant branding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branding' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenant/branding
 * Update tenant branding (Admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { brandLogo, brandColor, brandColorSecondary, favicon, customCSS } = body;

    const updatedTenant = await storage.tenant.update({
      where: { id: user.tenantId },
      data: {
        brandLogo: brandLogo !== undefined ? brandLogo : undefined,
        brandColor: brandColor !== undefined ? brandColor : undefined,
        brandColorSecondary: brandColorSecondary !== undefined ? brandColorSecondary : undefined,
        favicon: favicon !== undefined ? favicon : undefined,
        customCSS: customCSS !== undefined ? customCSS : undefined
      },
      select: {
        id: true,
        name: true,
        brandLogo: true,
        brandColor: true,
        brandColorSecondary: true,
        favicon: true,
        customCSS: true
      }
    });

    return NextResponse.json({
      success: true,
      branding: {
        logo: updatedTenant.brandLogo,
        primaryColor: updatedTenant.brandColor,
        secondaryColor: updatedTenant.brandColorSecondary,
        favicon: updatedTenant.favicon,
        customCSS: updatedTenant.customCSS
      }
    });
  } catch (error) {
    console.error('Error updating tenant branding:', error);
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    );
  }
}
