import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LpnService } from "@server/lpn-compliance";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateLpnSchema = z.object({
  type: z.enum(["PALLET", "CASE", "TOTE", "CONTAINER", "CARTON"]),
  contents: z.array(z.object({
    itemId: z.string(),
    itemSku: z.string(),
    itemName: z.string().optional(),
    quantity: z.number().min(1),
    lotNumber: z.string().optional(),
    serialNumbers: z.array(z.string()).optional(),
  })).optional(),
  locationId: z.string().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    weight: z.number(),
  }).optional(),
  parentLpn: z.string().optional(),
});

const AddToLpnSchema = z.object({
  lpnNumber: z.string(),
  items: z.array(z.object({
    itemId: z.string(),
    itemSku: z.string(),
    quantity: z.number().min(1),
    lotNumber: z.string().optional(),
    serialNumbers: z.array(z.string()).optional(),
  })),
});

const MoveLpnSchema = z.object({
  lpnNumber: z.string(),
  destinationLocationId: z.string(),
});

const NestLpnSchema = z.object({
  childLpn: z.string(),
  parentLpn: z.string(),
});

/**
 * LPN Management API
 *
 * GET /api/lpn - Get LPN dashboard
 * GET /api/lpn?lpn=xxx - Get specific LPN
 * GET /api/lpn?view=location&locationId=xxx - Get LPNs by location
 * POST /api/lpn - Create new LPN
 * POST /api/lpn?action=generate - Generate LPN numbers
 * POST /api/lpn?action=add - Add items to LPN
 * POST /api/lpn?action=remove - Remove items from LPN
 * POST /api/lpn?action=move - Move LPN to location
 * POST /api/lpn?action=nest - Nest LPN in parent
 * POST /api/lpn?action=unnest - Remove LPN from parent
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const lpnNumber = searchParams.get("lpn");
    const locationId = searchParams.get("locationId");
    const itemId = searchParams.get("itemId");

    const service = new LpnService(context.user.tenantId);

    if (lpnNumber) {
      const lpn = await service.getLpn(lpnNumber);
      return NextResponse.json({ lpn });
    }

    if (view === "location" && locationId) {
      const lpns = await service.getLpnsByLocation(locationId);
      return NextResponse.json({ lpns });
    }

    if (view === "item" && itemId) {
      const lpns = await service.getLpnsByItem(itemId);
      return NextResponse.json({ lpns });
    }

    if (view === "history" && lpnNumber) {
      const history = await service.getLpnHistory(lpnNumber);
      return NextResponse.json({ history });
    }

    if (view === "config") {
      const config = await service.getLpnConfiguration();
      return NextResponse.json({ config });
    }

    // Default - dashboard
    const dashboard = await service.getLpnDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new LpnService(context.user.tenantId);

    if (action === "generate") {
      const body = await req.json();
      const lpns = await service.generateLpn({
        type: body.type,
        quantity: body.quantity,
      });

      return NextResponse.json({ lpns });
    }

    if (action === "add") {
      const body = await validateBody(req, AddToLpnSchema);
      if (body instanceof NextResponse) return body;

      const lpn = await service.addToLpn({
        ...body,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "ADD",
        "LPN",
        body.lpnNumber,
        `Added ${body.items.length} items to LPN`
      );

      return NextResponse.json({ success: true, lpn });
    }

    if (action === "remove") {
      const body = await req.json();
      const lpn = await service.removeFromLpn({
        lpnNumber: body.lpnNumber,
        itemId: body.itemId,
        quantity: body.quantity,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "REMOVE",
        "LPN",
        body.lpnNumber,
        `Removed ${body.quantity} of item ${body.itemId} from LPN`
      );

      return NextResponse.json({ success: true, lpn });
    }

    if (action === "move") {
      const body = await validateBody(req, MoveLpnSchema);
      if (body instanceof NextResponse) return body;

      const lpn = await service.moveLpn({
        ...body,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "MOVE",
        "LPN",
        body.lpnNumber,
        `Moved LPN to ${body.destinationLocationId}`
      );

      return NextResponse.json({ success: true, lpn });
    }

    if (action === "nest") {
      const body = await validateBody(req, NestLpnSchema);
      if (body instanceof NextResponse) return body;

      const lpn = await service.nestLpn({
        ...body,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "NEST",
        "LPN",
        body.childLpn,
        `Nested LPN ${body.childLpn} in ${body.parentLpn}`
      );

      return NextResponse.json({ success: true, lpn });
    }

    if (action === "unnest") {
      const body = await req.json();
      const lpn = await service.unnestLpn({
        childLpn: body.childLpn,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "UNNEST",
        "LPN",
        body.childLpn,
        `Unnested LPN from parent`
      );

      return NextResponse.json({ success: true, lpn });
    }

    if (action === "retire") {
      const body = await req.json();
      const lpn = await service.retireLpn({
        lpnNumber: body.lpnNumber,
        reason: body.reason,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "RETIRE",
        "LPN",
        body.lpnNumber,
        `Retired LPN: ${body.reason}`
      );

      return NextResponse.json({ success: true, lpn });
    }

    // Create new LPN
    const body = await validateBody(req, CreateLpnSchema);
    if (body instanceof NextResponse) return body;

    const lpn = await service.createLpn(body);

    await createAuditLog(
      context,
      "CREATE",
      "LPN",
      lpn.lpn,
      `Created ${body.type} LPN`
    );

    return NextResponse.json({
      success: true,
      lpn,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
