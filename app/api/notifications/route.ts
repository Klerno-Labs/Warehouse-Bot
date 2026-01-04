import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";

/**
 * Notification System API
 *
 * Provides in-app notifications for:
 * - Job ready for next department
 * - Low inventory alerts
 * - Quality issues
 * - Production delays
 */

// Get notifications for current user
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: context.user.tenantId,
        ...(unreadOnly ? { isRead: false } : {}),
        // Filter by user role/department if needed
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent 50
    });

    const unreadCount = await prisma.notification.count({
      where: {
        tenantId: context.user.tenantId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Mark notification as read
export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          tenantId: context.user.tenantId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "notificationId or markAllRead required" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create notification (internal use by other APIs)
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { type, title, message, priority, targetDepartment, metadata } = await req.json();

    const notification = await prisma.notification.create({
      data: {
        tenantId: context.user.tenantId,
        type,
        title,
        message,
        priority: priority || "MEDIUM",
        targetDepartment,
        metadata: metadata || {},
        isRead: false,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return handleApiError(error);
  }
}
