import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { ReorderService } from "@server/reorder";

/**
 * Automated Reorder Suggestions API
 *
 * GET /api/inventory/reorder
 * - Get reorder suggestions for all items
 *
 * GET /api/inventory/reorder/:itemId
 * - Get reorder suggestion for specific item
 *
 * POST /api/inventory/reorder/create-po
 * - Create purchase order from selected suggestions
 */

const createPOSchema = z.object({
  siteId: z.string(),
  supplierId: z.string(),
  itemIds: z.array(z.string()),
});

// Get reorder suggestions
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const itemId = searchParams.get("itemId");
    const daysAhead = parseInt(searchParams.get("daysAhead") || "30");

    // Get suggestion for specific item
    if (itemId) {
      const suggestion = await ReorderService.getItemSuggestion(itemId, siteId || undefined);
      if (!suggestion) {
        return NextResponse.json({ error: "Item not found or no suggestion needed" }, { status: 404 });
      }
      return NextResponse.json({ suggestion });
    }

    // Get upcoming reorders
    if (searchParams.get("upcoming") === "true") {
      const suggestions = await ReorderService.getUpcomingReorders(
        context.user.tenantId,
        siteId || undefined,
        daysAhead
      );
      return NextResponse.json({
        suggestions,
        count: suggestions.length,
        daysAhead,
      });
    }

    // Get all reorder suggestions
    const analysis = await ReorderService.generateSuggestions(
      context.user.tenantId,
      siteId || undefined
    );

    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create purchase order from suggestions
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, createPOSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const poId = await ReorderService.createPurchaseOrder(
      context.user.tenantId,
      validatedData.siteId,
      validatedData.supplierId,
      validatedData.itemIds
    );

    return NextResponse.json({
      success: true,
      purchaseOrderId: poId,
      message: "Purchase order created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
