import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";

const UpdateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().nullable(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().optional(),
  onboardingStep: z.number().int().min(0).max(4).optional(),
  onboardingCompleted: z.boolean().optional(),
});

// GET current tenant profile
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const tenant = await prisma.tenant.findUnique({
      where: { id: context.user.tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            users: true,
            sites: true,
            items: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      website: tenant.website,
      address1: tenant.address1,
      address2: tenant.address2,
      city: tenant.city,
      state: tenant.state,
      postalCode: tenant.postalCode,
      country: tenant.country,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      onboardingCompleted: tenant.onboardingCompleted,
      onboardingStep: tenant.onboardingStep,
      enabledModules: tenant.enabledModules,
      subscription: tenant.subscription ? {
        plan: tenant.subscription.plan.name,
        tier: tenant.subscription.plan.tier,
        status: tenant.subscription.status,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd,
        trialEnd: tenant.subscription.trialEnd,
        limits: {
          maxUsers: tenant.subscription.plan.maxUsers,
          maxSites: tenant.subscription.plan.maxSites,
          maxItems: tenant.subscription.plan.maxItems,
          maxStorageGb: tenant.subscription.plan.maxStorageGb,
          maxApiCallsPerMonth: tenant.subscription.plan.maxApiCallsPerMonth,
        },
      } : null,
      usage: {
        users: tenant._count.users,
        sites: tenant._count.sites,
        items: tenant._count.items,
      },
      createdAt: tenant.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH update tenant profile
export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Check user has admin permissions (Owner or Admin)
    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const parsed = await validateBody(req, UpdateTenantSchema);
    if (parsed instanceof NextResponse) return parsed;

    const tenant = await prisma.tenant.update({
      where: { id: context.user.tenantId },
      data: parsed,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingStep: tenant.onboardingStep,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
