import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { z } from "zod";

/**
 * Manufacturing Component Tracking API
 * 
 * Tracks component consumption and lot traceability for production orders
 * Uses ProductionConsumption model for component tracking
 */

const ComponentScanSchema = z.object({
  productionOrderId: z.string(),
  itemId: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  quantity: z.number().positive(),
  locationId: z.string().optional(),
  stationId: z.string().optional(),
  scannedBy: z.string().optional(),
});

const ComponentIssueSchema = z.object({
  productionOrderId: z.string(),
  components: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().positive(),
      lotNumber: z.string().optional(),
      locationId: z.string().optional(),
    })
  ),
});

interface ComponentUsage {
  id: string;
  productionOrderId: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  qtyRequired: number;
  qtyIssued: number;
  qtyRemaining: number;
  consumptions: Array<{
    id: string;
    quantity: number;
    scannedAt: Date;
  }>;
}

interface TraceabilityRecord {
  productionOrderNumber: string;
  producedItem: {
    sku: string;
    name: string;
    lotNumber?: string;
    serialNumber?: string;
  };
  components: Array<{
    itemSku: string;
    itemName: string;
    lotNumber?: string;
    quantity: number;
  }>;
  completedAt?: Date;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productionOrderId = searchParams.get("productionOrderId");
  const lotNumber = searchParams.get("lotNumber");
  const action = searchParams.get("action");

  try {
    // Get component usage for a production order
    if (productionOrderId && action !== "trace") {
      const order = await prisma.productionOrder.findFirst({
        where: {
          id: productionOrderId,
          tenantId: session.user.tenantId,
        },
        include: {
          item: true,
          bom: {
            include: {
              components: {
                include: {
                  item: true,
                },
              },
            },
          },
          consumptions: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Production order not found" },
          { status: 404 }
        );
      }

      // Build component usage list from BOM
      const componentUsage: ComponentUsage[] = [];
      
      if (order.bom) {
        for (const comp of order.bom.components) {
          const qtyRequired = comp.qtyPer * order.qtyOrdered;
          const consumedForItem = order.consumptions.filter(
            (c) => c.itemId === comp.itemId
          );
          const qtyIssued = consumedForItem.reduce(
            (sum, c) => sum + c.qtyBase,
            0
          );

          componentUsage.push({
            id: comp.id,
            productionOrderId,
            itemId: comp.itemId,
            itemSku: comp.item.sku,
            itemName: comp.item.name,
            qtyRequired,
            qtyIssued,
            qtyRemaining: Math.max(0, qtyRequired - qtyIssued),
            consumptions: consumedForItem.map((c) => ({
              id: c.id,
              quantity: c.qtyBase,
              scannedAt: c.createdAt,
            })),
          });
        }
      }

      return NextResponse.json({
        productionOrder: {
          id: order.id,
          orderNumber: order.orderNumber,
          itemSku: order.item.sku,
          itemName: order.item.name,
          qtyOrdered: order.qtyOrdered,
          status: order.status,
        },
        components: componentUsage,
        totalComponents: componentUsage.length,
        fullyIssued: componentUsage.every((c) => c.qtyRemaining === 0),
      });
    }

    // Traceability lookup by lot number
    if (lotNumber || action === "trace") {
      const traceRecords: TraceabilityRecord[] = [];

      // Find production orders that have the searched lot number
      if (lotNumber) {
        const orders = await prisma.productionOrder.findMany({
          where: {
            tenantId: session.user.tenantId,
            lotNumber: { contains: lotNumber },
          },
          include: {
            item: true,
            consumptions: {
              include: {
                item: true,
              },
            },
          },
        });

        for (const order of orders) {
          traceRecords.push({
            productionOrderNumber: order.orderNumber,
            producedItem: {
              sku: order.item.sku,
              name: order.item.name,
              lotNumber: order.lotNumber || undefined,
            },
            components: order.consumptions.map((c) => ({
              itemSku: c.item.sku,
              itemName: c.item.name,
              quantity: c.qtyBase,
            })),
            completedAt: order.actualEnd || undefined,
          });
        }
      }

      return NextResponse.json({
        searchedLot: lotNumber,
        traceRecords,
        count: traceRecords.length,
      });
    }

    // Return recent component tracking activity (consumptions)
    const recentActivity = await prisma.productionConsumption.findMany({
      where: {
        productionOrder: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        item: true,
        productionOrder: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      recentActivity: recentActivity.map((c) => ({
        id: c.id,
        itemSku: c.item.sku,
        itemName: c.item.name,
        quantity: c.qtyBase,
        productionOrderNumber: c.productionOrder.orderNumber,
        timestamp: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Component tracking GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch component tracking data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action || "scan";

    if (action === "scan") {
      // Single component scan
      const data = ComponentScanSchema.parse(body);

      // Verify production order exists
      const order = await prisma.productionOrder.findFirst({
        where: {
          id: data.productionOrderId,
          tenantId: session.user.tenantId,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Production order not found" },
          { status: 404 }
        );
      }

      // Verify item exists
      const item = await prisma.item.findUnique({
        where: { id: data.itemId },
      });

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      // Get a default location if not provided
      let fromLocationId = data.locationId;
      if (!fromLocationId) {
        const defaultLocation = await prisma.location.findFirst({
          where: { siteId: order.siteId },
        });
        if (!defaultLocation) {
          return NextResponse.json(
            { error: "No location found. Please specify a location." },
            { status: 400 }
          );
        }
        fromLocationId = defaultLocation.id;
      }

      // Create consumption record
      const consumption = await prisma.productionConsumption.create({
        data: {
          productionOrderId: order.id,
          itemId: data.itemId,
          qtyConsumed: data.quantity,
          uom: item.baseUom,
          qtyBase: data.quantity,
          fromLocationId,
          createdByUserId: session.user.id,
        },
      });

      // Also create inventory event for tracking
      await prisma.inventoryEvent.create({
        data: {
          tenantId: session.user.tenantId,
          siteId: order.siteId,
          itemId: data.itemId,
          eventType: "ISSUE_TO_WORKCELL",
          qtyEntered: -data.quantity,
          uomEntered: item.baseUom,
          qtyBase: -data.quantity,
          fromLocationId,
          toLocationId: null,
          workcellId: order.workcellId,
          referenceId: order.id,
          notes: `Component issued to ${order.orderNumber}`,
          createdByUserId: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        consumptionId: consumption.id,
        message: `${data.quantity} ${item.sku} issued to ${order.orderNumber}`,
      });
    }

    if (action === "issue-batch") {
      // Batch issue multiple components
      const data = ComponentIssueSchema.parse(body);

      const order = await prisma.productionOrder.findFirst({
        where: {
          id: data.productionOrderId,
          tenantId: session.user.tenantId,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Production order not found" },
          { status: 404 }
        );
      }

      // Get default location for components without specified location
      const defaultLocation = await prisma.location.findFirst({
        where: { siteId: order.siteId },
      });

      const results = [];

      for (const comp of data.components) {
        const item = await prisma.item.findUnique({
          where: { id: comp.itemId },
        });

        if (!item) {
          results.push({
            itemId: comp.itemId,
            success: false,
            error: "Item not found",
          });
          continue;
        }

        const fromLocationId = comp.locationId || defaultLocation?.id;
        if (!fromLocationId) {
          results.push({
            itemId: comp.itemId,
            success: false,
            error: "No location available",
          });
          continue;
        }

        const consumption = await prisma.productionConsumption.create({
          data: {
            productionOrderId: order.id,
            itemId: comp.itemId,
            qtyConsumed: comp.quantity,
            uom: item.baseUom,
            qtyBase: comp.quantity,
            fromLocationId,
            createdByUserId: session.user.id,
          },
        });

        await prisma.inventoryEvent.create({
          data: {
            tenantId: session.user.tenantId,
            siteId: order.siteId,
            itemId: comp.itemId,
            eventType: "ISSUE_TO_WORKCELL",
            qtyEntered: -comp.quantity,
            uomEntered: item.baseUom,
            qtyBase: -comp.quantity,
            fromLocationId,
            toLocationId: null,
            workcellId: order.workcellId,
            referenceId: order.id,
            notes: `Batch component issue to ${order.orderNumber}`,
            createdByUserId: session.user.id,
          },
        });

        results.push({
          itemId: comp.itemId,
          itemSku: item.sku,
          success: true,
          consumptionId: consumption.id,
          quantity: comp.quantity,
        });
      }

      const successCount = results.filter((r) => r.success).length;

      return NextResponse.json({
        success: successCount > 0,
        message: `${successCount} of ${data.components.length} components issued`,
        results,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Component tracking POST error:", error);
    return NextResponse.json(
      { error: "Failed to process component tracking" },
      { status: 500 }
    );
  }
}
