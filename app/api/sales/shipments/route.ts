import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { requireAuth, requireRole, validateBody, handleApiError } from "@app/api/_utils/middleware";
import { createShipmentSchema } from "@shared/sales";
import type { ShipmentStatus, Uom } from "@prisma/client";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ShipmentStatus | null;
  const salesOrderId = searchParams.get("salesOrderId");

  const shipments = await prisma.shipment.findMany({
    where: {
      tenantId: context.user.tenantId,
      ...(status && { status }),
      ...(salesOrderId && { salesOrderId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      salesOrder: {
        select: { id: true, orderNumber: true },
      },
      customer: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: { lines: true, packages: true },
      },
    },
  });

  return NextResponse.json({ shipments });
}

export async function POST(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
  if (roleCheck instanceof NextResponse) return roleCheck;

  try {
    const data = await validateBody(req, createShipmentSchema);
    if (data instanceof NextResponse) return data;

    // Get sales order
    const salesOrder = await prisma.salesOrder.findFirst({
      where: {
        id: data.salesOrderId,
        tenantId: context.user.tenantId,
      },
      include: { customer: true },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    // Generate shipment number
    const lastShipment = await prisma.shipment.findFirst({
      where: { tenantId: context.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    const shipSeq = lastShipment
      ? parseInt(lastShipment.shipmentNumber.replace("SHP-", "")) + 1
      : 1;
    const shipmentNumber = `SHP-${shipSeq.toString().padStart(6, "0")}`;

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        tenantId: context.user.tenantId,
        siteId: salesOrder.siteId,
        salesOrderId: data.salesOrderId,
        customerId: salesOrder.customerId,
        shipmentNumber,
        carrier: data.carrier,
        serviceLevel: data.serviceLevel,
        shipToName: data.shipToName || salesOrder.shipToName,
        shipToAddress1: data.shipToAddress1 || salesOrder.shipToAddress1,
        shipToAddress2: data.shipToAddress2 || salesOrder.shipToAddress2,
        shipToCity: data.shipToCity || salesOrder.shipToCity,
        shipToState: data.shipToState || salesOrder.shipToState,
        shipToZip: data.shipToZip || salesOrder.shipToZip,
        shipToCountry: data.shipToCountry || salesOrder.shipToCountry,
        notes: data.notes,
        shippedByUserId: context.user.id,
        lines: {
          create: data.lines.map((line) => ({
            salesOrderLineId: line.salesOrderLineId,
            itemId: line.itemId,
            qtyShipped: line.qtyShipped,
            uom: line.uom as Uom,
            lotNumber: line.lotNumber,
            serialNumber: line.serialNumber,
          })),
        },
      },
      include: {
        salesOrder: true,
        customer: true,
        lines: { include: { item: true } },
        packages: true,
      },
    });

    // Update SO line shipped quantities
    for (const line of data.lines) {
      await prisma.salesOrderLine.update({
        where: { id: line.salesOrderLineId },
        data: {
          qtyShipped: { increment: line.qtyShipped },
        },
      });
    }

    return NextResponse.json({ shipment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
