import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const purchaseOrderId = searchParams.get("purchaseOrderId");

  let receipts = await storage.getReceiptsByTenant(session.user.tenantId);

  // Apply filters
  if (purchaseOrderId) {
    receipts = receipts.filter((r) => r.purchaseOrderId === purchaseOrderId);
  }

  return NextResponse.json({ receipts });
}
