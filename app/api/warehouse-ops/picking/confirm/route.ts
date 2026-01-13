import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { PickingService } from "@server/warehouse-operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ConfirmPickSchema = z.object({
  pickListId: z.string(),
  lineId: z.string(),
  pickedQuantity: z.number().min(0),
  lotId: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const CompletePickListSchema = z.object({
  pickListId: z.string(),
});

/**
 * Confirm Pick API
 *
 * POST /api/warehouse-ops/picking/confirm - Confirm individual pick
 * PUT /api/warehouse-ops/picking/confirm - Complete entire pick list
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, ConfirmPickSchema);
    if (body instanceof NextResponse) return body;

    const service = new PickingService(context.user.tenantId);

    const result = await service.confirmPick({
      pickListId: body.pickListId,
      lineId: body.lineId,
      pickedQuantity: body.pickedQuantity,
      lotId: body.lotId,
      serialNumbers: body.serialNumbers,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "PICK",
      "PickList",
      body.pickListId,
      `Picked ${body.pickedQuantity} units for line ${body.lineId}`
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CompletePickListSchema);
    if (body instanceof NextResponse) return body;

    const service = new PickingService(context.user.tenantId);

    const result = await service.completePickList(body.pickListId, context.user.id);

    await createAuditLog(
      context,
      "COMPLETE",
      "PickList",
      body.pickListId,
      `Completed pick list`
    );

    return NextResponse.json({
      success: true,
      result,
      message: "Pick list completed",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
