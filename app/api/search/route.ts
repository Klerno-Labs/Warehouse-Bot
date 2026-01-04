import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { SearchService } from "@server/search";

/**
 * Advanced Search API
 *
 * GET /api/search?type=items&query=xxx&filters=[...]&sort=name:asc&page=1&limit=50
 * - Search with advanced filters
 *
 * GET /api/search/global?q=xxx
 * - Global search across all entities
 *
 * GET /api/search/saved
 * - Get saved searches
 *
 * POST /api/search/save
 * - Save a search
 *
 * DELETE /api/search/saved/:id
 * - Delete a saved search
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "items";
    const query = searchParams.get("query") || searchParams.get("q") || "";
    const filtersParam = searchParams.get("filters");
    const sortParam = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Parse filters
    const filters = filtersParam ? JSON.parse(filtersParam) : [];

    // Parse sort
    let sort;
    if (sortParam) {
      const [field, direction] = sortParam.split(":");
      sort = { field, direction: direction as "asc" | "desc" };
    }

    const options = { query, filters, sort, page, limit };

    let results;

    // Global search
    if (type === "global") {
      results = await SearchService.globalSearch(context.user.tenantId, query, 10);
      return NextResponse.json(results);
    }

    // Entity-specific search
    switch (type) {
      case "items":
        results = await SearchService.searchItems(context.user.tenantId, options);
        break;
      case "events":
        results = await SearchService.searchEvents(context.user.tenantId, options);
        break;
      case "jobs":
        results = await SearchService.searchJobs(context.user.tenantId, options);
        break;
      default:
        return NextResponse.json({ error: "Invalid search type" }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await req.json();
    const { name, entityType, options, description } = body;

    const searchId = await SearchService.saveSearch(
      context.user.id,
      name,
      entityType,
      options,
      description
    );

    return NextResponse.json({
      success: true,
      searchId,
      message: "Search saved successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const searchId = searchParams.get("id");

    if (!searchId) {
      return NextResponse.json({ error: "Search ID required" }, { status: 400 });
    }

    await SearchService.deleteSavedSearch(searchId);

    return NextResponse.json({
      success: true,
      message: "Search deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
