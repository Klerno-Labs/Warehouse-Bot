import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createLocationSchema } from "@shared/inventory";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId") || session.user.siteIds[0];
  const locations = await storage.getLocationsBySite(siteId);
  return NextResponse.json(locations.filter((l) => l.tenantId === session.user.tenantId));
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

    const payload = createLocationSchema.parse(await req.json());
    if (!session.user.siteIds.includes(payload.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }
    const existing = await storage.getLocationByLabel(payload.siteId, payload.label);
    if (existing) {
      return NextResponse.json({ error: "Location label already exists" }, { status: 409 });
    }
    const location = await storage.createLocation({
      tenantId: session.user.tenantId,
      ...payload,
      zone: payload.zone || null,
      bin: payload.bin || null,
      type: payload.type || null,
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
