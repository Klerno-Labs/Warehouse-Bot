import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

/**
 * Operator Dashboard API
 *
 * Provides simplified metrics for floor workers
 * Focus on assigned tasks and today's accomplishments
 */
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get operator's active jobs
    const myActiveJobs = await prisma.job.count({
      where: {
        tenantId: context.user.tenantId,
        assignedToUserId: context.user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    // Get jobs completed today
    const jobsCompletedToday = await prisma.job.count({
      where: {
        tenantId: context.user.tenantId,
        assignedToUserId: context.user.id,
        status: "COMPLETED",
        completedAt: { gte: today },
      },
    });

    // Get items processed today (from job lines)
    const itemsProcessed = await prisma.jobLine.aggregate({
      where: {
        job: {
          tenantId: context.user.tenantId,
          assignedToUserId: context.user.id,
        },
        completedAt: { gte: today },
      },
      _sum: {
        qtyCompleted: true,
      },
    });

    // Get pending cycle counts assigned to user
    const pendingCycleCounts = await prisma.cycleCount.count({
      where: {
        tenantId: context.user.tenantId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        // Would need to add assignedToUserId to CycleCount model
      },
    });

    // Get active job details
    const activeJobs = await prisma.job.findMany({
      where: {
        tenantId: context.user.tenantId,
        assignedToUserId: context.user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        lines: true,
      },
      orderBy: {
        scheduledDate: "asc",
      },
      take: 10,
    });

    const formattedJobs = activeJobs.map((job) => {
      const totalQty = job.lines.reduce((sum, line) => sum + line.qtyOrdered, 0);
      const completedQty = job.lines.reduce((sum, line) => sum + line.qtyCompleted, 0);
      const progress = totalQty > 0 ? (completedQty / totalQty) * 100 : 0;

      return {
        id: job.id,
        jobNumber: job.jobNumber,
        description: job.description || "No description",
        status: job.status,
        progress: Math.round(progress),
        dueDate: job.scheduledDate || new Date(),
      };
    });

    return NextResponse.json({
      stats: {
        myActiveJobs,
        jobsCompletedToday,
        itemsProcessedToday: Math.round(itemsProcessed._sum.qtyCompleted || 0),
        pendingCycleCounts,
      },
      activeJobs: formattedJobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
