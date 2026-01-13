import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ReportBuilderService } from "@server/advanced-reporting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ScheduleReportSchema = z.object({
  reportId: z.string(),
  schedule: z.object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday
    dayOfMonth: z.number().min(1).max(31).optional(),
    hour: z.number().min(0).max(23).default(8),
    minute: z.number().min(0).max(59).default(0),
    timezone: z.string().default("UTC"),
  }),
  format: z.enum(["CSV", "EXCEL", "PDF"]).default("EXCEL"),
  recipients: z.array(z.string().email()),
  enabled: z.boolean().default(true),
});

const UpdateScheduleSchema = ScheduleReportSchema.partial().extend({
  scheduleId: z.string(),
});

/**
 * Report Scheduling API
 *
 * GET /api/reports/schedule - List scheduled reports
 * POST /api/reports/schedule - Create schedule
 * PUT /api/reports/schedule - Update schedule
 * DELETE /api/reports/schedule?id=xxx - Delete schedule
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("id");

    const service = new ReportBuilderService(context.user.tenantId);

    if (scheduleId) {
      const schedule = await service.getSchedule(scheduleId);
      if (!schedule) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
      return NextResponse.json({ schedule });
    }

    const schedules = await service.getScheduledReports();
    return NextResponse.json({ schedules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, ScheduleReportSchema);
    if (body instanceof NextResponse) return body;

    const service = new ReportBuilderService(context.user.tenantId);

    const schedule = await service.scheduleReport({
      ...body,
      createdBy: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "ReportSchedule",
      schedule.id,
      `Scheduled report ${body.reportId} (${body.schedule.frequency})`
    );

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, UpdateScheduleSchema);
    if (body instanceof NextResponse) return body;

    const service = new ReportBuilderService(context.user.tenantId);
    const schedule = await service.updateSchedule(body.scheduleId, body);

    await createAuditLog(
      context,
      "UPDATE",
      "ReportSchedule",
      body.scheduleId,
      `Updated report schedule`
    );

    return NextResponse.json({ schedule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const service = new ReportBuilderService(context.user.tenantId);
    await service.deleteSchedule(id);

    await createAuditLog(
      context,
      "DELETE",
      "ReportSchedule",
      id,
      `Deleted report schedule`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
