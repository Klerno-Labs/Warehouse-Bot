import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { LandedCostService } from "@server/landed-cost-vmi";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CalculateLandedCostSchema = z.object({
  purchaseOrderId: z.string().optional(),
  templateId: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    itemSku: z.string(),
    quantity: z.number().min(1),
    unitValue: z.number().min(0),
    weight: z.number().optional(),
    volume: z.number().optional(),
    htsCode: z.string().optional(),
  })).min(1),
  additionalCosts: z.array(z.object({
    name: z.string(),
    type: z.enum(["FREIGHT", "DUTY", "CUSTOMS", "INSURANCE", "HANDLING", "OTHER"]),
    amount: z.number().min(0),
    allocateBy: z.enum(["VALUE", "QUANTITY", "WEIGHT", "VOLUME", "EQUAL"]),
  })).optional(),
  currency: z.string().default("USD"),
  exchangeRate: z.number().default(1),
});

/**
 * Landed Cost API
 *
 * GET /api/landed-cost/templates - Get templates
 * GET /api/landed-cost/hts?q=xxx - HTS code lookup
 * POST /api/landed-cost/calculate - Calculate landed cost
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "templates";

    const service = new LandedCostService(context.user.tenantId);

    if (view === "hts") {
      const query = searchParams.get("q") || "";
      const results = await service.lookupHTSCode({
        description: query,
      });
      return NextResponse.json({ results });
    }

    const templates = await service.getTemplates();
    return NextResponse.json({ templates });
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

    const body = await validateBody(req, CalculateLandedCostSchema);
    if (body instanceof NextResponse) return body;

    const service = new LandedCostService(context.user.tenantId);

    const calculation = await service.calculateLandedCost({
      purchaseOrderId: body.purchaseOrderId,
      templateId: body.templateId,
      lines: body.lines,
      additionalCosts: body.additionalCosts,
      currency: body.currency,
      exchangeRate: body.exchangeRate,
    });

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
