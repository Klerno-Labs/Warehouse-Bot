import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { LoadPlanningService } from "@server/cartonization-load-planning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateLoadPlanSchema = z.object({
  shipmentIds: z.array(z.string()),
  vehicleType: z.enum(["VAN", "BOX_TRUCK", "SEMI_TRAILER", "FLATBED", "REFRIGERATED"]),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  optimizeFor: z.enum(["SPACE", "WEIGHT", "DELIVERY_SEQUENCE"]).default("SPACE"),
  constraints: z.object({
    maxStops: z.number().optional(),
    maxDistance: z.number().optional(),
    preferredRouteType: z.enum(["FASTEST", "SHORTEST", "ECONOMICAL"]).optional(),
  }).optional(),
});

const SuggestVehicleSchema = z.object({
  totalWeight: z.number(),
  totalVolume: z.number(),
  hasHazmat: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  deliveryCount: z.number().optional(),
});

const VehicleTypeSchema = z.object({
  type: z.enum(["VAN", "BOX_TRUCK", "SEMI_TRAILER", "FLATBED", "REFRIGERATED"]),
  name: z.string(),
  maxWeight: z.number(),
  maxVolume: z.number(),
  length: z.number(),
  width: z.number(),
  height: z.number(),
  costPerMile: z.number(),
  isActive: z.boolean().default(true),
});

/**
 * Load Planning API
 *
 * GET /api/load-planning - Get load plans
 * GET /api/load-planning?view=vehicles - Get vehicle types
 * POST /api/load-planning - Create load plan
 * POST /api/load-planning?action=suggest-vehicle - Suggest vehicle
 * POST /api/load-planning?action=optimize - Optimize load
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const id = searchParams.get("id");
    const status = searchParams.get("status");

    const service = new LoadPlanningService(context.user.tenantId);

    if (id) {
      const loadPlan = await service.getLoadPlan(id);
      return NextResponse.json({ loadPlan });
    }

    if (view === "vehicles") {
      const vehicles = await service.getVehicleTypes();
      return NextResponse.json({ vehicles });
    }

    if (view === "analytics") {
      const analytics = await service.getLoadPlanningAnalytics();
      return NextResponse.json({ analytics });
    }

    if (view === "dashboard") {
      const dashboard = await service.getLoadPlanningDashboard();
      return NextResponse.json({ dashboard });
    }

    const loadPlans = await service.getLoadPlans({
      status: status as any || undefined,
    });
    return NextResponse.json({ loadPlans });
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

    const service = new LoadPlanningService(context.user.tenantId);

    if (action === "suggest-vehicle") {
      const body = await validateBody(req, SuggestVehicleSchema);
      if (body instanceof NextResponse) return body;

      const suggestions = await service.suggestVehicle(body);
      return NextResponse.json({ suggestions });
    }

    if (action === "vehicle-type") {
      const body = await validateBody(req, VehicleTypeSchema);
      if (body instanceof NextResponse) return body;

      const vehicleType = await service.createVehicleType(body);

      await createAuditLog(
        context,
        "CREATE",
        "VehicleType",
        vehicleType.type,
        `Created vehicle type ${body.name}`
      );

      return NextResponse.json({
        success: true,
        vehicleType,
      });
    }

    if (action === "optimize") {
      const body = await req.json();
      const optimized = await service.optimizeLoadPlan(body.loadPlanId);

      await createAuditLog(
        context,
        "OPTIMIZE",
        "LoadPlan",
        body.loadPlanId,
        `Optimized load plan`
      );

      return NextResponse.json({
        success: true,
        loadPlan: optimized,
      });
    }

    if (action === "dispatch") {
      const body = await req.json();
      const loadPlan = await service.dispatchLoad(body.loadPlanId, context.user.id);

      await createAuditLog(
        context,
        "DISPATCH",
        "LoadPlan",
        body.loadPlanId,
        `Dispatched load plan`
      );

      return NextResponse.json({
        success: true,
        loadPlan,
      });
    }

    // Create load plan
    const body = await validateBody(req, CreateLoadPlanSchema);
    if (body instanceof NextResponse) return body;

    const loadPlan = await service.createLoadPlan({
      ...body,
      createdBy: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "LoadPlan",
      loadPlan.id,
      `Created load plan for ${body.shipmentIds.length} shipments`
    );

    return NextResponse.json({
      success: true,
      loadPlan,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
