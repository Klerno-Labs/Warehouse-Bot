import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, requireTenantResource, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { updateShipmentSchema, shipSchema } from "@shared/sales";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { id } = await params;

  const shipment = await prisma.shipment.findFirst({
    where: {
      id,
      tenantId: context.user.tenantId,
    },
    include: {
      salesOrder: {
        include: {
          lines: { include: { item: true } },
        },
      },
      customer: true,
      lines: { include: { item: true, salesOrderLine: true } },
      packages: { orderBy: { packageNumber: "asc" } },
      shippedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const resource = await requireTenantResource(context, shipment, "Shipment");
  if (resource instanceof NextResponse) return resource;

  return NextResponse.json({ shipment });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { id } = await params;

  try {
    const data = await validateBody(req, updateShipmentSchema);
    if (data instanceof NextResponse) return data;

    const shipment = await prisma.shipment.findFirst({
      where: { id, tenantId: context.user.tenantId },
    });

    const resource = await requireTenantResource(context, shipment, "Shipment");
    if (resource instanceof NextResponse) return resource;

    if (shipment!.status === "SHIPPED" || shipment!.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot modify shipped/delivered shipment" },
        { status: 400 }
      );
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data,
      include: {
        salesOrder: true,
        customer: true,
        lines: { include: { item: true } },
        packages: true,
      },
    });

    return NextResponse.json({ shipment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// Ship the shipment
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  const { id } = await params;

  try {
    const data = await validateBody(req, shipSchema);
    if (data instanceof NextResponse) return data;

    const shipment = await prisma.shipment.findFirst({
      where: { id, tenantId: context.user.tenantId },
      include: {
        lines: true,
        salesOrder: {
          include: { lines: true },
        },
      },
    });

    const resource = await requireTenantResource(context, shipment, "Shipment");
    if (resource instanceof NextResponse) return resource;

    if (shipment!.status !== "DRAFT" && shipment!.status !== "READY_TO_SHIP") {
      return NextResponse.json(
        { error: "Shipment already shipped" },
        { status: 400 }
      );
    }

    // Create packages if provided
    if (data.packages && data.packages.length > 0) {
      await prisma.shipmentPackage.createMany({
        data: data.packages.map((pkg) => ({
          shipmentId: id,
          packageNumber: pkg.packageNumber,
          trackingNumber: pkg.trackingNumber,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          weight: pkg.weight,
          contents: pkg.contents,
        })),
      });
    }

    // Update shipment status
    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        status: "SHIPPED",
        trackingNumber: data.trackingNumber,
        shipDate: data.shipDate ? new Date(data.shipDate) : new Date(),
        totalPackages: data.packages?.length || 1,
      },
      include: {
        salesOrder: true,
        customer: true,
        lines: { include: { item: true } },
        packages: { orderBy: { packageNumber: "asc" } },
      },
    });

    // Update SO line statuses
    for (const line of shipment!.lines) {
      const soLine = shipment!.salesOrder.lines.find(
        (l) => l.id === line.salesOrderLineId
      );
      if (soLine) {
        const newQtyShipped = soLine.qtyShipped;
        const status = newQtyShipped >= soLine.qtyOrdered ? "SHIPPED" : "PICKED";
        await prisma.salesOrderLine.update({
          where: { id: line.salesOrderLineId },
          data: { status },
        });
      }
    }

    // Check if all SO lines are shipped
    const allLines = await prisma.salesOrderLine.findMany({
      where: { salesOrderId: shipment!.salesOrderId },
    });

    const allShipped = allLines.every((l) => l.qtyShipped >= l.qtyOrdered);

    if (allShipped) {
      await prisma.salesOrder.update({
        where: { id: shipment!.salesOrderId },
        data: { status: "SHIPPED" },
      });
    }

    return NextResponse.json({ shipment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
