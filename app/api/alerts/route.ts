import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { AlertService } from "@server/alerts";

/**
 * Alerts & Monitoring API
 *
 * GET /api/alerts
 * - Get all active alerts for the tenant
 *
 * POST /api/alerts/check
 * - Manually trigger alert checks
 *
 * POST /api/alerts/:id/acknowledge
 * - Acknowledge an alert
 *
 * POST /api/alerts/:id/resolve
 * - Resolve an alert
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const severity = searchParams.get("severity"); // "info", "warning", "critical"
    const type = searchParams.get("type");
    const resolved = searchParams.get("resolved") === "true";

    // Check all alerts
    const alerts = await AlertService.checkAlerts(context.user.tenantId, siteId);

    // Filter by severity
    let filteredAlerts = alerts;
    if (severity) {
      filteredAlerts = filteredAlerts.filter((a) => a.severity === severity);
    }

    // Filter by type
    if (type) {
      filteredAlerts = filteredAlerts.filter((a) => a.type === type);
    }

    // Filter by resolved status
    filteredAlerts = filteredAlerts.filter((a) => a.resolved === resolved);

    return NextResponse.json({
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      criticalCount: filteredAlerts.filter((a) => a.severity === "critical").length,
      warningCount: filteredAlerts.filter((a) => a.severity === "warning").length,
      infoCount: filteredAlerts.filter((a) => a.severity === "info").length,
    });
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
    const alertId = searchParams.get("id");

    if (action === "check") {
      // Manually trigger alert checks
      const body = await req.json();
      const { siteId } = body;

      const alerts = await AlertService.checkAlerts(context.user.tenantId, siteId);

      return NextResponse.json({
        success: true,
        message: `Checked alerts, found ${alerts.length} active alerts`,
        alerts,
      });
    }

    if (action === "acknowledge" && alertId) {
      const result = await AlertService.acknowledgeAlert(alertId, context.user.id);
      return NextResponse.json(result);
    }

    if (action === "resolve" && alertId) {
      const result = await AlertService.resolveAlert(alertId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
