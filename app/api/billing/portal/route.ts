import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" as any })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Executive", "Admin", "SuperAdmin"]);
  if (roleCheck instanceof NextResponse) {
    return NextResponse.json({ error: "Only admins can access billing portal" }, { status: 403 });
  }

  try {
    // Get user with tenant and subscription
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      include: { tenant: { include: { subscription: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    return handleApiError(error);
  }
}
