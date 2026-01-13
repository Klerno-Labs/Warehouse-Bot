import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireSiteAccess, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createJobSchema } from "@shared/jobs";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const assignedToMe = searchParams.get("assignedToMe") === "true";

  let jobs = await storage.getJobsByTenant(context.user.tenantId);

  // Filter by site
  if (siteId) {
    const siteCheck = requireSiteAccess(context, siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;
    jobs = jobs.filter((j) => j.siteId === siteId);
  } else {
    // Only show jobs for sites user has access to
    jobs = jobs.filter((j) => context.user.siteIds.includes(j.siteId));
  }

  // Filter by status
  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }

  // Filter by type
  if (type) {
    jobs = jobs.filter((j) => j.type === type);
  }

  // Filter by assigned to current user
  if (assignedToMe) {
    jobs = jobs.filter((j) => j.assignedToUserId === context.user.id);
  }

  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  try {
    const payload = await validateBody(req, createJobSchema);
    if (payload instanceof NextResponse) return payload;

    const siteCheck = requireSiteAccess(context, payload.siteId);
    if (siteCheck instanceof NextResponse) return siteCheck;

    // Get next job number
    const jobNumber = await storage.getNextJobNumber(context.user.tenantId);

    // Create the job
    const job = await storage.createJob({
      tenantId: context.user.tenantId,
      siteId: payload.siteId,
      workcellId: null,
      routingId: null,
      jobNumber,
      type: payload.type || null,
      status: "PENDING",
      description: payload.description || null,
      assignedToUserId: payload.assignedToUserId || null,
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      createdByUserId: context.user.id,
    });

    // Create lines if provided
    if (payload.lines && payload.lines.length > 0) {
      for (const line of payload.lines) {
        if (!line.itemId) continue; // Skip lines without itemId

        await storage.createJobLine({
          jobId: job.id,
          itemId: line.itemId,
          fromLocationId: line.fromLocationId || null,
          toLocationId: line.toLocationId || null,
          qtyOrdered: line.qtyOrdered,
          qtyCompleted: 0,
          qtyBase: line.qtyOrdered,
          status: "PENDING",
          notes: line.notes || null,
          completedByUserId: null,
          completedAt: null,
        });
      }
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
