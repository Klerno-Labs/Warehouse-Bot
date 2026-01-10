import { NextRequest } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";
import { logger } from "@server/logger";

/**
 * Server-Sent Events endpoint for real-time notifications
 * 
 * Usage:
 * const eventSource = new EventSource('/api/notifications/stream');
 * eventSource.onmessage = (event) => {
 *   const notification = JSON.parse(event.data);
 *   // Handle notification
 * };
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Track active connections per tenant for broadcasting
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Helper to broadcast to all connections for a tenant (internal use only, not exported)
function broadcastNotification(tenantId: string, notification: object) {
  const tenantConnections = connections.get(tenantId);
  if (!tenantConnections) return;

  const data = `data: ${JSON.stringify(notification)}\n\n`;
  tenantConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      // Connection closed, will be cleaned up
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof Response) {
      return context;
    }

    const { tenantId, id: userId } = context.user;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Register connection
        if (!connections.has(tenantId)) {
          connections.set(tenantId, new Set());
        }
        connections.get(tenantId)!.add(controller);

        // Send initial connection message
        const connectMsg = `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(connectMsg));

        // Send unread notification count
        sendUnreadCount(controller, tenantId);

        // Setup heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            const ping = `data: ${JSON.stringify({ type: "ping", timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(ping));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000); // Every 30 seconds

        // Poll for new notifications every 5 seconds
        const pollInterval = setInterval(async () => {
          try {
            const recent = await prisma.notification.findFirst({
              where: {
                tenantId,
                createdAt: {
                  gte: new Date(Date.now() - 5000), // Last 5 seconds
                },
              },
              orderBy: { createdAt: "desc" },
            });

            if (recent) {
              const notificationMsg = `data: ${JSON.stringify({
                type: "notification",
                notification: {
                  id: recent.id,
                  title: recent.title,
                  message: recent.message,
                  severity: recent.priority, // Using priority field
                  category: recent.type, // Using type field
                  isRead: recent.isRead,
                  createdAt: recent.createdAt,
                },
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(notificationMsg));
            }
          } catch {
            // Ignore polling errors
          }
        }, 5000);

        // Cleanup on close
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          clearInterval(pollInterval);
          connections.get(tenantId)?.delete(controller);
          if (connections.get(tenantId)?.size === 0) {
            connections.delete(tenantId);
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
  } catch (error) {
    logger.error("SSE error", error as Error);
    return new Response(
      JSON.stringify({ error: "Failed to establish stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function sendUnreadCount(controller: ReadableStreamDefaultController, tenantId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        tenantId,
        isRead: false,
      },
    });

    const msg = `data: ${JSON.stringify({ type: "unreadCount", count })}\n\n`;
    controller.enqueue(new TextEncoder().encode(msg));
  } catch {
    // Ignore errors
  }
}
