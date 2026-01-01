import { NextResponse } from "next/server";
import { z } from "zod";
import { InventoryTxnType, AdjustDirection } from "@prisma/client";
import { getSessionUser } from "@app/api/_utils/session";
import { prisma } from "@server/prisma";
import { applyInventoryTxn, InventoryTxnError } from "@server/inventory-erp";

const txnSchema = z.object({
  type: z.nativeEnum(InventoryTxnType),
  itemId: z.string().min(1),
  qty: z.number().positive(),
  uomId: z.string().min(1),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  note: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  direction: z.nativeEnum(AdjustDirection).optional(),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = txnSchema.parse(await req.json());

    if (payload.type === "ADJUST" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const txn = await applyInventoryTxn(prisma, {
      type: payload.type,
      itemId: payload.itemId,
      qty: payload.qty,
      uomId: payload.uomId,
      fromLocationId: payload.fromLocationId || null,
      toLocationId: payload.toLocationId || null,
      note: payload.note || null,
      referenceType: payload.referenceType || null,
      referenceId: payload.referenceId || null,
      direction: payload.direction || null,
      createdByUserId: session.id,
    });

    return NextResponse.json({ txn });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    if (error instanceof InventoryTxnError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
