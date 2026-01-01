import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { createJobSchema } from "@shared/jobs";

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const assignedToMe = searchParams.get("assignedToMe") === "true";

  let jobs = await storage.getJobsByTenant(session.user.tenantId);

  // Filter by site
  if (siteId) {
    if (!session.user.siteIds.includes(siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }
    jobs = jobs.filter((j) => j.siteId === siteId);
  } else {
    // Only show jobs for sites user has access to
    jobs = jobs.filter((j) => session.user.siteIds.includes(j.siteId));
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
    jobs = jobs.filter((j) => j.assignedToUserId === session.user.id);
  }

  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = createJobSchema.parse(await req.json());

    if (!session.user.siteIds.includes(payload.siteId)) {
      return NextResponse.json({ error: "Site access denied" }, { status: 403 });
    }

    // Get next job number
    const jobNumber = await storage.getNextJobNumber(session.user.tenantId);

    // Create the job
    const job = await storage.createJob({
      tenantId: session.user.tenantId,
      siteId: payload.siteId,
      jobNumber,
      type: payload.type,
      status: "OPEN",
      priority: payload.priority || "NORMAL",
      description: payload.description || null,
      referenceType: payload.referenceType || null,
      referenceId: payload.referenceId || null,
      assignedToUserId: payload.assignedToUserId || null,
      dueDate: payload.dueDate || null,
      startedAt: null,
      completedAt: null,
      createdByUserId: session.user.id,
    });

    // Create lines if provided
    if (payload.lines && payload.lines.length > 0) {
      let lineNumber = 1;
      for (const line of payload.lines) {
        await storage.createJobLine({
          jobId: job.id,
          tenantId: session.user.tenantId,
          siteId: payload.siteId,
          lineNumber,
          itemId: line.itemId || null,
          fromLocationId: line.fromLocationId || null,
          toLocationId: line.toLocationId || null,
          qtyOrdered: line.qtyOrdered,
          qtyCompleted: 0,
          uomId: line.uomId || null,
          status: "PENDING",
          notes: line.notes || null,
          completedByUserId: null,
          completedAt: null,
        });
        lineNumber++;
      }
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
