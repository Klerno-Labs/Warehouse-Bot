import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await storage.getTenant(session.user.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ enabledModules: tenant.enabledModules });
}

export async function PATCH(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { enabledModules } = await req.json();
  if (!Array.isArray(enabledModules)) {
    return NextResponse.json({ error: "enabledModules must be an array" }, { status: 400 });
  }

  const tenant = await storage.updateTenant(session.user.tenantId, { enabledModules });

  await audit(
    session.user.tenantId,
    session.user.id,
    "UPDATE",
    "Tenant",
    session.user.tenantId,
    `Updated enabled modules: ${enabledModules.join(", ")}`,
  );

  return NextResponse.json({ enabledModules: tenant?.enabledModules });
}
