import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import type { ShipmentStatus, Uom } from "@prisma/client";

const createShipmentSchema = z.object({
  salesOrderId: z.string(),
  carrier: z.string().optional(),
  serviceLevel: z.string().optional(),
  shipToName: z.string().optional(),
  shipToAddress1: z.string().optional(),
  shipToAddress2: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToZip: z.string().optional(),
  shipToCountry: z.string().default("US"),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      salesOrderLineId: z.string(),
      itemId: z.string(),
      qtyShipped: z.number().positive(),
      uom: z.enum(["EA", "FT", "YD", "ROLL"]),
      lotNumber: z.string().optional(),
      serialNumber: z.string().optional(),
    })
  ).min(1),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ShipmentStatus | null;
  const salesOrderId = searchParams.get("salesOrderId");

  const shipments = await prisma.shipment.findMany({
    where: {
      tenantId: session.user.tenantId,
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
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Supervisor", "Inventory"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createShipmentSchema.parse(body);

    // Get sales order
    const salesOrder = await prisma.salesOrder.findFirst({
      where: {
        id: data.salesOrderId,
        tenantId: session.user.tenantId,
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
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    const shipSeq = lastShipment
      ? parseInt(lastShipment.shipmentNumber.replace("SHP-", "")) + 1
      : 1;
    const shipmentNumber = `SHP-${shipSeq.toString().padStart(6, "0")}`;

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        tenantId: session.user.tenantId,
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
        shippedByUserId: session.user.id,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
