import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { updateItemSchema } from "@shared/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const item = await storage.getItemById(params.id);
    if (!item || item.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const payload = updateItemSchema.parse(await req.json());
    if (payload.sku) {
      const existing = await storage.getItemBySku(session.user.tenantId, payload.sku);
      if (existing && existing.id !== item.id) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
      }
    }
    const updated = await storage.updateItem(item.id, payload);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
