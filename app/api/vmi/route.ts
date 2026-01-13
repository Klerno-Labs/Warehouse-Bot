import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { VMIService, ConsignmentService } from "@server/landed-cost-vmi";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateProgramSchema = z.object({
  name: z.string().min(1),
  supplierId: z.string(),
  parameters: z.object({
    minStockLevel: z.number().min(1),
    maxStockLevel: z.number().min(1),
    leadTimeDays: z.number().min(0),
    reviewFrequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY"]),
    autoReplenish: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    approvalThreshold: z.number().min(0).default(5000),
  }),
  items: z.array(z.object({
    itemId: z.string(),
    targetMin: z.number().min(0),
    targetMax: z.number().min(0),
  })).min(1),
});

/**
 * Vendor Managed Inventory API
 *
 * GET /api/vmi - Get VMI programs
 * GET /api/vmi/analytics - Get VMI analytics
 * GET /api/vmi/supplier/:supplierId - Get supplier dashboard
 * POST /api/vmi - Create VMI program
 * POST /api/vmi/replenishment - Run auto-replenishment
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const supplierId = searchParams.get("supplierId");

    const service = new VMIService(context.user.tenantId);

    if (view === "analytics") {
      const period = (searchParams.get("period") || "MONTH") as "MONTH" | "QUARTER" | "YEAR";
      const analytics = await service.getVMIAnalytics({ period });
      return NextResponse.json({ analytics });
    }

    if (supplierId) {
      const dashboard = await service.getSupplierDashboard(supplierId);
      return NextResponse.json({ dashboard });
    }

    const status = searchParams.get("status") as any;
    const programs = await service.getPrograms({ status, supplierId });

    return NextResponse.json({
      programs,
      summary: {
        total: programs.length,
        active: programs.filter((p) => p.status === "ACTIVE").length,
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

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Purchasing"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new VMIService(context.user.tenantId);

    if (action === "replenishment") {
      const result = await service.runAutoReplenishment();

      await createAuditLog(
        context,
        "RUN",
        "VMIReplenishment",
        `batch-${Date.now()}`,
        `Auto-replenishment: ${result.requestsCreated} requests, $${result.totalValue}`
      );

      return NextResponse.json({
        success: true,
        result,
      });
    }

    const body = await validateBody(req, CreateProgramSchema);
    if (body instanceof NextResponse) return body;

    const program = await service.createProgram({
      name: body.name,
      supplierId: body.supplierId,
      parameters: body.parameters,
      items: body.items,
    });

    await createAuditLog(
      context,
      "CREATE",
      "VMIProgram",
      program.id,
      `Created VMI program ${body.name}`
    );

    return NextResponse.json({
      success: true,
      program,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
