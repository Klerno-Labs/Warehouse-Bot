import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { WavePlanningService } from "@server/transfer-wave-planning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PlanWaveSchema = z.object({
  name: z.string().optional(),
  orderIds: z.array(z.string()),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  targetStartTime: z.string().optional(),
  targetEndTime: z.string().optional(),
  assignedPickers: z.array(z.string()).optional(),
  optimizeFor: z.enum(["DISTANCE", "TIME", "BALANCE"]).default("DISTANCE"),
});

const SuggestWavesSchema = z.object({
  cutoffTime: z.string(),
  maxOrdersPerWave: z.number().min(1).default(50),
  maxPickersPerWave: z.number().min(1).default(5),
  orderFilters: z.object({
    priorities: z.array(z.string()).optional(),
    carriers: z.array(z.string()).optional(),
    zones: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Wave Planning API
 *
 * GET /api/waves - Get waves
 * GET /api/waves?id=xxx - Get specific wave
 * GET /api/waves?view=analytics - Get wave analytics
 * POST /api/waves - Create/plan wave
 * POST /api/waves?action=suggest - Get wave suggestions
 * POST /api/waves?action=release - Release wave
 * POST /api/waves?action=optimize - Optimize pick sequence
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const id = searchParams.get("id");
    const status = searchParams.get("status");

    const service = new WavePlanningService(context.user.tenantId);

    if (id) {
      const wave = await service.getWave(id);
      return NextResponse.json({ wave });
    }

    if (view === "analytics") {
      const analytics = await service.getWaveAnalytics();
      return NextResponse.json({ analytics });
    }

    if (view === "dashboard") {
      const dashboard = await service.getWaveDashboard();
      return NextResponse.json({ dashboard });
    }

    const waves = await service.getWaves({
      status: status as any || undefined,
    });
    return NextResponse.json({ waves });
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

    const service = new WavePlanningService(context.user.tenantId);

    if (action === "suggest") {
      const body = await validateBody(req, SuggestWavesSchema);
      if (body instanceof NextResponse) return body;

      const suggestions = await service.suggestWaves({
        ...body,
        cutoffTime: new Date(body.cutoffTime),
      });

      return NextResponse.json({ suggestions });
    }

    if (action === "release") {
      const body = await req.json();
      const wave = await service.releaseWave(body.waveId);

      await createAuditLog(
        context,
        "RELEASE",
        "Wave",
        body.waveId,
        `Released wave ${wave.waveNumber} for picking`
      );

      return NextResponse.json({ success: true, wave });
    }

    if (action === "optimize") {
      const body = await req.json();
      const picks = await service.optimizePickSequence(body.waveId);

      await createAuditLog(
        context,
        "OPTIMIZE",
        "Wave",
        body.waveId,
        `Optimized pick sequence for wave`
      );

      return NextResponse.json({ success: true, picks });
    }

    if (action === "complete") {
      const body = await req.json();
      const wave = await service.completeWave(body.waveId);

      await createAuditLog(
        context,
        "COMPLETE",
        "Wave",
        body.waveId,
        `Completed wave ${wave.waveNumber}`
      );

      return NextResponse.json({ success: true, wave });
    }

    if (action === "cancel") {
      const body = await req.json();
      const wave = await service.cancelWave(body.waveId, body.reason);

      await createAuditLog(
        context,
        "CANCEL",
        "Wave",
        body.waveId,
        `Cancelled wave: ${body.reason}`
      );

      return NextResponse.json({ success: true, wave });
    }

    // Plan new wave
    const body = await validateBody(req, PlanWaveSchema);
    if (body instanceof NextResponse) return body;

    const wave = await service.planWave({
      ...body,
      targetStartTime: body.targetStartTime ? new Date(body.targetStartTime) : undefined,
      targetEndTime: body.targetEndTime ? new Date(body.targetEndTime) : undefined,
      plannedBy: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "Wave",
      wave.id,
      `Planned wave ${wave.waveNumber} with ${body.orderIds.length} orders`
    );

    return NextResponse.json({
      success: true,
      wave,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
