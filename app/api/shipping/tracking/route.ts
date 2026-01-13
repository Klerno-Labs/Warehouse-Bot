import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { ShippingCarrierService } from "@server/shipping-carriers";

export const dynamic = "force-dynamic";

/**
 * Shipping Tracking API
 *
 * GET /api/shipping/tracking?trackingNumber=xxx&carrier=xxx - Get tracking info
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber");
    const carrier = searchParams.get("carrier") as "UPS" | "FEDEX" | "USPS" | "DHL" | null;

    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { error: "trackingNumber and carrier are required" },
        { status: 400 }
      );
    }

    const service = new ShippingCarrierService(context.user.tenantId);
    const tracking = await service.getTracking(carrier, trackingNumber);

    return NextResponse.json({
      tracking,
      trackingNumber,
      carrier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
