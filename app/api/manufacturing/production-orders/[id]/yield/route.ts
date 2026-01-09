import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { calculateYield } from "@server/manufacturing";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawOrder = await storage.getProductionOrderById(params.id);
    const order = await requireTenantResource(context, rawOrder, "Production order");
    if (order instanceof NextResponse) return order;

    // Calculate yield metrics
    const yieldAnalysis = await calculateYield(storage.prisma, params.id);

    return NextResponse.json({ yieldAnalysis });
  } catch (error) {
    return handleApiError(error);
  }
}
