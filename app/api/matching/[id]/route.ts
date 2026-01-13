import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ThreeWayMatchingService } from "@server/three-way-matching";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ApproveInvoiceSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "HOLD"]),
  reason: z.string().optional(),
  overrideDiscrepancies: z.boolean().default(false),
});

const SchedulePaymentSchema = z.object({
  paymentDate: z.string(),
  paymentMethod: z.enum(["CHECK", "ACH", "WIRE", "CARD"]).default("ACH"),
  notes: z.string().optional(),
});

/**
 * Invoice Detail & Actions API
 *
 * GET /api/matching/:id - Get invoice details with match result
 * PUT /api/matching/:id - Approve/Reject/Hold invoice
 * POST /api/matching/:id - Schedule payment
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { id } = await params;
    const service = new ThreeWayMatchingService(context.user.tenantId);

    const invoice = await service.getInvoiceWithMatchDetails(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const body = await validateBody(req, ApproveInvoiceSchema);
    if (body instanceof NextResponse) return body;

    const service = new ThreeWayMatchingService(context.user.tenantId);

    const result = await service.processInvoiceAction({
      invoiceId: id,
      action: body.action,
      reason: body.reason,
      overrideDiscrepancies: body.overrideDiscrepancies,
      userId: context.user.id,
    });

    await createAuditLog(
      context,
      body.action,
      "Invoice",
      id,
      `${body.action} invoice${body.reason ? `: ${body.reason}` : ""}`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `Invoice ${body.action.toLowerCase()}ed`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;
    const body = await validateBody(req, SchedulePaymentSchema);
    if (body instanceof NextResponse) return body;

    const service = new ThreeWayMatchingService(context.user.tenantId);

    const payment = await service.schedulePayment({
      invoiceId: id,
      paymentDate: new Date(body.paymentDate),
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      scheduledBy: context.user.id,
    });

    await createAuditLog(
      context,
      "SCHEDULE_PAYMENT",
      "Invoice",
      id,
      `Scheduled ${body.paymentMethod} payment for ${body.paymentDate}`
    );

    return NextResponse.json({
      success: true,
      payment,
      message: "Payment scheduled successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
