import { NextResponse } from "next/server";
import { Uom } from "@prisma/client";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";

/**
 * GET /api/uoms - Fetch all units of measure (enum values)
 * Used by transaction forms and item management
 * Note: UOM is an enum, not a database model
 */
export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // UOM is an enum - return all enum values
    const uoms = Object.values(Uom).map((code) => ({
      id: code,
      code,
      name: code, // Could be expanded with friendly names
    }));

    return NextResponse.json({ uoms });
  } catch (error) {
    return handleApiError(error);
  }
}
