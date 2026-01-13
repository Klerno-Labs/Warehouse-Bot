import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ComplianceService } from "@server/lpn-compliance";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PerformCheckSchema = z.object({
  requirementId: z.string(),
  findings: z.string().optional(),
  status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PENDING_REVIEW", "NOT_APPLICABLE"]),
  evidence: z.array(z.object({
    documentId: z.string(),
    documentName: z.string(),
  })).optional(),
});

const CreateCorrectiveActionSchema = z.object({
  complianceCheckId: z.string(),
  action: z.string(),
  assignedTo: z.string(),
  dueDate: z.string(),
});

const ScheduleAuditSchema = z.object({
  type: z.enum(["INTERNAL", "EXTERNAL", "REGULATORY"]),
  category: z.enum(["FDA", "OSHA", "CUSTOMS", "EPA", "DOT", "ISO", "OTHER"]),
  scheduledDate: z.string(),
  auditor: z.string(),
  scope: z.array(z.string()),
});

const RecordFindingSchema = z.object({
  auditId: z.string(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"]),
  description: z.string(),
  requirement: z.string(),
  correctiveAction: z.string().optional(),
  dueDate: z.string().optional(),
});

const RecordTrainingSchema = z.object({
  trainingId: z.string(),
  userId: z.string(),
  score: z.number().optional(),
  passed: z.boolean(),
  certificateUrl: z.string().optional(),
});

/**
 * Compliance Management API
 *
 * GET /api/compliance - Get compliance dashboard
 * GET /api/compliance?view=requirements - Get compliance requirements
 * GET /api/compliance?view=status - Get current compliance status
 * GET /api/compliance?view=audits - Get audits
 * GET /api/compliance?view=training - Get training requirements
 * GET /api/compliance?view=records - Get training records
 * POST /api/compliance?action=check - Perform compliance check
 * POST /api/compliance?action=corrective - Create corrective action
 * POST /api/compliance?action=audit - Schedule audit
 * POST /api/compliance?action=finding - Record audit finding
 * POST /api/compliance?action=complete-audit - Complete audit
 * POST /api/compliance?action=training - Record training completion
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const category = searchParams.get("category") as any;

    const service = new ComplianceService(context.user.tenantId);

    if (view === "requirements") {
      const requirements = await service.getComplianceRequirements({
        category: category || undefined,
      });
      return NextResponse.json({ requirements });
    }

    if (view === "status") {
      const status = await service.getComplianceStatus({
        category: category || undefined,
      });
      return NextResponse.json({ status });
    }

    if (view === "audits") {
      const status = searchParams.get("status") as any;
      const audits = await service.getAudits({
        status: status || undefined,
        category: category || undefined,
      });
      return NextResponse.json({ audits });
    }

    if (view === "training") {
      const training = await service.getTrainingRequirements();
      return NextResponse.json({ training });
    }

    if (view === "records") {
      const userId = searchParams.get("userId");
      const expired = searchParams.get("expired") === "true";
      const records = await service.getTrainingRecords({
        userId: userId || undefined,
        expired: expired || undefined,
      });
      return NextResponse.json({ records });
    }

    if (view === "expiring") {
      const days = parseInt(searchParams.get("days") || "30");
      const expiring = await service.getExpiringTraining(days);
      return NextResponse.json({ expiring });
    }

    // Default - dashboard
    const dashboard = await service.getComplianceDashboard();
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

    const service = new ComplianceService(context.user.tenantId);

    if (action === "check") {
      const body = await validateBody(req, PerformCheckSchema);
      if (body instanceof NextResponse) return body;

      const check = await service.performComplianceCheck({
        ...body,
        checkedBy: context.user.id,
      });

      await createAuditLog(
        context,
        "CHECK",
        "Compliance",
        body.requirementId,
        `Compliance check: ${body.status}`
      );

      return NextResponse.json({ success: true, check });
    }

    if (action === "corrective") {
      const body = await validateBody(req, CreateCorrectiveActionSchema);
      if (body instanceof NextResponse) return body;

      const check = await service.createCorrectiveAction({
        ...body,
        dueDate: new Date(body.dueDate),
      });

      await createAuditLog(
        context,
        "CREATE",
        "CorrectiveAction",
        body.complianceCheckId,
        `Created corrective action assigned to ${body.assignedTo}`
      );

      return NextResponse.json({ success: true, check });
    }

    if (action === "audit") {
      const body = await validateBody(req, ScheduleAuditSchema);
      if (body instanceof NextResponse) return body;

      const audit = await service.scheduleAudit({
        ...body,
        scheduledDate: new Date(body.scheduledDate),
      });

      await createAuditLog(
        context,
        "SCHEDULE",
        "Audit",
        audit.id,
        `Scheduled ${body.type} audit for ${body.category}`
      );

      return NextResponse.json({ success: true, audit });
    }

    if (action === "finding") {
      const body = await validateBody(req, RecordFindingSchema);
      if (body instanceof NextResponse) return body;

      const audit = await service.recordAuditFinding({
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });

      await createAuditLog(
        context,
        "FINDING",
        "Audit",
        body.auditId,
        `Recorded ${body.severity} finding`
      );

      return NextResponse.json({ success: true, audit });
    }

    if (action === "complete-audit") {
      const body = await req.json();
      const audit = await service.completeAudit({
        auditId: body.auditId,
        overallResult: body.overallResult,
        report: body.report,
      });

      await createAuditLog(
        context,
        "COMPLETE",
        "Audit",
        body.auditId,
        `Completed audit with result: ${body.overallResult}`
      );

      return NextResponse.json({ success: true, audit });
    }

    if (action === "training") {
      const body = await validateBody(req, RecordTrainingSchema);
      if (body instanceof NextResponse) return body;

      const record = await service.recordTrainingCompletion(body);

      await createAuditLog(
        context,
        "COMPLETE",
        "Training",
        body.trainingId,
        `Training completed by ${body.userId}: ${body.passed ? "PASSED" : "FAILED"}`
      );

      return NextResponse.json({ success: true, record });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
