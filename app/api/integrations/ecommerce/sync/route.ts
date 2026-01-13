import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { EcommerceSyncService } from "@server/integrations-ecommerce";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TriggerSyncSchema = z.object({
  storeId: z.string(),
  syncType: z.enum(["ORDERS", "INVENTORY", "PRODUCTS", "FULL"]).default("ORDERS"),
});

const PushInventorySchema = z.object({
  storeId: z.string(),
  itemIds: z.array(z.string()).optional(),
});

/**
 * E-commerce Sync API
 *
 * GET /api/integrations/ecommerce/sync?storeId=xxx - Get sync status
 * POST /api/integrations/ecommerce/sync - Trigger sync
 * PUT /api/integrations/ecommerce/sync - Push inventory to store
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    const syncService = new EcommerceSyncService(context.user.tenantId);
    const syncHistory = await syncService.getSyncHistory(storeId || undefined);

    return NextResponse.json({
      history: syncHistory,
      lastSync: syncHistory[0] || null,
    });
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

    const body = await validateBody(req, TriggerSyncSchema);
    if (body instanceof NextResponse) return body;

    const syncService = new EcommerceSyncService(context.user.tenantId);

    const result = await syncService.triggerSync({
      storeId: body.storeId,
      syncType: body.syncType,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "SYNC",
      "EcommerceStore",
      body.storeId,
      `Triggered ${body.syncType} sync`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `${body.syncType} sync completed`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, PushInventorySchema);
    if (body instanceof NextResponse) return body;

    const syncService = new EcommerceSyncService(context.user.tenantId);

    const result = await syncService.pushInventory({
      storeId: body.storeId,
      itemIds: body.itemIds,
    });

    await createAuditLog(
      context,
      "PUSH_INVENTORY",
      "EcommerceStore",
      body.storeId,
      `Pushed inventory for ${result.itemsUpdated} items`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `Updated ${result.itemsUpdated} items in store`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
