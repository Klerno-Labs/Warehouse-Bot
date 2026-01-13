import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { WebhookService } from "@server/webhooks-documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateEndpointSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  events: z.array(z.string()),
  headers: z.record(z.string()).optional(),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10).optional(),
    retryDelayMs: z.number().min(100).max(60000).optional(),
    exponentialBackoff: z.boolean().optional(),
  }).optional(),
});

const UpdateEndpointSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10).optional(),
    retryDelayMs: z.number().min(100).max(60000).optional(),
    exponentialBackoff: z.boolean().optional(),
  }).optional(),
});

const TriggerEventSchema = z.object({
  eventType: z.string(),
  payload: z.record(z.any()),
});

/**
 * Webhook Management API
 *
 * GET /api/webhooks - Get webhook dashboard
 * GET /api/webhooks?view=endpoints - Get all endpoints
 * GET /api/webhooks?view=events - Get event history
 * GET /api/webhooks?view=deliveries - Get delivery history
 * GET /api/webhooks?view=types - Get available event types
 * POST /api/webhooks - Create endpoint
 * POST /api/webhooks?action=update - Update endpoint
 * POST /api/webhooks?action=delete - Delete endpoint
 * POST /api/webhooks?action=test - Test endpoint
 * POST /api/webhooks?action=rotate-secret - Rotate endpoint secret
 * POST /api/webhooks?action=trigger - Trigger event (for testing)
 * POST /api/webhooks?action=retry - Retry failed delivery
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const id = searchParams.get("id");

    const service = new WebhookService(context.user.tenantId);

    if (view === "endpoints") {
      const endpoints = await service.getEndpoints();
      return NextResponse.json({ endpoints });
    }

    if (view === "endpoint" && id) {
      const endpoint = await service.getEndpoint(id);
      return NextResponse.json({ endpoint });
    }

    if (view === "events") {
      const eventType = searchParams.get("eventType");
      const limit = parseInt(searchParams.get("limit") || "50");
      const events = await service.getEventHistory({
        eventType: eventType || undefined,
        limit,
      });
      return NextResponse.json({ events });
    }

    if (view === "deliveries") {
      const endpointId = searchParams.get("endpointId");
      const status = searchParams.get("status") as any;
      const limit = parseInt(searchParams.get("limit") || "50");
      const deliveries = await service.getDeliveryHistory({
        endpointId: endpointId || undefined,
        status: status || undefined,
        limit,
      });
      return NextResponse.json({ deliveries });
    }

    if (view === "types") {
      const types = await service.getEventTypes();
      return NextResponse.json({ types });
    }

    // Default - dashboard
    const dashboard = await service.getWebhookDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new WebhookService(context.user.tenantId);

    if (action === "update") {
      const body = await validateBody(req, UpdateEndpointSchema);
      if (body instanceof NextResponse) return body;

      const { id, ...updates } = body;
      const endpoint = await service.updateEndpoint(id, updates);

      await createAuditLog(
        context,
        "UPDATE",
        "WebhookEndpoint",
        id,
        `Updated webhook endpoint`
      );

      return NextResponse.json({ success: true, endpoint });
    }

    if (action === "delete") {
      const body = await req.json();
      await service.deleteEndpoint(body.id);

      await createAuditLog(
        context,
        "DELETE",
        "WebhookEndpoint",
        body.id,
        `Deleted webhook endpoint`
      );

      return NextResponse.json({ success: true });
    }

    if (action === "test") {
      const body = await req.json();
      const result = await service.testEndpoint(body.id);

      return NextResponse.json({ result });
    }

    if (action === "rotate-secret") {
      const body = await req.json();
      const result = await service.rotateSecret(body.id);

      await createAuditLog(
        context,
        "ROTATE_SECRET",
        "WebhookEndpoint",
        body.id,
        `Rotated webhook secret`
      );

      return NextResponse.json({ success: true, newSecret: result.newSecret });
    }

    if (action === "trigger") {
      const body = await validateBody(req, TriggerEventSchema);
      if (body instanceof NextResponse) return body;

      const event = await service.triggerEvent(body);

      await createAuditLog(
        context,
        "TRIGGER",
        "WebhookEvent",
        event.id,
        `Manually triggered ${body.eventType} event`
      );

      return NextResponse.json({ success: true, event });
    }

    if (action === "retry") {
      const body = await req.json();
      const delivery = await service.retryDelivery(body.deliveryId);

      await createAuditLog(
        context,
        "RETRY",
        "WebhookDelivery",
        body.deliveryId,
        `Retried webhook delivery`
      );

      return NextResponse.json({ success: true, delivery });
    }

    // Create new endpoint
    const body = await validateBody(req, CreateEndpointSchema);
    if (body instanceof NextResponse) return body;

    const endpoint = await service.createEndpoint(body);

    await createAuditLog(
      context,
      "CREATE",
      "WebhookEndpoint",
      endpoint.id,
      `Created webhook endpoint: ${body.name}`
    );

    return NextResponse.json({
      success: true,
      endpoint,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
