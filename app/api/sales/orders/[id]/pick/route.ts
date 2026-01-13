import { NextResponse } from "next/server";
import { requireAuth, requireRole, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";
import type { Uom } from "@prisma/client";

// Generate pick tasks for a sales order
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;

    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id, tenantId: context.user.tenantId },
      include: {
        lines: { include: { item: true } },
        pickTasks: true,
      },
    });

    const validatedOrder = await requireTenantResource(context, salesOrder, "Sales order");
    if (validatedOrder instanceof NextResponse) return validatedOrder;

    if (validatedOrder.status !== "ALLOCATED") {
      return NextResponse.json(
        { error: "Can only create pick tasks for allocated orders" },
        { status: 400 }
      );
    }

    // Check if there are already active pick tasks
    const activeTasks = validatedOrder.pickTasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    );

    if (activeTasks.length > 0) {
      return NextResponse.json(
        { error: "Order already has active pick tasks" },
        { status: 400 }
      );
    }

    // Generate task number
    const lastTask = await prisma.pickTask.findFirst({
      where: { tenantId: context.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    const taskSeq = lastTask
      ? parseInt(lastTask.taskNumber.replace("PICK-", "")) + 1
      : 1;
    const taskNumber = `PICK-${taskSeq.toString().padStart(6, "0")}`;

    // Create pick lines by finding inventory locations
    const pickLines: Array<{
      salesOrderLineId: string;
      itemId: string;
      locationId: string;
      qtyToPick: number;
      uom: Uom;
      lotNumber?: string;
    }> = [];

    for (const line of validatedOrder.lines) {
      if (line.qtyAllocated <= line.qtyPicked) continue; // Already picked

      const qtyToPick = line.qtyAllocated - line.qtyPicked;

      // Get inventory balances sorted by FIFO (oldest first)
      const balances = await prisma.inventoryBalance.findMany({
        where: {
          tenantId: context.user.tenantId,
          siteId: validatedOrder.siteId,
          itemId: line.itemId,
          location: { type: { in: ["STOCK"] } },
          qtyBase: { gt: 0 },
        },
        include: { location: true },
        orderBy: { updatedAt: "asc" }, // FIFO
      });

      let remainingQty = qtyToPick;

      for (const balance of balances) {
        if (remainingQty <= 0) break;

        const pickFromBalance = Math.min(balance.qtyBase, remainingQty);

        pickLines.push({
          salesOrderLineId: line.id,
          itemId: line.itemId,
          locationId: balance.locationId,
          qtyToPick: pickFromBalance,
          uom: line.uom,
          // lotNumber will be added when lot tracking is implemented
        });

        remainingQty -= pickFromBalance;
      }
    }

    if (pickLines.length === 0) {
      return NextResponse.json(
        { error: "No items to pick" },
        { status: 400 }
      );
    }

    // Create pick task with lines
    const pickTask = await prisma.pickTask.create({
      data: {
        tenantId: context.user.tenantId,
        siteId: validatedOrder.siteId,
        salesOrderId: id,
        taskNumber,
        status: "PENDING",
        priority: 5,
        lines: {
          create: pickLines,
        },
      },
      include: {
        lines: {
          include: {
            item: true,
            location: true,
            salesOrderLine: true,
          },
        },
      },
    });

    // Update order status
    await prisma.salesOrder.update({
      where: { id },
      data: { status: "PICKING" },
    });

    // Update line statuses
    for (const line of validatedOrder.lines) {
      if (line.qtyAllocated > line.qtyPicked) {
        await prisma.salesOrderLine.update({
          where: { id: line.id },
          data: { status: "PICKING" },
        });
      }
    }

    return NextResponse.json({ pickTask }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
