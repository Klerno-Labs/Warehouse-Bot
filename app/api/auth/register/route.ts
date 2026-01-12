import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { setSessionCookie } from "@app/api/_utils/session";
import { audit } from "@server/audit";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  // Company info
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  
  // Admin user info
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  
  // Optional
  phone: z.string().optional(),
  planTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("FREE"),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = generateSlug(baseName);
  let counter = 0;
  
  while (true) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: counter === 0 ? slug : `${slug}-${counter}` },
    });
    
    if (!existing) {
      return counter === 0 ? slug : `${slug}-${counter}`;
    }
    counter++;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Find the requested plan (or default to FREE)
    let plan = await prisma.plan.findUnique({
      where: { tier: data.planTier },
    });

    // If plan doesn't exist, create default FREE plan
    if (!plan) {
      plan = await prisma.plan.upsert({
        where: { tier: "FREE" },
        update: {},
        create: {
          name: "Free",
          tier: "FREE",
          description: "Get started with basic inventory management",
          monthlyPrice: 0,
          yearlyPrice: 0,
          maxUsers: 3,
          maxSites: 1,
          maxItems: 100,
          maxStorageGb: 1,
          maxApiCallsPerMonth: 1000,
          features: ["inventory_tracking", "basic_reports"],
          enabledModules: ["INVENTORY", "DASHBOARD"],
          isActive: true,
          isPublic: true,
          sortOrder: 0,
        },
      });
    }

    // Generate unique slug for tenant
    const slug = await generateUniqueSlug(data.companyName);

    // Create tenant, subscription, user, and default site in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          contactEmail: data.email,
          contactPhone: data.phone,
          enabledModules: plan!.enabledModules,
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });

      // 2. Create subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan!.id,
          status: plan!.tier === "FREE" ? "ACTIVE" : "TRIALING",
          billingInterval: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          trialStart: plan!.tier !== "FREE" ? new Date() : null,
          trialEnd: plan!.tier !== "FREE" ? trialEnd : null,
          usersCount: 1,
          sitesCount: 1,
        },
      });

      // 3. Create default site
      const site = await tx.site.create({
        data: {
          tenantId: tenant.id,
          name: "Main Warehouse",
        },
      });

      // 4. Create admin user
      const hashedPassword = bcrypt.hashSync(data.password, 12);
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "Admin",
          siteIds: [site.id],
          isActive: true,
        },
      });

      // 5. Create default locations
      await tx.location.createMany({
        data: [
          { tenantId: tenant.id, siteId: site.id, label: "RECV-01", type: "RECEIVING" },
          { tenantId: tenant.id, siteId: site.id, label: "STOCK-01", type: "STOCK" },
          { tenantId: tenant.id, siteId: site.id, label: "SHIP-01", type: "SHIPPING" },
        ],
      });

      // 6. Create default reason codes
      await tx.reasonCode.createMany({
        data: [
          { tenantId: tenant.id, code: "DAMAGED", description: "Damaged goods", type: "SCRAP" },
          { tenantId: tenant.id, code: "CYCLE_COUNT", description: "Cycle count adjustment", type: "ADJUST" },
          { tenantId: tenant.id, code: "QC_FAIL", description: "QC failure", type: "HOLD" },
        ],
      });

      return { tenant, site, user };
    });

    // Set session cookie
    setSessionCookie(result.user.id);

    // Audit the registration
    await audit(
      result.tenant.id,
      result.user.id,
      "CREATE",
      "Tenant",
      result.tenant.id,
      `New tenant registered: ${data.companyName}`
    );

    // Return success with user info (without password)
    const { password: _, ...userWithoutPassword } = result.user;

    return NextResponse.json({
      message: "Registration successful",
      user: {
        ...userWithoutPassword,
        tenantName: result.tenant.name,
        tenantSlug: result.tenant.slug,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      site: {
        id: result.site.id,
        name: result.site.name,
      },
      redirectTo: "/onboarding",
    }, { status: 201 });

  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
