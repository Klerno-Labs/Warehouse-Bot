import { NextResponse } from "next/server";
import storage from "@/server/storage";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

/**
 * GET /api/tenant/branding
 * Get tenant branding settings
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const tenant = await storage.prisma.tenant.findUnique({
      where: { id: context.user.tenantId },
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
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
    return handleApiError(error);
  }
}

/**
 * PATCH /api/tenant/branding
 * Update tenant branding (Admin only)
 */
export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const { brandLogo, brandColor, brandColorSecondary, favicon, customCSS } = body;

    const updatedTenant = await storage.prisma.tenant.update({
      where: { id: context.user.tenantId },
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
    return handleApiError(error);
  }
}
