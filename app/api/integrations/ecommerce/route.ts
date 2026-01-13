import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { EcommerceSyncService, ShopifyService, WooCommerceService, AmazonService } from "@server/integrations-ecommerce";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ConnectStoreSchema = z.object({
  platform: z.enum(["SHOPIFY", "WOOCOMMERCE", "AMAZON"]),
  // Shopify
  shopDomain: z.string().optional(),
  accessToken: z.string().optional(),
  // WooCommerce
  storeUrl: z.string().optional(),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
  // Amazon
  sellerId: z.string().optional(),
  mwsAuthToken: z.string().optional(),
  marketplaceId: z.string().optional(),
});

const StoreSettingsSchema = z.object({
  storeId: z.string(),
  syncOrders: z.boolean().default(true),
  syncInventory: z.boolean().default(true),
  syncProducts: z.boolean().default(false),
  autoFulfill: z.boolean().default(false),
  inventorySyncInterval: z.number().min(5).max(1440).default(15),
  orderSyncInterval: z.number().min(1).max(60).default(5),
});

/**
 * E-commerce Integration API
 *
 * GET /api/integrations/ecommerce - Get connected stores
 * POST /api/integrations/ecommerce - Connect new store
 * PUT /api/integrations/ecommerce - Update store settings
 * DELETE /api/integrations/ecommerce?storeId=xxx - Disconnect store
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    const syncService = new EcommerceSyncService(context.user.tenantId);

    if (storeId) {
      const store = await syncService.getStore(storeId);
      return NextResponse.json({ store });
    }

    const stores = await syncService.getConnectedStores();
    return NextResponse.json({ stores });
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

    const body = await validateBody(req, ConnectStoreSchema);
    if (body instanceof NextResponse) return body;

    let connection;

    switch (body.platform) {
      case "SHOPIFY":
        const shopifyService = new ShopifyService(context.user.tenantId);
        connection = await shopifyService.connect(body.shopDomain!, body.accessToken!);
        break;
      case "WOOCOMMERCE":
        const wooService = new WooCommerceService(context.user.tenantId);
        connection = await wooService.connect(body.storeUrl!, body.consumerKey!, body.consumerSecret!);
        break;
      case "AMAZON":
        const amazonService = new AmazonService(context.user.tenantId);
        connection = await amazonService.connect(body.sellerId!, body.mwsAuthToken!, body.marketplaceId!);
        break;
    }

    await createAuditLog(
      context,
      "CONNECT",
      "EcommerceStore",
      connection.id,
      `Connected ${body.platform} store`
    );

    return NextResponse.json({
      success: true,
      store: connection,
      message: `Successfully connected ${body.platform} store`,
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

    const body = await validateBody(req, StoreSettingsSchema);
    if (body instanceof NextResponse) return body;

    const syncService = new EcommerceSyncService(context.user.tenantId);
    const settings = await syncService.updateStoreSettings(body);

    await createAuditLog(
      context,
      "UPDATE",
      "EcommerceStoreSettings",
      body.storeId,
      `Updated settings for store`
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
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    const syncService = new EcommerceSyncService(context.user.tenantId);
    await syncService.disconnectStore(storeId);

    await createAuditLog(
      context,
      "DISCONNECT",
      "EcommerceStore",
      storeId,
      `Disconnected store`
    );

    return NextResponse.json({
      success: true,
      message: "Store disconnected successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
