import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/tenant/settings
 * Get tenant settings
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await storage.tenantSettings.findUnique({
      where: { tenantId: user.tenantId }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await storage.tenantSettings.create({
        data: {
          tenantId: user.tenantId
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenant/settings
 * Update tenant settings (Admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

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
    const updateData: any = {};
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
      where: { tenantId: user.tenantId },
      update: updateData,
      create: {
        tenantId: user.tenantId,
        ...updateData
      }
    });

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
