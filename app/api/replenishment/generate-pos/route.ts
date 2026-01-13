import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { AutoReplenishmentService } from "@server/auto-replenishment";
import { z } from "zod";

export const dynamic = "force-dynamic";

const GeneratePOsSchema = z.object({
  siteId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  autoApprove: z.boolean().default(false),
  consolidateBySupplier: z.boolean().default(true),
});

/**
 * Auto-Generate Purchase Orders API
 *
 * POST /api/replenishment/generate-pos - Auto-generate POs for items below reorder point
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, GeneratePOsSchema);
    if (body instanceof NextResponse) return body;

    const service = new AutoReplenishmentService(context.user.tenantId);

    const result = await service.generateReplenishmentOrders({
      siteId: body.siteId,
      itemIds: body.itemIds,
      autoApprove: body.autoApprove,
      consolidateBySupplier: body.consolidateBySupplier,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "GENERATE",
      "ReplenishmentOrders",
      `batch-${Date.now()}`,
      `Generated ${result.purchaseOrders.length} purchase orders for ${result.itemsProcessed} items`
    );

    return NextResponse.json({
      success: true,
      purchaseOrders: result.purchaseOrders,
      itemsProcessed: result.itemsProcessed,
      totalValue: result.totalValue,
      message: `Generated ${result.purchaseOrders.length} purchase orders`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
