import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ConsignmentService } from "@server/landed-cost-vmi";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateAgreementSchema = z.object({
  type: z.enum(["VENDOR_CONSIGNMENT", "CUSTOMER_CONSIGNMENT"]),
  partnerId: z.string(),
  terms: z.object({
    paymentTrigger: z.enum(["SALE", "USAGE", "PERIOD_END"]),
    settlementFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    insuranceResponsibility: z.enum(["OWNER", "HOLDER"]),
  }),
  items: z.array(z.object({
    itemId: z.string(),
    initialQuantity: z.number().min(0),
    unitCost: z.number().min(0),
    location: z.string(),
  })).min(1),
});

const RecordTransactionSchema = z.object({
  agreementId: z.string(),
  type: z.enum(["RECEIPT", "CONSUMPTION", "RETURN", "ADJUSTMENT"]),
  itemId: z.string(),
  quantity: z.number(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Consignment Inventory API
 *
 * GET /api/consignment - Get consignment agreements
 * GET /api/consignment/:id/balance - Get consignment balance
 * POST /api/consignment - Create agreement
 * POST /api/consignment/transaction - Record transaction
 * POST /api/consignment/settlement - Generate settlement
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const agreementId = searchParams.get("agreementId");

    const service = new ConsignmentService(context.user.tenantId);

    if (agreementId) {
      const balance = await service.getConsignmentBalance(agreementId);
      return NextResponse.json({ balance });
    }

    const type = searchParams.get("type") as any;
    const partnerId = searchParams.get("partnerId") || undefined;
    const status = searchParams.get("status") as any;

    const agreements = await service.getAgreements({ type, partnerId, status });

    return NextResponse.json({
      agreements,
      summary: {
        total: agreements.length,
        active: agreements.filter((a) => a.status === "ACTIVE").length,
        vendor: agreements.filter((a) => a.type === "VENDOR_CONSIGNMENT").length,
        customer: agreements.filter((a) => a.type === "CUSTOMER_CONSIGNMENT").length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new ConsignmentService(context.user.tenantId);

    if (action === "transaction") {
      const body = await validateBody(req, RecordTransactionSchema);
      if (body instanceof NextResponse) return body;

      const transaction = await service.recordConsignment({
        agreementId: body.agreementId,
        type: body.type,
        itemId: body.itemId,
        quantity: body.quantity,
        reference: body.reference,
        notes: body.notes,
      });

      await createAuditLog(
        context,
        body.type,
        "ConsignmentTransaction",
        transaction.id,
        `Recorded ${body.type} for ${body.quantity} units`
      );

      return NextResponse.json({
        success: true,
        transaction,
      });
    }

    if (action === "settlement") {
      const body = await req.json();
      const settlement = await service.generateSettlement(
        body.agreementId,
        new Date(body.periodEnd)
      );

      return NextResponse.json({
        success: true,
        settlement,
      });
    }

    const body = await validateBody(req, CreateAgreementSchema);
    if (body instanceof NextResponse) return body;

    const agreement = await service.createAgreement({
      type: body.type,
      partnerId: body.partnerId,
      terms: body.terms,
      items: body.items,
    });

    await createAuditLog(
      context,
      "CREATE",
      "ConsignmentAgreement",
      agreement.id,
      `Created ${body.type} agreement`
    );

    return NextResponse.json({
      success: true,
      agreement,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
