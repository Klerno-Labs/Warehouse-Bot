import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { LaborManagementService } from "@server/labor-yard-management";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RecordTaskSchema = z.object({
  workerId: z.string(),
  taskType: z.string(),
  unitsProcessed: z.number().min(0),
  startTime: z.string(),
  endTime: z.string(),
  errors: z.number().min(0).default(0),
});

/**
 * Labor Management API
 *
 * GET /api/labor - Get workforce analytics
 * GET /api/labor?workerId=xxx - Get worker productivity
 * POST /api/labor - Record task completion
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId");
    const period = (searchParams.get("period") || "WEEK") as "DAY" | "WEEK" | "MONTH";

    const service = new LaborManagementService(context.user.tenantId);

    if (workerId) {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const productivity = await service.getWorkerProductivity(
        workerId,
        startDate,
        new Date()
      );
      return NextResponse.json({ productivity });
    }

    const analytics = await service.getWorkforceAnalytics({ period });
    const metrics = await service.getProductivityMetrics({ period });
    const standards = await service.getLaborStandards();

    return NextResponse.json({
      analytics,
      metrics,
      standards,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await validateBody(req, RecordTaskSchema);
    if (body instanceof NextResponse) return body;

    const service = new LaborManagementService(context.user.tenantId);

    await service.recordTaskCompletion({
      workerId: body.workerId,
      taskType: body.taskType,
      unitsProcessed: body.unitsProcessed,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      errors: body.errors,
    });

    return NextResponse.json({
      success: true,
      message: "Task recorded successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
