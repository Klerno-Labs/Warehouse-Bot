import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createItemSchema } from "@shared/inventory";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await storage.getItemsByTenant(session.user.tenantId);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const payload = createItemSchema.parse(await req.json());
    const existing = await storage.getItemBySku(session.user.tenantId, payload.sku);
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    const item = await storage.createItem({
      tenantId: session.user.tenantId,
      ...payload,
      description: payload.description || null,
      minQtyBase: payload.minQtyBase ?? null,
      maxQtyBase: payload.maxQtyBase ?? null,
      reorderPointBase: payload.reorderPointBase ?? null,
      leadTimeDays: payload.leadTimeDays ?? null,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
