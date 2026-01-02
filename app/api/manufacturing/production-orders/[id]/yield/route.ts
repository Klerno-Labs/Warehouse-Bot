import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { calculateYield } from "@server/manufacturing";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = await storage.getProductionOrderById(params.id);
    if (!order || order.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

    // Calculate yield metrics
    const yieldAnalysis = await calculateYield(storage.prisma, params.id);

    return NextResponse.json({ yieldAnalysis });
  } catch (error) {
    console.error("Error calculating yield:", error);
    return NextResponse.json(
      { error: "Failed to calculate yield" },
      { status: 500 }
    );
  }
}
