import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { logger } from "@server/logger";

// GET all available plans
export async function GET(req: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: "asc" },
    });

    // Format for frontend
    const formattedPlans = plans.map((plan: typeof plans[number]) => ({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      description: plan.description,
      pricing: {
        monthly: plan.monthlyPrice,
        yearly: plan.yearlyPrice,
        monthlyWhenYearly: plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12 * 100) / 100 : null,
        yearlyDiscount: plan.monthlyPrice && plan.yearlyPrice 
          ? Math.round((1 - (plan.yearlyPrice / (plan.monthlyPrice * 12))) * 100) 
          : 0,
      },
      limits: {
        maxUsers: plan.maxUsers,
        maxSites: plan.maxSites,
        maxItems: plan.maxItems,
        maxStorageGb: plan.maxStorageGb,
        maxApiCallsPerMonth: plan.maxApiCallsPerMonth,
      },
      features: plan.features,
      hasStripeIntegration: !!(plan.stripeMonthlyPriceId || plan.stripeYearlyPriceId),
    }));

    return NextResponse.json(formattedPlans);
  } catch (error) {
    logger.error("Error fetching plans", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
