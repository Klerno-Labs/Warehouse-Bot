import { NextResponse } from "next/server";
import storage from "@/server/storage";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

/**
 * GET /api/tenant/settings
 * Get tenant settings
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    let settings = await storage.tenantSettings.findUnique({
      where: { tenantId: context.user.tenantId }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await storage.tenantSettings.create({
        data: {
          tenantId: context.user.tenantId
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/tenant/settings
 * Update tenant settings (Admin only)
 */
export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      currency,
      locale,
      timezone,
      dateFormat,
      timeFormat,
      fiscalYearStart,
      workWeekDays,
      defaultUOM,
      requirePOApproval,
      poApprovalLimit,
      autoReceivePos,
      autoReleasePOs,
      defaultLeadTime,
      allowNegativeInventory
    } = body;

    // Prepare update data - only include defined fields
    const updateData: Record<string, unknown> = {};
    if (currency !== undefined) updateData.currency = currency;
    if (locale !== undefined) updateData.locale = locale;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (timeFormat !== undefined) updateData.timeFormat = timeFormat;
    if (fiscalYearStart !== undefined) updateData.fiscalYearStart = fiscalYearStart;
    if (workWeekDays !== undefined) updateData.workWeekDays = workWeekDays;
    if (defaultUOM !== undefined) updateData.defaultUOM = defaultUOM;
    if (requirePOApproval !== undefined) updateData.requirePOApproval = requirePOApproval;
    if (poApprovalLimit !== undefined) updateData.poApprovalLimit = poApprovalLimit;
    if (autoReceivePos !== undefined) updateData.autoReceivePos = autoReceivePos;
    if (autoReleasePOs !== undefined) updateData.autoReleasePOs = autoReleasePOs;
    if (defaultLeadTime !== undefined) updateData.defaultLeadTime = defaultLeadTime;
    if (allowNegativeInventory !== undefined) updateData.allowNegativeInventory = allowNegativeInventory;

    // Upsert settings
    const settings = await storage.tenantSettings.upsert({
      where: { tenantId: context.user.tenantId },
      update: updateData,
      create: {
        tenantId: context.user.tenantId,
        ...updateData
      }
    });

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    return handleApiError(error);
  }
}
