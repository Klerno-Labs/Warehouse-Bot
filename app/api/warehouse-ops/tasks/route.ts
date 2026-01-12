import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { TaskManagementService } from "@server/warehouse-operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AssignTaskSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
});

const CompleteTaskSchema = z.object({
  taskId: z.string(),
  notes: z.string().optional(),
});

/**
 * Warehouse Task Management API
 *
 * GET /api/warehouse-ops/tasks - Get available tasks
 * POST /api/warehouse-ops/tasks/assign - Assign task to user
 * POST /api/warehouse-ops/tasks/complete - Complete a task
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const status = (searchParams.get("status") || "PENDING") as "PENDING" | "IN_PROGRESS";
    const userId = searchParams.get("userId") || undefined;

    const service = new TaskManagementService(context.user.tenantId);

    // Get user's assigned tasks
    if (userId) {
      const tasks = await service.getUserTasks(userId);
      return NextResponse.json({ tasks });
    }

    // Get available tasks
    const tasks = await service.getAvailableTasks(siteId, status);
    return NextResponse.json({ tasks });
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

    const body = await validateBody(req, AssignTaskSchema);
    if (body instanceof NextResponse) return body;

    const service = new TaskManagementService(context.user.tenantId);
    const task = await service.assignTask(body.taskId, body.userId);

    await createAuditLog(
      context,
      "ASSIGN",
      "Task",
      body.taskId,
      `Assigned task to user ${body.userId}`
    );

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await validateBody(req, CompleteTaskSchema);
    if (body instanceof NextResponse) return body;

    const service = new TaskManagementService(context.user.tenantId);
    const task = await service.completeTask(body.taskId, context.user.id);

    await createAuditLog(
      context,
      "COMPLETE",
      "Task",
      body.taskId,
      `Completed task${body.notes ? `: ${body.notes}` : ""}`
    );

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
