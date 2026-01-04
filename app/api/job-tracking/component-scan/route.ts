import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";

const componentScanSchema = z.object({
  productionOrderId: z.string().uuid(),
  jobOperationId: z.string().uuid(),
  itemId: z.string().uuid(),
  qtyScanned: z.number().positive(),
  lotNumber: z.string().optional(),
  location: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, componentScanSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    // Find the production order
    const productionOrder = await prisma.productionOrder.findFirst({
      where: {
        id: validatedData.productionOrderId,
        tenantId: context.user.tenantId,
      },
      include: {
        bom: {
          include: {
            components: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!productionOrder) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

    // Find the BOM component for this item
    const bomComponent = productionOrder.bom.components.find(
      (c) => c.itemId === validatedData.itemId
    );

    if (!bomComponent) {
      return NextResponse.json(
        { error: "Component not found in BOM" },
        { status: 400 }
      );
    }

    // Calculate required quantity based on production order qty
    const requiredQty = bomComponent.qtyPer * productionOrder.qtyOrdered;

    // Check how much has already been scanned
    const existingScans = await prisma.componentScan.findMany({
      where: {
        productionOrderId: validatedData.productionOrderId,
        itemId: validatedData.itemId,
      },
    });

    const totalScanned = existingScans.reduce(
      (sum, scan) => sum + scan.qtyScanned,
      0
    ) + validatedData.qtyScanned;

    // Create component scan record
    const componentScan = await prisma.componentScan.create({
      data: {
        productionOrderId: validatedData.productionOrderId,
        jobOperationId: validatedData.jobOperationId,
        itemId: validatedData.itemId,
        qtyScanned: validatedData.qtyScanned,
        qtyRequired: requiredQty,
        scannedBy: context.user.name,
        scannedAt: new Date(),
        lotNumber: validatedData.lotNumber,
        location: validatedData.location,
      },
    });

    // Check if component is now complete
    const isComplete = totalScanned >= requiredQty;
    const isOverPicked = totalScanned > requiredQty;

    return NextResponse.json({
      success: true,
      componentScan,
      summary: {
        itemName: bomComponent.item.name,
        qtyScanned: validatedData.qtyScanned,
        totalScanned,
        qtyRequired: requiredQty,
        remaining: Math.max(0, requiredQty - totalScanned),
        isComplete,
        isOverPicked,
        percentComplete: Math.round((totalScanned / requiredQty) * 100),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Get component scan status for a production order
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const productionOrderId = searchParams.get("productionOrderId");

    if (!productionOrderId) {
      return NextResponse.json(
        { error: "productionOrderId is required" },
        { status: 400 }
      );
    }

    // Get production order with BOM
    const productionOrder = await prisma.productionOrder.findFirst({
      where: {
        id: productionOrderId,
        tenantId: context.user.tenantId,
      },
      include: {
        bom: {
          include: {
            components: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!productionOrder) {
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );
    }

    // Get all component scans for this order
    const componentScans = await prisma.componentScan.findMany({
      where: {
        productionOrderId,
      },
      orderBy: {
        scannedAt: "desc",
      },
    });

    // Build component status
    const componentStatus = productionOrder.bom.components.map((bomComp) => {
      const requiredQty = bomComp.qtyPer * productionOrder.qtyOrdered;
      const scans = componentScans.filter(
        (scan) => scan.itemId === bomComp.itemId
      );
      const totalScanned = scans.reduce((sum, scan) => sum + scan.qtyScanned, 0);

      return {
        itemId: bomComp.itemId,
        itemName: bomComp.item.name,
        itemCode: bomComp.item.sku,
        qtyRequired: requiredQty,
        qtyScanned: totalScanned,
        remaining: Math.max(0, requiredQty - totalScanned),
        percentComplete: Math.round((totalScanned / requiredQty) * 100),
        isComplete: totalScanned >= requiredQty,
        isOverPicked: totalScanned > requiredQty,
        scans: scans.map((scan) => ({
          id: scan.id,
          qty: scan.qtyScanned,
          scannedBy: scan.scannedBy,
          scannedAt: scan.scannedAt,
          lotNumber: scan.lotNumber,
          location: scan.location,
        })),
      };
    });

    const totalComponents = componentStatus.length;
    const completeComponents = componentStatus.filter((c) => c.isComplete).length;
    const overallProgress = totalComponents > 0
      ? Math.round((completeComponents / totalComponents) * 100)
      : 0;

    return NextResponse.json({
      productionOrder: {
        id: productionOrder.id,
        orderNumber: productionOrder.orderNumber,
        qtyOrdered: productionOrder.qtyOrdered,
      },
      componentStatus,
      summary: {
        totalComponents,
        completeComponents,
        overallProgress,
        allComplete: completeComponents === totalComponents,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
