import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import type { Department } from "@shared/job-tracking";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Get all production orders with their operations
    const productionOrders = await prisma.productionOrder.findMany({
      where: {
        tenantId: context.user.tenantId,
        status: {
          in: ["PLANNED", "RELEASED", "IN_PROGRESS"],
        },
      },
      include: {
        item: true,
        jobOperations: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });

    // Calculate statistics per department
    const departmentStats: Record<
      Department,
      {
        activeCount: number;
        pendingCount: number;
        completedToday: number;
        avgCycleTime: number; // minutes
      }
    > = {
      PICKING: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      ASSEMBLY: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      PLEATING: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      OVEN: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      LASER: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      QC: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      PACKAGING: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
      SHIPPING: { activeCount: 0, pendingCount: 0, completedToday: 0, avgCycleTime: 0 },
    };

    // Get all operations for stats calculation
    const allOperations = await prisma.jobOperation.findMany({
      where: {
        productionOrder: {
          tenantId: context.user.tenantId,
        },
      },
    });

    // Calculate department statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const op of allOperations) {
      const dept = op.department as Department;
      if (!departmentStats[dept]) continue;

      if (op.status === "IN_PROGRESS" || op.status === "PAUSED") {
        departmentStats[dept].activeCount++;
      } else if (op.status === "PENDING") {
        departmentStats[dept].pendingCount++;
      } else if (op.status === "COMPLETED" && op.actualEnd && new Date(op.actualEnd) >= today) {
        departmentStats[dept].completedToday++;
      }
    }

    // Calculate average cycle times per department
    for (const dept of Object.keys(departmentStats) as Department[]) {
      const completedOps = allOperations.filter(
        (op) =>
          op.department === dept &&
          op.status === "COMPLETED" &&
          op.actualStart &&
          op.actualEnd
      );

      if (completedOps.length > 0) {
        const totalMinutes = completedOps.reduce((sum, op) => {
          const start = new Date(op.actualStart!).getTime();
          const end = new Date(op.actualEnd!).getTime();
          return sum + (end - start) / 1000 / 60; // Convert to minutes
        }, 0);
        departmentStats[dept].avgCycleTime = Math.round(totalMinutes / completedOps.length);
      }
    }

    // Format jobs for dashboard
    const jobs = productionOrders.map((order) => {
      const operations = order.jobOperations;
      const currentOp = operations.find(
        (op) => op.status === "IN_PROGRESS" || op.status === "PAUSED"
      );
      const nextOp = operations.find((op) => op.status === "PENDING");
      const completedCount = operations.filter((op) => op.status === "COMPLETED").length;
      const totalOps = operations.length;

      let elapsedTime = 0;
      if (currentOp?.actualStart) {
        elapsedTime = Math.floor(
          (Date.now() - new Date(currentOp.actualStart).getTime()) / 1000
        );
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        itemName: order.item.name,
        status: order.status,
        progress: totalOps > 0 ? Math.round((completedCount / totalOps) * 100) : 0,
        currentDepartment: (currentOp?.department as Department | null) || null,
        currentOperation: currentOp?.operationName || null,
        currentStatus: currentOp?.status || null,
        assignedTo: currentOp?.assignedTo || null,
        elapsedTime: currentOp ? elapsedTime : 0,
        nextDepartment: (nextOp?.department as Department | null) || null,
        nextOperation: nextOp?.operationName || null,
        startDate: order.scheduledStart,
        dueDate: order.scheduledEnd,
        quantity: order.qtyOrdered,
        totalOperations: totalOps,
        completedOperations: completedCount,
      };
    });

    // Calculate overall metrics
    const totalActive = jobs.filter((j) => j.currentDepartment).length;
    const totalPending = jobs.filter((j) => !j.currentDepartment && j.nextDepartment).length;
    const avgProgress = jobs.length > 0
      ? Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length)
      : 0;

    return NextResponse.json({
      jobs,
      departmentStats,
      summary: {
        totalJobs: jobs.length,
        activeJobs: totalActive,
        pendingJobs: totalPending,
        avgProgress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
