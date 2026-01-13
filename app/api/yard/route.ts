import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { YardManagementService } from "@server/labor-yard-management";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CheckInTrailerSchema = z.object({
  trailerNumber: z.string().min(1),
  carrier: z.string().min(1),
  type: z.enum(["INBOUND", "OUTBOUND"]),
  appointmentId: z.string().optional(),
  sealNumber: z.string().optional(),
});

const CreateAppointmentSchema = z.object({
  type: z.enum(["INBOUND", "OUTBOUND"]),
  carrier: z.string().min(1),
  scheduledTime: z.string(),
  estimatedDuration: z.number().min(15).default(60),
  purchaseOrderIds: z.array(z.string()).optional(),
  salesOrderIds: z.array(z.string()).optional(),
  preferredDock: z.string().optional(),
});

/**
 * Yard Management API
 *
 * GET /api/yard - Get yard overview (docks, trailers, appointments)
 * GET /api/yard/analytics - Get yard analytics
 * POST /api/yard/check-in - Check in a trailer
 * POST /api/yard/appointments - Create appointment
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "overview";

    const service = new YardManagementService(context.user.tenantId);

    if (view === "analytics") {
      const period = (searchParams.get("period") || "DAY") as "DAY" | "WEEK" | "MONTH";
      const analytics = await service.getYardAnalytics(period);
      return NextResponse.json({ analytics });
    }

    const [docks, trailers, yardLocations, appointments] = await Promise.all([
      service.getDockDoors(),
      service.getTrailers(),
      service.getYardLocations(),
      service.getAppointments({ date: new Date() }),
    ]);

    return NextResponse.json({
      docks,
      trailers,
      yardLocations,
      appointments,
      summary: {
        availableDocks: docks.filter((d) => d.status === "AVAILABLE").length,
        occupiedDocks: docks.filter((d) => d.status === "OCCUPIED").length,
        trailersOnSite: trailers.length,
        todayAppointments: appointments.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "check-in";

    const service = new YardManagementService(context.user.tenantId);

    if (action === "appointment") {
      const body = await validateBody(req, CreateAppointmentSchema);
      if (body instanceof NextResponse) return body;

      const appointment = await service.createAppointment({
        type: body.type,
        carrier: body.carrier,
        scheduledTime: new Date(body.scheduledTime),
        estimatedDuration: body.estimatedDuration,
        purchaseOrderIds: body.purchaseOrderIds,
        salesOrderIds: body.salesOrderIds,
        preferredDock: body.preferredDock,
      });

      await createAuditLog(
        context,
        "CREATE",
        "Appointment",
        appointment.id,
        `Created ${body.type} appointment for ${body.carrier}`
      );

      return NextResponse.json({
        success: true,
        appointment,
      });
    }

    // Default: Check in trailer
    const body = await validateBody(req, CheckInTrailerSchema);
    if (body instanceof NextResponse) return body;

    const trailer = await service.checkInTrailer({
      trailerNumber: body.trailerNumber,
      carrier: body.carrier,
      type: body.type,
      appointmentId: body.appointmentId,
      sealNumber: body.sealNumber,
    });

    await createAuditLog(
      context,
      "CHECK_IN",
      "Trailer",
      trailer.id,
      `Checked in trailer ${body.trailerNumber} for ${body.carrier}`
    );

    return NextResponse.json({
      success: true,
      trailer,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
