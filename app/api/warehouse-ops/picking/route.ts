import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { PickingService, TaskManagementService } from "@server/warehouse-operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateWaveSchema = z.object({
  siteId: z.string(),
  orderIds: z.array(z.string()).min(1),
  strategy: z.enum(["WAVE", "BATCH", "ZONE", "CLUSTER"]).default("WAVE"),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

const CreatePickListSchema = z.object({
  waveId: z.string().optional(),
  orderId: z.string().optional(),
  pickerId: z.string().optional(),
});

/**
 * Picking Operations API
 *
 * GET /api/warehouse-ops/picking - Get picking waves/lists
 * POST /api/warehouse-ops/picking/wave - Create picking wave
 * POST /api/warehouse-ops/picking/list - Generate pick list
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const status = searchParams.get("status") || "PENDING";

    const taskService = new TaskManagementService(context.user.tenantId);
    const tasks = await taskService.getAvailableTasks(
      siteId || undefined,
      status as "PENDING" | "IN_PROGRESS"
    );

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CreateWaveSchema);
    if (body instanceof NextResponse) return body;

    const service = new PickingService(context.user.tenantId);

    const wave = await service.createPickingWave({
      siteId: body.siteId,
      orderIds: body.orderIds,
      strategy: body.strategy,
      priority: body.priority,
    });

    await createAuditLog(
      context,
      "CREATE",
      "PickingWave",
      wave.waveId,
      `Created ${body.strategy} picking wave with ${body.orderIds.length} orders`
    );

    return NextResponse.json({
      wave,
      message: `Created picking wave with ${wave.pickLists.length} pick lists`,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
