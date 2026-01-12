import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { AccountingSyncService } from "@server/integrations-accounting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TriggerSyncSchema = z.object({
  provider: z.enum(["QUICKBOOKS", "XERO"]),
  syncType: z.enum(["FULL", "INCREMENTAL", "INVENTORY_ONLY", "INVOICES_ONLY", "BILLS_ONLY"]).default("INCREMENTAL"),
});

/**
 * Accounting Sync Trigger API
 *
 * POST /api/integrations/accounting/sync - Trigger manual sync
 * GET /api/integrations/accounting/sync - Get sync status/history
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as "QUICKBOOKS" | "XERO" | null;

    const syncService = new AccountingSyncService(context.user.tenantId);
    const syncHistory = await syncService.getSyncHistory(provider || undefined);

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

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, TriggerSyncSchema);
    if (body instanceof NextResponse) return body;

    const syncService = new AccountingSyncService(context.user.tenantId);

    const result = await syncService.triggerSync({
      provider: body.provider,
      syncType: body.syncType,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "SYNC",
      "AccountingIntegration",
      body.provider,
      `Triggered ${body.syncType} sync with ${body.provider}`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `Sync ${result.status === "COMPLETED" ? "completed" : "started"} successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
