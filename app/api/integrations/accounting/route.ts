import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { AccountingSyncService, QuickBooksService, XeroService } from "@server/integrations-accounting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ConnectAccountingSchema = z.object({
  provider: z.enum(["QUICKBOOKS", "XERO"]),
  authCode: z.string(),
  realmId: z.string().optional(), // QuickBooks specific
});

const SyncSettingsSchema = z.object({
  provider: z.enum(["QUICKBOOKS", "XERO"]),
  syncInventory: z.boolean().default(true),
  syncInvoices: z.boolean().default(true),
  syncBills: z.boolean().default(true),
  syncPayments: z.boolean().default(true),
  autoSync: z.boolean().default(false),
  syncInterval: z.number().min(15).max(1440).default(60), // minutes
});

/**
 * Accounting Integration API
 *
 * GET /api/integrations/accounting - Get connection status
 * POST /api/integrations/accounting - Connect to accounting system
 * PUT /api/integrations/accounting - Update sync settings
 * DELETE /api/integrations/accounting - Disconnect
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as "QUICKBOOKS" | "XERO" | null;

    const syncService = new AccountingSyncService(context.user.tenantId);
    const connections = await syncService.getConnections();

    if (provider) {
      const connection = connections.find(c => c.provider === provider);
      return NextResponse.json({ connection });
    }

    return NextResponse.json({ connections });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, ConnectAccountingSchema);
    if (body instanceof NextResponse) return body;

    let connection;

    if (body.provider === "QUICKBOOKS") {
      const qbService = new QuickBooksService(context.user.tenantId);
      connection = await qbService.connect(body.authCode, body.realmId!);
    } else {
      const xeroService = new XeroService(context.user.tenantId);
      connection = await xeroService.connect(body.authCode);
    }

    await createAuditLog(
      context,
      "CONNECT",
      "AccountingIntegration",
      body.provider,
      `Connected to ${body.provider}`
    );

    return NextResponse.json({
      success: true,
      connection,
      message: `Successfully connected to ${body.provider}`,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, SyncSettingsSchema);
    if (body instanceof NextResponse) return body;

    const syncService = new AccountingSyncService(context.user.tenantId);
    const settings = await syncService.updateSyncSettings(body);

    await createAuditLog(
      context,
      "UPDATE",
      "AccountingSyncSettings",
      body.provider,
      `Updated sync settings for ${body.provider}`
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as "QUICKBOOKS" | "XERO";

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 }
      );
    }

    const syncService = new AccountingSyncService(context.user.tenantId);
    await syncService.disconnect(provider);

    await createAuditLog(
      context,
      "DISCONNECT",
      "AccountingIntegration",
      provider,
      `Disconnected from ${provider}`
    );

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${provider}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
