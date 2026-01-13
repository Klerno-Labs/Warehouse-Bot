import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, validateBody, handleApiError, createAuditLog } from "@app/api/_utils/middleware";
import { createProductionOrderSchema } from "@shared/manufacturing";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const siteId = searchParams.get("siteId");
  const itemId = searchParams.get("itemId");

  let orders = await storage.getProductionOrdersByTenant(context.user.tenantId);

  // Apply filters
  if (status) {
    orders = orders.filter((order) => order.status === status);
  }

  if (siteId) {
    orders = orders.filter((order) => order.siteId === siteId);
  }

  if (itemId) {
    orders = orders.filter((order) => order.itemId === itemId);
  }

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const data = await validateBody(req, createProductionOrderSchema);
    if (data instanceof NextResponse) return data;

    // Verify BOM exists and is ACTIVE
    const bom = await storage.getBOMById(data.bomId);
    if (!bom || bom.tenantId !== context.user.tenantId) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 });
    }

    if (bom.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Can only create production orders from ACTIVE BOMs" },
        { status: 400 }
      );
    }

    // Check unique order number
    const existing = await storage.getProductionOrdersByTenant(
      context.user.tenantId
    );
    if (existing.some((o) => o.orderNumber === data.orderNumber)) {
      return NextResponse.json(
        { error: "Production order number already exists" },
        { status: 400 }
      );
    }

    const order = await storage.createProductionOrder({
      tenantId: context.user.tenantId,
      siteId: data.siteId,
      bomId: data.bomId,
      orderNumber: data.orderNumber,
      itemId: data.itemId,
      qtyOrdered: data.qtyOrdered,
      uom: data.uom,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: data.scheduledEnd
        ? new Date(data.scheduledEnd)
        : null,
      workcellId: data.workcellId,
      lotNumber: data.lotNumber,
      batchNumber: data.batchNumber,
      priority: data.priority,
      notes: data.notes,
      createdByUserId: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "ProductionOrder",
      order.id,
      `Created production order ${order.orderNumber}`
    );

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
