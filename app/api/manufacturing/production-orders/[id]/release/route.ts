import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, createAuditLog } from "@app/api/_utils/middleware";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    const { id } = await params;
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Can only release PLANNED orders
    if (order.status !== "PLANNED") {
      return NextResponse.json(
        { error: `Cannot release ${order.status} orders. Only PLANNED orders can be released.` },
        { status: 400 }
      );
    }

    // Verify BOM is still ACTIVE
    if (order.bom.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot release order - BOM is no longer ACTIVE" },
        { status: 400 }
      );
    }

    const updatedOrder = await storage.updateProductionOrder(id, {
      status: "RELEASED",
      releasedByUserId: context.user.id,
      releasedAt: new Date(),
    });

    await createAuditLog(
      context,
      "UPDATE",
      "ProductionOrder",
      order.id,
      `Released production order ${order.orderNumber} for execution`
    );

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    return handleApiError(error);
  }
}
