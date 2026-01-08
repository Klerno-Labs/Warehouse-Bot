import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";

/**
 * Usage tracking and limit enforcement for SaaS tenants
 */

/**
 * Track an API call for the tenant
 */
export async function trackApiCall(tenantId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          apiCallsThisMonth: { increment: 1 },
        },
      });
    }
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error("Error tracking API call:", error);
  }
}

/**
 * Check if tenant has exceeded their API call limit
 */
export async function checkApiCallLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
  });

  if (!subscription) {
    return { allowed: true, current: 0, limit: null, remaining: null };
  }

  const limit = subscription.plan.maxApiCallsPerMonth;
  const current = subscription.apiCallsThisMonth;

  if (limit === null) {
    return { allowed: true, current, limit: null, remaining: null };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Check if tenant can add more users
 */
export async function checkUserLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
}> {
  const [subscription, userCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.user.count({
      where: { tenantId },
    }),
  ]);

  if (!subscription) {
    return { allowed: true, current: userCount, limit: null };
  }

  const limit = subscription.plan.maxUsers;

  if (limit === null) {
    return { allowed: true, current: userCount, limit: null };
  }

  return {
    allowed: userCount < limit,
    current: userCount,
    limit,
  };
}

/**
 * Check if tenant can add more sites
 */
export async function checkSiteLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
}> {
  const [subscription, siteCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.site.count({
      where: { tenantId },
    }),
  ]);

  if (!subscription) {
    return { allowed: true, current: siteCount, limit: null };
  }

  const limit = subscription.plan.maxSites;

  if (limit === null) {
    return { allowed: true, current: siteCount, limit: null };
  }

  return {
    allowed: siteCount < limit,
    current: siteCount,
    limit,
  };
}

/**
 * Check if tenant can add more items
 */
export async function checkItemLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
}> {
  const [subscription, itemCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.item.count({
      where: { tenantId },
    }),
  ]);

  if (!subscription) {
    return { allowed: true, current: itemCount, limit: null };
  }

  const limit = subscription.plan.maxItems;

  if (limit === null) {
    return { allowed: true, current: itemCount, limit: null };
  }

  return {
    allowed: itemCount < limit,
    current: itemCount,
    limit,
  };
}

/**
 * Check if tenant can use more storage
 */
export async function checkStorageLimit(tenantId: string, additionalGb: number = 0): Promise<{
  allowed: boolean;
  currentGb: number;
  limitGb: number | null;
}> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
  });

  if (!subscription) {
    return { allowed: true, currentGb: 0, limitGb: null };
  }

  const limitGb = subscription.plan.maxStorageGb;
  const currentGb = subscription.storageUsedGb;

  if (limitGb === null) {
    return { allowed: true, currentGb, limitGb: null };
  }

  return {
    allowed: (currentGb + additionalGb) <= limitGb,
    currentGb,
    limitGb,
  };
}

/**
 * Update storage usage for tenant
 */
export async function updateStorageUsage(tenantId: string, deltaGb: number): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        storageUsedGb: { increment: deltaGb },
      },
    });
  }
}

/**
 * Get full usage summary for tenant
 */
export async function getUsageSummary(tenantId: string): Promise<{
  users: { current: number; limit: number | null };
  sites: { current: number; limit: number | null };
  items: { current: number; limit: number | null };
  apiCalls: { current: number; limit: number | null };
  storage: { currentGb: number; limitGb: number | null };
}> {
  const [subscription, userCount, siteCount, itemCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.site.count({ where: { tenantId } }),
    prisma.item.count({ where: { tenantId } }),
  ]);

  if (!subscription) {
    return {
      users: { current: userCount, limit: null },
      sites: { current: siteCount, limit: null },
      items: { current: itemCount, limit: null },
      apiCalls: { current: 0, limit: null },
      storage: { currentGb: 0, limitGb: null },
    };
  }

  return {
    users: { current: userCount, limit: subscription.plan.maxUsers },
    sites: { current: siteCount, limit: subscription.plan.maxSites },
    items: { current: itemCount, limit: subscription.plan.maxItems },
    apiCalls: { current: subscription.apiCallsThisMonth, limit: subscription.plan.maxApiCallsPerMonth },
    storage: { currentGb: subscription.storageUsedGb, limitGb: subscription.plan.maxStorageGb },
  };
}

/**
 * Reset monthly API call counters (to be called by a cron job)
 */
export async function resetMonthlyApiCalls(): Promise<void> {
  await prisma.subscription.updateMany({
    data: {
      apiCallsThisMonth: 0,
    },
  });
}

/**
 * Check subscription status - returns false if subscription is not active
 */
export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
  });

  if (!subscription) return true; // Allow if no subscription (free tier)

  const activeStatuses = ["ACTIVE", "TRIALING"];
  return activeStatuses.includes(subscription.status);
}

/**
 * Middleware helper to create limit exceeded response
 */
export function limitExceededResponse(resource: string, current: number, limit: number): NextResponse {
  return NextResponse.json(
    {
      error: "Plan limit exceeded",
      message: `You have reached your ${resource} limit (${current}/${limit}). Please upgrade your plan to add more.`,
      resource,
      current,
      limit,
      upgradeUrl: "/settings/billing",
    },
    { status: 402 } // Payment Required
  );
}
