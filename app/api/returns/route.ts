import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ReturnsManagementService } from "@server/returns-management";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateRMASchema = z.object({
  customerId: z.string(),
  originalOrderId: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().min(1),
    returnReason: z.string(),
  })).min(1),
  customerNotes: z.string().optional(),
});

/**
 * Returns Management API
 *
 * GET /api/returns - Get RMAs
 * GET /api/returns/analytics - Get return analytics
 * GET /api/returns/policies - Get return policies
 * POST /api/returns - Create RMA
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    const service = new ReturnsManagementService(context.user.tenantId);

    if (view === "analytics") {
      const period = (searchParams.get("period") || "MONTH") as "WEEK" | "MONTH" | "QUARTER" | "YEAR";
      const analytics = await service.getReturnAnalytics({ period });
      return NextResponse.json({ analytics });
    }

    if (view === "policies") {
      const policies = await service.getReturnPolicies();
      return NextResponse.json({ policies });
    }

    const status = searchParams.get("status") as any;
    const customerId = searchParams.get("customerId") || undefined;

    const rmas = await service.getRMAs({ status, customerId });

    return NextResponse.json({
      rmas,
      summary: {
        total: rmas.length,
        pending: rmas.filter((r) => r.status === "REQUESTED" || r.status === "APPROVED").length,
        completed: rmas.filter((r) => r.status === "COMPLETED").length,
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

    const body = await validateBody(req, CreateRMASchema);
    if (body instanceof NextResponse) return body;

    const service = new ReturnsManagementService(context.user.tenantId);

    const rma = await service.createRMA({
      customerId: body.customerId,
      originalOrderId: body.originalOrderId,
      lines: body.lines,
      customerNotes: body.customerNotes,
    });

    await createAuditLog(
      context,
      "CREATE",
      "RMA",
      rma.id,
      `Created RMA ${rma.rmaNumber} for customer ${body.customerId}`
    );

    return NextResponse.json({
      success: true,
      rma,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
