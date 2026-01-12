import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { KittingService } from "@server/cross-docking-kitting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateKitSchema = z.object({
  kitSku: z.string().min(1),
  kitName: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["STATIC", "DYNAMIC", "CONFIGURABLE"]),
  components: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().min(1),
    isOptional: z.boolean().default(false),
    substituteItemIds: z.array(z.string()).optional(),
  })).min(1),
  laborMinutes: z.number().min(0).optional(),
  instructions: z.string().optional(),
});

const CreateKitOrderSchema = z.object({
  kitId: z.string(),
  quantity: z.number().min(1),
  priority: z.enum(["STANDARD", "HIGH", "URGENT"]).default("STANDARD"),
  salesOrderId: z.string().optional(),
});

/**
 * Kitting & Assembly API
 *
 * GET /api/kitting - Get kits
 * GET /api/kitting/orders - Get kit orders
 * GET /api/kitting/analytics - Get kitting analytics
 * POST /api/kitting - Create kit definition
 * POST /api/kitting/orders - Create kit assembly order
 * POST /api/kitting/availability - Check kit availability
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    const service = new KittingService(context.user.tenantId);

    if (view === "orders") {
      const status = searchParams.get("status") as any;
      const orders = await service.getKitOrders({ status });
      return NextResponse.json({ orders });
    }

    if (view === "analytics") {
      const period = (searchParams.get("period") || "MONTH") as "WEEK" | "MONTH";
      const analytics = await service.getKittingAnalytics(period);
      return NextResponse.json({ analytics });
    }

    const status = searchParams.get("status") as any;
    const kits = await service.getKits({ status });

    return NextResponse.json({ kits });
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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new KittingService(context.user.tenantId);

    if (action === "order") {
      const body = await validateBody(req, CreateKitOrderSchema);
      if (body instanceof NextResponse) return body;

      const order = await service.createKitOrder({
        kitId: body.kitId,
        quantity: body.quantity,
        priority: body.priority,
        salesOrderId: body.salesOrderId,
      });

      await createAuditLog(
        context,
        "CREATE",
        "KitOrder",
        order.id,
        `Created kit order for ${body.quantity} units`
      );

      return NextResponse.json({
        success: true,
        order,
      });
    }

    if (action === "availability") {
      const body = await req.json();
      const availability = await service.checkKitAvailability(
        body.kitId,
        body.quantity,
        body.siteId
      );
      return NextResponse.json({ availability });
    }

    // Default: Create kit definition
    const body = await validateBody(req, CreateKitSchema);
    if (body instanceof NextResponse) return body;

    const kit = await service.createKit({
      kitSku: body.kitSku,
      kitName: body.kitName,
      description: body.description,
      type: body.type,
      components: body.components,
      laborMinutes: body.laborMinutes,
      instructions: body.instructions,
    });

    await createAuditLog(
      context,
      "CREATE",
      "Kit",
      kit.id,
      `Created kit ${body.kitSku}`
    );

    return NextResponse.json({
      success: true,
      kit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
