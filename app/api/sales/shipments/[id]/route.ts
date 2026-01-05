import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import type { ShipmentStatus } from "@prisma/client";

const updateShipmentSchema = z.object({
  carrier: z.string().optional().nullable(),
  serviceLevel: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const shipSchema = z.object({
  trackingNumber: z.string().optional(),
  shipDate: z.string().optional(),
  packages: z
    .array(
      z.object({
        packageNumber: z.number().int().positive(),
        trackingNumber: z.string().optional(),
        length: z.number().positive().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        weight: z.number().positive().optional(),
        contents: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shipment = await prisma.shipment.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
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

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateShipmentSchema.parse(body);

    const shipment = await prisma.shipment.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (shipment.status === "SHIPPED" || shipment.status === "DELIVERED") {
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating shipment:", error);
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 500 }
    );
  }
}

// Ship the shipment
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = shipSchema.parse(body);

    const shipment = await prisma.shipment.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        lines: true,
        salesOrder: {
          include: { lines: true },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (shipment.status !== "DRAFT" && shipment.status !== "READY_TO_SHIP") {
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
    for (const line of shipment.lines) {
      const soLine = shipment.salesOrder.lines.find(
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
      where: { salesOrderId: shipment.salesOrderId },
    });

    const allShipped = allLines.every((l) => l.qtyShipped >= l.qtyOrdered);

    if (allShipped) {
      await prisma.salesOrder.update({
        where: { id: shipment.salesOrderId },
        data: { status: "SHIPPED" },
      });
    }

    return NextResponse.json({ shipment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error shipping:", error);
    return NextResponse.json(
      { error: "Failed to ship" },
      { status: 500 }
    );
  }
}
