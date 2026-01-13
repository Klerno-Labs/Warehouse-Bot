import { NextResponse } from "next/server";
import { requireAuth, requireRole, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";
import { prisma } from "@server/prisma";

// Allocate inventory to a sales order
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Sales", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { id } = await params;

    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id, tenantId: context.user.tenantId },
      include: {
        lines: { include: { item: true } },
      },
    });

    const validatedOrder = await requireTenantResource(context, salesOrder, "Sales order");
    if (validatedOrder instanceof NextResponse) return validatedOrder;

    if (validatedOrder.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Can only allocate confirmed orders" },
        { status: 400 }
      );
    }

    const allocationResults: Array<{
      lineId: string;
      itemId: string;
      sku: string;
      qtyOrdered: number;
      qtyAllocated: number;
      available: number;
      shortfall: number;
    }> = [];

    // Check inventory availability and allocate
    for (const line of validatedOrder.lines) {
      // Get available inventory (STOCK locations only, excluding QC_HOLD)
      const balances = await prisma.inventoryBalance.findMany({
        where: {
          tenantId: context.user.tenantId,
          siteId: validatedOrder.siteId,
          itemId: line.itemId,
          location: {
            type: { in: ["STOCK", "SHIPPING"] },
          },
          qtyBase: { gt: 0 },
        },
        include: { location: true },
      });

      const totalAvailable = balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const qtyNeeded = line.qtyOrdered - line.qtyAllocated;
      const qtyToAllocate = Math.min(qtyNeeded, totalAvailable);

      // Update line with allocated quantity
      await prisma.salesOrderLine.update({
        where: { id: line.id },
        data: {
          qtyAllocated: line.qtyAllocated + qtyToAllocate,
          status: qtyToAllocate >= qtyNeeded ? "ALLOCATED" : "OPEN",
        },
      });

      allocationResults.push({
        lineId: line.id,
        itemId: line.itemId,
        sku: line.item.sku,
        qtyOrdered: line.qtyOrdered,
        qtyAllocated: line.qtyAllocated + qtyToAllocate,
        available: totalAvailable,
        shortfall: Math.max(0, qtyNeeded - qtyToAllocate),
      });
    }

    // Check if all lines are fully allocated
    const allAllocated = allocationResults.every(
      (r) => r.qtyAllocated >= r.qtyOrdered
    );

    // Update order status
    await prisma.salesOrder.update({
      where: { id },
      data: {
        status: allAllocated ? "ALLOCATED" : "CONFIRMED",
      },
    });

    const updatedOrder = await prisma.salesOrder.findFirst({
      where: { id },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    });

    return NextResponse.json({
      salesOrder: updatedOrder,
      allocation: {
        fullyAllocated: allAllocated,
        results: allocationResults,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
