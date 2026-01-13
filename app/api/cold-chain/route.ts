import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ColdChainService } from "@server/cold-chain-hazmat";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RecordTemperatureSchema = z.object({
  deviceId: z.string(),
  zoneId: z.string(),
  temperature: z.number(),
  humidity: z.number().optional(),
});

const InvestigateExcursionSchema = z.object({
  excursionId: z.string(),
  rootCause: z.string(),
  correctiveAction: z.string(),
  affectedItemDispositions: z.array(z.object({
    itemId: z.string(),
    disposition: z.enum(["QUARANTINE", "SCRAP", "RELEASE"]),
  })),
});

const GenerateReportSchema = z.object({
  zoneIds: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(["PDF", "EXCEL"]).default("PDF"),
});

/**
 * Cold Chain Management API
 *
 * GET /api/cold-chain - Get dashboard
 * GET /api/cold-chain?view=zones - Get temperature zones
 * GET /api/cold-chain?view=excursions - Get excursions
 * GET /api/cold-chain?view=history - Get temperature history
 * POST /api/cold-chain/temperature - Record temperature reading
 * POST /api/cold-chain?action=investigate - Investigate excursion
 * POST /api/cold-chain?action=report - Generate compliance report
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const zoneId = searchParams.get("zoneId");
    const status = searchParams.get("status");

    const service = new ColdChainService(context.user.tenantId);

    if (view === "zones") {
      const zones = await service.getTemperatureZones();
      return NextResponse.json({ zones });
    }

    if (view === "excursions") {
      const excursions = await service.getExcursions({
        zoneId: zoneId || undefined,
        status: status as any || undefined,
      });
      return NextResponse.json({ excursions });
    }

    if (view === "history") {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const interval = searchParams.get("interval") as "MINUTE" | "HOUR" | "DAY" || "HOUR";

      if (!zoneId || !startDate || !endDate) {
        return NextResponse.json(
          { error: "zoneId, startDate, and endDate are required" },
          { status: 400 }
        );
      }

      const history = await service.getTemperatureHistory({
        zoneId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        interval,
      });
      return NextResponse.json({ history });
    }

    // Default - dashboard
    const dashboard = await service.getColdChainDashboard();
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

    const service = new ColdChainService(context.user.tenantId);

    if (action === "temperature") {
      const body = await validateBody(req, RecordTemperatureSchema);
      if (body instanceof NextResponse) return body;

      const reading = await service.recordTemperatureReading(body);

      if (reading.alertTriggered) {
        await createAuditLog(
          context,
          "ALERT",
          "TemperatureReading",
          reading.id,
          `Temperature ${reading.status}: ${reading.temperature}°C in zone ${body.zoneId}`
        );
      }

      return NextResponse.json({
        success: true,
        reading,
      });
    }

    if (action === "investigate") {
      const body = await validateBody(req, InvestigateExcursionSchema);
      if (body instanceof NextResponse) return body;

      const excursion = await service.investigateExcursion({
        ...body,
        investigatedBy: context.user.id,
      });

      await createAuditLog(
        context,
        "INVESTIGATE",
        "TemperatureExcursion",
        body.excursionId,
        `Investigated excursion: ${body.rootCause}`
      );

      return NextResponse.json({
        success: true,
        excursion,
      });
    }

    if (action === "report") {
      const body = await validateBody(req, GenerateReportSchema);
      if (body instanceof NextResponse) return body;

      const report = await service.generateComplianceReport({
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      });

      await createAuditLog(
        context,
        "GENERATE",
        "ColdChainReport",
        report.reportId,
        `Generated compliance report for ${body.zoneIds.length} zones`
      );

      return NextResponse.json({
        success: true,
        report,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
