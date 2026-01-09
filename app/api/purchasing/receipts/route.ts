import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    let receipts = await storage.getReceiptsByTenant(context.user.tenantId);

    // Apply filters
    if (purchaseOrderId) {
      receipts = receipts.filter((r) => r.purchaseOrderId === purchaseOrderId);
    }

    return NextResponse.json({ receipts });
  } catch (error) {
    return handleApiError(error);
  }
}
