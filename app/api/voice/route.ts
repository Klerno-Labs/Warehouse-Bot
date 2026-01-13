import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { VoicePickingService } from "@server/voice-mobile-warehouse";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StartSessionSchema = z.object({
  deviceId: z.string(),
  mode: z.enum(["PICKING", "PUTAWAY", "COUNTING", "RECEIVING"]),
  language: z.string().default("en-US"),
  voiceProfile: z.string().optional(),
});

const ProcessInputSchema = z.object({
  sessionId: z.string(),
  taskId: z.string(),
  transcribedText: z.string(),
  promptSequence: z.number(),
});

const CompleteTaskSchema = z.object({
  sessionId: z.string(),
  taskId: z.string(),
  quantityCompleted: z.number().min(0),
  lotNumber: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
});

/**
 * Voice Picking API
 *
 * GET /api/voice/analytics - Get voice picking analytics
 * POST /api/voice/session - Start voice session
 * POST /api/voice/input - Process voice input
 * POST /api/voice/complete - Complete task
 * POST /api/voice/end - End session
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "WEEK") as "DAY" | "WEEK" | "MONTH";

    const service = new VoicePickingService(context.user.tenantId);
    const analytics = await service.getVoiceAnalytics(period);

    return NextResponse.json({ analytics });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "session";

    const service = new VoicePickingService(context.user.tenantId);

    if (action === "session") {
      const body = await validateBody(req, StartSessionSchema);
      if (body instanceof NextResponse) return body;

      const session = await service.startSession({
        userId: context.user.id,
        deviceId: body.deviceId,
        mode: body.mode,
        language: body.language,
        voiceProfile: body.voiceProfile,
      });

      await createAuditLog(
        context,
        "START",
        "VoiceSession",
        session.id,
        `Started ${body.mode} voice session`
      );

      return NextResponse.json({
        success: true,
        session,
      });
    }

    if (action === "input") {
      const body = await validateBody(req, ProcessInputSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.processVoiceInput({
        sessionId: body.sessionId,
        taskId: body.taskId,
        transcribedText: body.transcribedText,
        promptSequence: body.promptSequence,
      });

      return NextResponse.json(result);
    }

    if (action === "complete") {
      const body = await validateBody(req, CompleteTaskSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.completeTask({
        sessionId: body.sessionId,
        taskId: body.taskId,
        quantityCompleted: body.quantityCompleted,
        lotNumber: body.lotNumber,
        serialNumbers: body.serialNumbers,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === "end") {
      const body = await req.json();
      const result = await service.endSession(body.sessionId);

      await createAuditLog(
        context,
        "END",
        "VoiceSession",
        body.sessionId,
        `Ended voice session: ${result.summary.tasksCompleted} tasks, ${result.summary.unitsProcessed} units`
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
