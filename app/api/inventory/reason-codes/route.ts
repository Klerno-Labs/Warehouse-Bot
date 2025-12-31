import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createReasonCodeSchema } from "@shared/inventory";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reasonCodes = await storage.getReasonCodesByTenant(session.user.tenantId);
  return NextResponse.json(reasonCodes);
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

    const payload = createReasonCodeSchema.parse(await req.json());
    const reasonCode = await storage.createReasonCode({
      tenantId: session.user.tenantId,
      ...payload,
      description: payload.description || null,
    });
    return NextResponse.json(reasonCode, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
