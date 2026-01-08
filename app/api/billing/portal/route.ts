import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@server/prisma";
import { getSession } from "@app/api/_utils/session";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" as any })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
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
        { error: "Only admins can access billing portal" },
        { status: 403 }
      );
    }

    const customerId = user.tenant.subscription?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe to a plan first." },
        { status: 400 }
      );
    }

    // Create billing portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/settings/billing`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
