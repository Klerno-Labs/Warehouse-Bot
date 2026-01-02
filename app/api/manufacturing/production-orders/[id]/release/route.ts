import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = await storage.getProductionOrderById(params.id);
    if (!order || order.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

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

    const updatedOrder = await storage.updateProductionOrder(params.id, {
      status: "RELEASED",
      releasedByUserId: session.user.id,
      releasedAt: new Date(),
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ProductionOrder",
      entityId: order.id,
      details: `Released production order ${order.orderNumber} for execution`,
      ipAddress: null,
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error releasing production order:", error);
    return NextResponse.json(
      { error: "Failed to release production order" },
      { status: 500 }
    );
  }
}
