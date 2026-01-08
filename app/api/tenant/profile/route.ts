import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSession } from "@app/api/_utils/session";

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
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
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
    console.error("Error fetching tenant profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant profile" },
      { status: 500 }
    );
  }
}

// PATCH update tenant profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user has admin permissions
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || !["Owner", "Admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can update tenant settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: parsed.data,
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
    console.error("Error updating tenant profile:", error);
    return NextResponse.json(
      { error: "Failed to update tenant profile" },
      { status: 500 }
    );
  }
}
