import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireSiteAccess } from "@app/api/_utils/middleware";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId") || context.user.siteIds[0];

  const siteCheck = requireSiteAccess(context, siteId);
  if (siteCheck instanceof NextResponse) return siteCheck;

  const balances = await storage.getInventoryBalancesBySite(siteId);
  return NextResponse.json(balances.filter((b) => b.tenantId === context.user.tenantId));
}
