import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ThreeWayMatchingService } from "@server/three-way-matching";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateInvoiceSchema = z.object({
  purchaseOrderId: z.string(),
  receiptId: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  vendorId: z.string(),
  lines: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    description: z.string().optional(),
  })),
  subtotal: z.number(),
  tax: z.number().default(0),
  shipping: z.number().default(0),
  total: z.number(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
});

/**
 * Three-Way Matching API
 *
 * GET /api/matching - Get invoices pending matching
 * POST /api/matching - Create invoice and perform matching
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const vendorId = searchParams.get("vendorId") || undefined;
    const poId = searchParams.get("purchaseOrderId") || undefined;

    const service = new ThreeWayMatchingService(context.user.tenantId);
    const invoices = await service.getInvoices({
      status,
      vendorId,
      purchaseOrderId: poId,
    });

    return NextResponse.json({
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CreateInvoiceSchema);
    if (body instanceof NextResponse) return body;

    const service = new ThreeWayMatchingService(context.user.tenantId);

    const result = await service.createAndMatchInvoice({
      purchaseOrderId: body.purchaseOrderId,
      receiptId: body.receiptId,
      invoiceNumber: body.invoiceNumber,
      invoiceDate: new Date(body.invoiceDate),
      vendorId: body.vendorId,
      lines: body.lines,
      subtotal: body.subtotal,
      tax: body.tax,
      shipping: body.shipping,
      total: body.total,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      paymentTerms: body.paymentTerms,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "Invoice",
      result.invoice.id,
      `Created invoice ${body.invoiceNumber} - Match status: ${result.matchResult.status}`
    );

    return NextResponse.json({
      invoice: result.invoice,
      matchResult: result.matchResult,
      message: result.matchResult.status === "MATCHED"
        ? "Invoice matched successfully"
        : `Invoice has ${result.matchResult.discrepancies.length} discrepancies`,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
