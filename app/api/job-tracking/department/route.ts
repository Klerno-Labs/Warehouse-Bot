import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError } from "@app/api/_utils/middleware";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");

    if (!department) {
      return NextResponse.json(
        { error: "Department parameter required" },
        { status: 400 }
      );
    }

    // Get active jobs for this department (IN_PROGRESS or PAUSED)
    const activeOperations = await prisma.jobOperation.findMany({
      where: {
        department,
        status: {
          in: ["IN_PROGRESS", "PAUSED"],
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
        actualStart: "asc",
      },
    });

    const activeJobs = activeOperations.map((op) => {
      const elapsedTime = op.actualStart
        ? Math.floor((Date.now() - new Date(op.actualStart).getTime()) / 1000)
        : 0;

      return {
        id: op.productionOrder.id,
        orderNumber: op.productionOrder.orderNumber,
        itemName: op.productionOrder.item.name,
        currentOperation: op.operationName,
        assignedTo: op.assignedTo,
        startedAt: op.actualStart,
        elapsedTime,
      };
    });

    // Get pending jobs for this department (jobs with PENDING operations in this department)
    const pendingOperations = await prisma.jobOperation.findMany({
      where: {
        department,
        status: "PENDING",
      },
      include: {
        productionOrder: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        sequence: "asc",
      },
      take: 20, // Limit to prevent overwhelming the UI
    });

    const pendingJobs = pendingOperations.map((op) => ({
      id: op.productionOrder.id,
      orderNumber: op.productionOrder.orderNumber,
      itemName: op.productionOrder.item.name,
      nextOperation: op.operationName,
    }));

    return NextResponse.json({
      department,
      activeJobs,
      pendingJobs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
