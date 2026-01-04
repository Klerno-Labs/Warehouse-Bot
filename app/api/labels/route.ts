import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { LabelService } from "@server/labels";

/**
 * Labels & Packing Slips API
 *
 * GET /api/labels/shipping?orderId=xxx&type=purchase
 * - Generate shipping label for an order
 *
 * GET /api/labels/packing?orderId=xxx&type=production
 * - Generate packing slip for an order
 *
 * POST /api/labels/bulk
 * - Generate multiple labels at once
 *
 * GET /api/labels/return?orderId=xxx
 * - Generate return label
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const labelType = searchParams.get("type");
    const action = searchParams.get("action"); // "shipping", "packing", "return"

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID required" },
        { status: 400 }
      );
    }

    // Generate return label
    if (action === "return") {
      const originalLabel = await LabelService.generateShippingLabel(
        orderId,
        context.user.tenantId
      );
      const returnLabel = LabelService.generateReturnLabel(originalLabel);
      return NextResponse.json(returnLabel);
    }

    // Generate packing slip
    if (action === "packing") {
      const orderType = labelType === "sales" ? "sales" : "production";
      const packingSlip = await LabelService.generatePackingSlip(
        orderId,
        context.user.tenantId,
        orderType
      );
      return NextResponse.json(packingSlip);
    }

    // Generate shipping label (default)
    const label = await LabelService.generateShippingLabel(
      orderId,
      context.user.tenantId
    );

    return NextResponse.json(label);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await req.json();
    const { action, orderIds, orderId, totalBoxes } = body;

    // Generate bulk labels
    if (action === "bulk" && orderIds) {
      const labels = await LabelService.generateBulkLabels(
        orderIds,
        context.user.tenantId
      );

      return NextResponse.json({
        success: true,
        labels,
        count: labels.length,
      });
    }

    // Generate box labels
    if (action === "boxes" && orderId && totalBoxes) {
      const baseLabel = await LabelService.generateShippingLabel(
        orderId,
        context.user.tenantId
      );
      const boxLabels = LabelService.generateBoxLabels(baseLabel, totalBoxes);

      return NextResponse.json({
        success: true,
        labels: boxLabels,
        count: boxLabels.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
