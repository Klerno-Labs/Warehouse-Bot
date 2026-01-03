import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError, requireRole } from "@app/api/_utils/middleware";
import { applyInventoryEvent, convertQuantity } from "@server/inventory";

// Simplified transaction schema for the /txns/new page
const createTransactionSchema = z.object({
  type: z.enum(["RECEIVE", "MOVE", "ISSUE", "ADJUST", "COUNT"]),
  itemId: z.string(),
  qty: z.number().positive(),
  uomId: z.string(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  direction: z.enum(["ADD", "SUBTRACT"]).optional(),
  note: z.string().optional(),
});

/**
 * Simplified transaction API endpoint
 * This is an alias/simplified version of /api/inventory/events
 * Used by the /txns/new page for quick inventory movements
 */
export async function POST(req: Request) {
  try {
    // Use new middleware for authentication
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Parse and validate request body
    const body = await req.json();
    const payload = createTransactionSchema.parse(body);

    // Get the first site ID (simplified - assumes single-site for quick transactions)
    const siteId = context.user.siteIds[0];
    if (!siteId) {
      return NextResponse.json({ error: "No site access" }, { status: 403 });
    }

    // Check permissions based on transaction type
    if (payload.type === "ADJUST") {
      const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
      if (roleCheck instanceof NextResponse) return roleCheck;
    }
    if (payload.type === "COUNT") {
      const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
      if (roleCheck instanceof NextResponse) return roleCheck;
    }

    // Validate item ownership
    const item = await storage.getItemById(payload.itemId);
    if (!item || item.tenantId !== context.user.tenantId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Validate locations if provided
    const validateLocation = async (locationId?: string) => {
      if (!locationId) return null;
      const location = await storage.getLocationById(locationId);
      if (!location || location.tenantId !== context.user.tenantId) {
        return { error: "Location not found" };
      }
      if (location.siteId !== siteId) {
        return { error: "Location must be in the same site" };
      }
      return null;
    };

    if (payload.fromLocationId) {
      const error = await validateLocation(payload.fromLocationId);
      if (error) return NextResponse.json(error, { status: 400 });
    }

    if (payload.toLocationId) {
      const error = await validateLocation(payload.toLocationId);
      if (error) return NextResponse.json(error, { status: 400 });
    }

    // UOM is passed as enum value directly (payload.uomId is actually the UOM enum value)
    const uomEntered = payload.uomId as any; // UOM enum value

    // Convert quantity to base units
    const { qtyBase } = await convertQuantity(
      prisma,
      context.user.tenantId,
      payload.itemId,
      payload.qty,
      uomEntered,
    );

    // Map transaction type to inventory event type
    // Note: ISSUE is mapped to CONSUME for manufacturing context
    const eventTypeMapping: Record<typeof payload.type, any> = {
      RECEIVE: "RECEIVE",
      MOVE: "MOVE",
      ISSUE: "CONSUME", // Map ISSUE to CONSUME (manufacturing consumption)
      ADJUST: "ADJUST",
      COUNT: "COUNT",
    };
    const eventType = eventTypeMapping[payload.type];
    let finalQtyBase = qtyBase;

    // Handle ADJUST direction
    if (payload.type === "ADJUST" && payload.direction === "SUBTRACT") {
      finalQtyBase = -qtyBase;
    }

    // Create the inventory event
    await applyInventoryEvent(prisma, context.user, {
      tenantId: context.user.tenantId,
      siteId,
      eventType,
      itemId: payload.itemId,
      qtyEntered: payload.qty,
      uomEntered,
      qtyBase: finalQtyBase,
      fromLocationId: payload.fromLocationId || null,
      toLocationId: payload.toLocationId || null,
      workcellId: null,
      referenceId: null,
      reasonCodeId: null,
      notes: payload.note || null,
      createdByUserId: context.user.id,
      deviceId: null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
