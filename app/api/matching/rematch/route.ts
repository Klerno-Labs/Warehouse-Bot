import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ThreeWayMatchingService } from "@server/three-way-matching";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RematchSchema = z.object({
  invoiceId: z.string(),
  purchaseOrderId: z.string().optional(),
  receiptId: z.string().optional(),
});

/**
 * Invoice Re-matching API
 *
 * POST /api/matching/rematch - Re-run three-way matching
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, RematchSchema);
    if (body instanceof NextResponse) return body;

    const service = new ThreeWayMatchingService(context.user.tenantId);

    const result = await service.rematchInvoice({
      invoiceId: body.invoiceId,
      purchaseOrderId: body.purchaseOrderId,
      receiptId: body.receiptId,
    });

    await createAuditLog(
      context,
      "REMATCH",
      "Invoice",
      body.invoiceId,
      `Re-matched invoice - Status: ${result.status}`
    );

    return NextResponse.json({
      success: true,
      matchResult: result,
      message: result.status === "MATCHED"
        ? "Invoice now matches"
        : `Invoice has ${result.discrepancies.length} discrepancies`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
