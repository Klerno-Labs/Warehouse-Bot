import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";
import type { Department } from "@shared/job-tracking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all completed operations in the time period
    const completedOperations = await prisma.jobOperation.findMany({
      where: {
        productionOrder: {
          tenantId: context.user.tenantId,
        },
        status: "COMPLETED",
        actualEnd: {
          gte: startDate,
        },
      },
      include: {
        productionOrder: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        actualEnd: "asc",
      },
    });

    // Get all scan events for the period
    const scanEvents = await prisma.operationScanEvent.findMany({
      where: {
        productionOrder: {
          tenantId: context.user.tenantId,
        },
        scannedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        scannedAt: "asc",
      },
    });

    // Calculate metrics per department
    const departmentMetrics: Record<
      Department,
      {
        totalCompleted: number;
        avgCycleTime: number; // minutes
        minCycleTime: number;
        maxCycleTime: number;
        totalTime: number; // total minutes spent
        onTimeRate: number; // percentage
        throughput: number; // jobs per day
      }
    > = {
      PICKING: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      ASSEMBLY: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      PLEATING: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      OVEN: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      LASER: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      QC: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      PACKAGING: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
      SHIPPING: { totalCompleted: 0, avgCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, totalTime: 0, onTimeRate: 0, throughput: 0 },
    };

    // Process operations by department
    for (const dept of Object.keys(departmentMetrics) as Department[]) {
      const deptOps = completedOperations.filter((op) => op.department === dept);

      if (deptOps.length === 0) continue;

      const cycleTimes = deptOps
        .filter((op) => op.actualStart && op.actualEnd)
        .map((op) => {
          const start = new Date(op.actualStart!).getTime();
          const end = new Date(op.actualEnd!).getTime();
          return (end - start) / 1000 / 60; // minutes
        });

      if (cycleTimes.length > 0) {
        departmentMetrics[dept].totalCompleted = deptOps.length;
        departmentMetrics[dept].avgCycleTime = Math.round(
          cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
        );
        departmentMetrics[dept].minCycleTime = Math.round(Math.min(...cycleTimes));
        departmentMetrics[dept].maxCycleTime = Math.round(Math.max(...cycleTimes));
        departmentMetrics[dept].totalTime = Math.round(
          cycleTimes.reduce((sum, t) => sum + t, 0)
        );
        departmentMetrics[dept].throughput = parseFloat(
          (deptOps.length / days).toFixed(2)
        );

        // Calculate on-time rate (operations completed within scheduled duration)
        const onTimeOps = deptOps.filter((op) => {
          if (!op.scheduledDuration || !op.actualStart || !op.actualEnd) return false;
          const actualDuration = (new Date(op.actualEnd).getTime() - new Date(op.actualStart).getTime()) / 1000 / 60;
          return actualDuration <= op.scheduledDuration;
        });
        departmentMetrics[dept].onTimeRate = Math.round(
          (onTimeOps.length / deptOps.length) * 100
        );
      }
    }

    // Daily completion trend (last N days)
    const dailyCompletions: Array<{ date: string; count: number; departments: Record<Department, number> }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOps = completedOperations.filter((op) => {
        const endDate = new Date(op.actualEnd!);
        return endDate >= date && endDate < nextDate;
      });

      const deptCounts: Record<Department, number> = {
        PICKING: 0,
        ASSEMBLY: 0,
        PLEATING: 0,
        OVEN: 0,
        LASER: 0,
        QC: 0,
        PACKAGING: 0,
        SHIPPING: 0,
      };

      for (const op of dayOps) {
        const dept = op.department as Department;
        if (deptCounts[dept] !== undefined) {
          deptCounts[dept]++;
        }
      }

      dailyCompletions.push({
        date: date.toISOString().split("T")[0],
        count: dayOps.length,
        departments: deptCounts,
      });
    }

    // Operator performance
    const operatorStats: Record<string, {
      name: string;
      totalCompleted: number;
      avgCycleTime: number;
      departments: string[];
    }> = {};

    for (const op of completedOperations) {
      if (!op.assignedTo) continue;

      if (!operatorStats[op.assignedTo]) {
        operatorStats[op.assignedTo] = {
          name: op.assignedTo,
          totalCompleted: 0,
          avgCycleTime: 0,
          departments: [],
        };
      }

      operatorStats[op.assignedTo].totalCompleted++;

      if (op.actualStart && op.actualEnd) {
        const cycleTime = (new Date(op.actualEnd).getTime() - new Date(op.actualStart).getTime()) / 1000 / 60;
        operatorStats[op.assignedTo].avgCycleTime += cycleTime;
      }

      if (!operatorStats[op.assignedTo].departments.includes(op.department)) {
        operatorStats[op.assignedTo].departments.push(op.department);
      }
    }

    // Calculate average cycle times for operators
    for (const operator of Object.values(operatorStats)) {
      if (operator.totalCompleted > 0) {
        operator.avgCycleTime = Math.round(operator.avgCycleTime / operator.totalCompleted);
      }
    }

    const topOperators = Object.values(operatorStats)
      .sort((a, b) => b.totalCompleted - a.totalCompleted)
      .slice(0, 10);

    // Overall metrics
    const totalCompleted = completedOperations.length;
    const totalScans = scanEvents.length;
    const avgJobCompletionTime = completedOperations
      .filter((op) => op.actualStart && op.actualEnd)
      .reduce((sum, op) => {
        const cycleTime = (new Date(op.actualEnd!).getTime() - new Date(op.actualStart!).getTime()) / 1000 / 60;
        return sum + cycleTime;
      }, 0) / totalCompleted || 0;

    // Bottleneck analysis - departments with highest avg cycle time
    const bottlenecks = (Object.keys(departmentMetrics) as Department[])
      .filter((dept) => departmentMetrics[dept].totalCompleted > 0)
      .sort((a, b) => departmentMetrics[b].avgCycleTime - departmentMetrics[a].avgCycleTime)
      .slice(0, 3);

    return NextResponse.json({
      period: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        days,
      },
      overall: {
        totalCompleted,
        totalScans,
        avgJobCompletionTime: Math.round(avgJobCompletionTime),
        throughput: parseFloat((totalCompleted / days).toFixed(2)),
      },
      departmentMetrics,
      dailyCompletions,
      topOperators,
      bottlenecks: bottlenecks.map((dept) => ({
        department: dept,
        avgCycleTime: departmentMetrics[dept].avgCycleTime,
        totalCompleted: departmentMetrics[dept].totalCompleted,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
