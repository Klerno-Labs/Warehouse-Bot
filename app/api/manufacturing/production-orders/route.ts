import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const createProductionOrderSchema = z.object({
  siteId: z.string(),
  bomId: z.string(),
  orderNumber: z.string().min(1),
  itemId: z.string(),
  qtyOrdered: z.number().positive(),
  uom: z.enum(["EA", "FT", "YD", "ROLL"]),
  scheduledStart: z.string(),
  scheduledEnd: z.string().optional(),
  workcellId: z.string().optional(),
  lotNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  priority: z.number().int().min(1).max(10).default(5),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const siteId = searchParams.get("siteId");
  const itemId = searchParams.get("itemId");

  let orders = await storage.getProductionOrdersByTenant(session.user.tenantId);

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
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createProductionOrderSchema.parse(body);

    // Verify BOM exists and is ACTIVE
    const bom = await storage.getBOMById(validatedData.bomId);
    if (!bom || bom.tenantId !== session.user.tenantId) {
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
      session.user.tenantId
    );
    if (existing.some((o) => o.orderNumber === validatedData.orderNumber)) {
      return NextResponse.json(
        { error: "Production order number already exists" },
        { status: 400 }
      );
    }

    const order = await storage.createProductionOrder({
      tenantId: session.user.tenantId,
      siteId: validatedData.siteId,
      bomId: validatedData.bomId,
      orderNumber: validatedData.orderNumber,
      itemId: validatedData.itemId,
      qtyOrdered: validatedData.qtyOrdered,
      uom: validatedData.uom,
      scheduledStart: new Date(validatedData.scheduledStart),
      scheduledEnd: validatedData.scheduledEnd
        ? new Date(validatedData.scheduledEnd)
        : null,
      workcellId: validatedData.workcellId,
      lotNumber: validatedData.lotNumber,
      batchNumber: validatedData.batchNumber,
      priority: validatedData.priority,
      notes: validatedData.notes,
      createdByUserId: session.user.id,
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "ProductionOrder",
      entityId: order.id,
      details: `Created production order ${order.orderNumber}`,
      ipAddress: null,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating production order:", error);
    return NextResponse.json(
      { error: "Failed to create production order" },
      { status: 500 }
    );
  }
}
