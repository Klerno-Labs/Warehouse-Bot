import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@server/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { logger } from "@server/logger";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" as any })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error("Webhook signature verification failed", err as Error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        logger.debug("Unhandled Stripe event type", { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing webhook", error as Error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: any) {
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;

  if (!tenantId || !planId) {
    logger.error("Missing tenantId or planId in checkout session metadata");
    return;
  }

  const stripeSubscription = session.subscription as string;
  
  // Fetch the full subscription from Stripe
  const subscription = await stripe!.subscriptions.retrieve(stripeSubscription) as any;

  await prisma.subscription.updateMany({
    where: { tenantId },
    data: {
      planId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: session.customer as string,
      status: "ACTIVE",
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: null,
    },
  });

  logger.info("Subscription activated", { tenantId });
}

async function handleSubscriptionUpdated(subscription: any) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    // Try to find by stripeSubscriptionId
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!existingSub) {
      logger.error("Could not find subscription for Stripe subscription", undefined, { subscriptionId: subscription.id });
      return;
    }
  }

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    trialing: "TRIALING",
    incomplete: "UNPAID",
    incomplete_expired: "CANCELED",
    paused: "PAUSED",
  };

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: statusMap[subscription.status] || "ACTIVE",
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
}

async function handleSubscriptionDeleted(subscription: any) {
  // Find the subscription and downgrade to free plan
  const existingSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSub) {
    logger.error("Could not find subscription for deletion", undefined, { subscriptionId: subscription.id });
    return;
  }

  // Find the free plan
  const freePlan = await prisma.plan.findFirst({
    where: { tier: "FREE" },
  });

  if (freePlan) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        planId: freePlan.id,
        status: "ACTIVE",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        status: "CANCELED",
        cancelAtPeriodEnd: false,
      },
    });
  }

  logger.info("Subscription deleted, tenant downgraded to free", { subscriptionId: subscription.id });
}

async function handleInvoicePaid(invoice: any) {
  if (!invoice.subscription) return;

  // Find the subscription
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!subscription) {
    logger.error("Could not find subscription for invoice", undefined, { invoiceId: invoice.id });
    return;
  }

  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
  const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date();

  // Create invoice record
  await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amountDue: invoice.amount_due / 100, // Convert from cents
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: "paid",
      paidAt: invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000) 
        : new Date(),
      stripeInvoiceUrl: invoice.hosted_invoice_url || undefined,
      stripePdfUrl: invoice.invoice_pdf || undefined,
      periodStart,
      periodEnd,
    },
  });

  logger.info("Invoice recorded as paid", { invoiceId: invoice.id });
}

async function handleInvoicePaymentFailed(invoice: any) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!subscription) return;

  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
  const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date();

  // Create failed invoice record
  await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amountDue: invoice.amount_due / 100,
      amountPaid: 0,
      currency: invoice.currency.toUpperCase(),
      status: "failed",
      stripeInvoiceUrl: invoice.hosted_invoice_url || undefined,
      periodStart,
      periodEnd,
    },
  });

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  logger.warn("Invoice payment failed", { invoiceId: invoice.id });
}
