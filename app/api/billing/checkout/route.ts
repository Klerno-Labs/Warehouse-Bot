import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@server/prisma";
import { getSession } from "@app/api/_utils/session";

// Initialize Stripe (will need STRIPE_SECRET_KEY env variable)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" as any })
  : null;

const CheckoutSchema = z.object({
  planId: z.string().uuid(),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." },
        { status: 503 }
      );
    }

    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user has admin permissions
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { tenant: { include: { subscription: true } } },
    });

    if (!user || !["Owner", "Admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins can manage billing" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, billingInterval, successUrl, cancelUrl } = parsed.data;

    // Get the plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get the appropriate Stripe price ID
    const priceId = billingInterval === "YEARLY" 
      ? plan.stripeYearlyPriceId 
      : plan.stripeMonthlyPriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Plan does not have Stripe pricing configured" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = user.tenant.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.tenant.name,
        metadata: {
          tenantId: session.tenantId,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      if (user.tenant.subscription) {
        await prisma.subscription.update({
          where: { id: user.tenant.subscription.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/settings/billing?success=true`,
      cancel_url: cancelUrl || `${baseUrl}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: {
          tenantId: session.tenantId,
          planId: plan.id,
        },
      },
      metadata: {
        tenantId: session.tenantId,
        planId: plan.id,
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
