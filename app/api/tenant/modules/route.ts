import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const tenant = await storage.getTenant(context.user.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ enabledModules: tenant.enabledModules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { enabledModules } = await req.json();
    if (!Array.isArray(enabledModules)) {
      return NextResponse.json({ error: "enabledModules must be an array" }, { status: 400 });
    }

    const tenant = await storage.updateTenant(context.user.tenantId, { enabledModules });

    await audit(
      context.user.tenantId,
      context.user.id,
      "UPDATE",
      "Tenant",
      context.user.tenantId,
      `Updated enabled modules: ${enabledModules.join(", ")}`,
    );

    return NextResponse.json({ enabledModules: tenant?.enabledModules });
  } catch (error) {
    return handleApiError(error);
  }
}
