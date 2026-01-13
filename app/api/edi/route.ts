import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { EDIService } from "@server/edi-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ProcessEDISchema = z.object({
  documentType: z.enum(["850", "856", "810", "997"]),
  content: z.string(),
  tradingPartnerId: z.string(),
});

const GenerateEDISchema = z.object({
  documentType: z.enum(["856", "810", "997"]),
  referenceId: z.string(), // Order ID, Invoice ID, etc.
  tradingPartnerId: z.string(),
});

/**
 * EDI (Electronic Data Interchange) API
 *
 * GET /api/edi - List EDI transactions
 * POST /api/edi - Process incoming EDI document
 * PUT /api/edi - Generate outgoing EDI document
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("documentType") || undefined;
    const tradingPartnerId = searchParams.get("tradingPartnerId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const service = new EDIService(context.user.tenantId);
    const transactions = await service.getTransactions({
      documentType,
      tradingPartnerId,
      status,
      limit,
    });

    return NextResponse.json({
      transactions,
      count: transactions.length,
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

    const body = await validateBody(req, ProcessEDISchema);
    if (body instanceof NextResponse) return body;

    const service = new EDIService(context.user.tenantId);

    const result = await service.processIncoming({
      documentType: body.documentType,
      content: body.content,
      tradingPartnerId: body.tradingPartnerId,
    });

    await createAuditLog(
      context,
      "PROCESS",
      "EDIDocument",
      result.transactionId,
      `Processed EDI ${body.documentType} from partner ${body.tradingPartnerId}`
    );

    return NextResponse.json({
      success: true,
      result,
      message: `EDI ${body.documentType} processed successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, GenerateEDISchema);
    if (body instanceof NextResponse) return body;

    const service = new EDIService(context.user.tenantId);

    const result = await service.generateOutgoing({
      documentType: body.documentType,
      referenceId: body.referenceId,
      tradingPartnerId: body.tradingPartnerId,
    });

    await createAuditLog(
      context,
      "GENERATE",
      "EDIDocument",
      result.transactionId,
      `Generated EDI ${body.documentType} for partner ${body.tradingPartnerId}`
    );

    return NextResponse.json({
      success: true,
      result,
      document: result.content,
      message: `EDI ${body.documentType} generated successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
