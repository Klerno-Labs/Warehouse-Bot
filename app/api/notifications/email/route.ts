import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { EmailService } from "@server/email";
import { prisma } from "@server/prisma";

/**
 * Email Notification API
 *
 * Manually trigger email notifications or configure automated alerts
 *
 * POST /api/notifications/email
 * - Send manual emails
 * - Configure email preferences
 *
 * GET /api/notifications/email/settings
 * - Get user email notification preferences
 */

const sendEmailSchema = z.object({
  type: z.enum([
    "low-stock-alert",
    "out-of-stock-alert",
    "job-ready",
    "job-completed",
    "cycle-count-ready",
    "variance-approval",
    "quality-issue",
    "daily-summary",
  ]),
  to: z.string().email().or(z.array(z.string().email())),
  data: z.record(z.any()),
});

const updateSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  lowStockAlerts: z.boolean().optional(),
  outOfStockAlerts: z.boolean().optional(),
  jobNotifications: z.boolean().optional(),
  cycleCountNotifications: z.boolean().optional(),
  qualityIssueNotifications: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
});

// Send email notification
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, sendEmailSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    let success = false;

    switch (validatedData.type) {
      case "low-stock-alert":
        success = await EmailService.sendLowStockAlert(
          validatedData.to as string,
          validatedData.data.items
        );
        break;

      case "out-of-stock-alert":
        success = await EmailService.sendOutOfStockAlert(
          validatedData.to as string,
          validatedData.data.items
        );
        break;

      case "job-ready":
        success = await EmailService.sendJobReadyNotification(
          validatedData.to as string,
          validatedData.data.jobNumber,
          validatedData.data.department,
          validatedData.data.itemCount
        );
        break;

      case "job-completed":
        success = await EmailService.sendJobCompletedNotification(
          validatedData.to as string,
          validatedData.data.jobNumber,
          validatedData.data.completedBy,
          validatedData.data.itemsProcessed
        );
        break;

      case "cycle-count-ready":
        success = await EmailService.sendCycleCountReadyNotification(
          validatedData.to as string,
          validatedData.data.countName,
          validatedData.data.itemCount,
          new Date(validatedData.data.scheduledDate)
        );
        break;

      case "variance-approval":
        success = await EmailService.sendVarianceApprovalNotification(
          validatedData.to as string,
          validatedData.data.countName,
          validatedData.data.varianceCount,
          validatedData.data.totalValue
        );
        break;

      case "quality-issue":
        success = await EmailService.sendQualityIssueNotification(
          validatedData.to as string,
          validatedData.data.orderNumber,
          validatedData.data.issue,
          validatedData.data.reportedBy
        );
        break;

      case "daily-summary":
        success = await EmailService.sendDailySummary(
          validatedData.to as string,
          validatedData.data.summary
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send email. Email service may not be configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

// Default email notification settings
const defaultEmailSettings = {
  emailNotifications: true,
  lowStockAlerts: true,
  outOfStockAlerts: true,
  jobNotifications: true,
  cycleCountNotifications: true,
  qualityIssueNotifications: true,
  dailySummary: false,
};

// Get email notification settings
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Fetch user preferences from database
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: { preferences: true, email: true },
    });

    const storedPrefs = (user?.preferences as Record<string, any>) || {};
    const emailSettings = storedPrefs.emailNotifications || {};

    // Merge with defaults
    const settings = {
      ...defaultEmailSettings,
      ...emailSettings,
      email: user?.email || context.user.email,
    };

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

// Update email notification settings
export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, updateSettingsSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    // Get current preferences
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: { preferences: true },
    });

    const currentPrefs = (user?.preferences as Record<string, any>) || {};

    // Update email notification settings within preferences
    const updatedPrefs = {
      ...currentPrefs,
      emailNotifications: {
        ...(currentPrefs.emailNotifications || {}),
        ...validatedData,
      },
    };

    // Store in database
    await prisma.user.update({
      where: { id: context.user.id },
      data: { preferences: updatedPrefs },
    });

    return NextResponse.json({
      success: true,
      message: "Email notification settings updated",
      settings: validatedData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
