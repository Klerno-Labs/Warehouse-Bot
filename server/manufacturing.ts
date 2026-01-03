import { PrismaClient } from "@prisma/client";
import { convertQuantity } from "./inventory";

/**
 * Calculate material requirements for a production order based on BOM
 */
export async function calculateMaterialRequirements(
  prisma: PrismaClient,
  bomId: string,
  qtyOrdered: number
) {
  const bom = await prisma.billOfMaterial.findUnique({
    where: { id: bomId },
    include: {
      components: {
        include: {
          item: true,
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!bom) {
    throw new Error("BOM not found");
  }

  const requirements = bom.components.map((component) => {
    const qtyPerBase = component.qtyPer;
    const qtyRequired = (qtyOrdered / bom.baseQty) * qtyPerBase;
    const scrapQty = qtyRequired * (component.scrapFactor / 100);
    const totalQty = qtyRequired + scrapQty;

    return {
      component,
      qtyRequired,
      scrapQty,
      totalQty,
      uom: component.uom,
    };
  });

  return {
    bom,
    requirements,
  };
}

/**
 * Backflush component consumption based on output quantity
 */
export async function backflushConsumption(
  prisma: PrismaClient,
  tenantId: string,
  productionOrderId: string,
  qtyProduced: number,
  fromLocationId: string,
  createdByUserId: string
) {
  // Get production order with BOM
  const productionOrder = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: {
      bom: {
        include: {
          components: {
            where: {
              issueMethod: "BACKFLUSH",
            },
            include: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!productionOrder) {
    throw new Error("Production order not found");
  }

  const backflushedComponents = [];

  // Calculate consumption for each BACKFLUSH component
  for (const component of productionOrder.bom.components) {
    const qtyPerBase = component.qtyPer;
    const qtyConsumed = (qtyProduced / productionOrder.bom.baseQty) * qtyPerBase;
    const scrapQty = qtyConsumed * (component.scrapFactor / 100);
    const totalConsumed = qtyConsumed + scrapQty;

    // Convert to base UOM
    const { qtyBase } = await convertQuantity(
      prisma,
      tenantId,
      component.itemId,
      totalConsumed,
      component.uom
    );

    // Create consumption record
    const consumption = await prisma.productionConsumption.create({
      data: {
        productionOrderId,
        bomComponentId: component.id,
        itemId: component.itemId,
        qtyConsumed: totalConsumed,
        uom: component.uom,
        qtyBase,
        fromLocationId,
        isBackflushed: true,
        createdByUserId,
      },
      include: {
        item: true,
        fromLocation: true,
      },
    });

    backflushedComponents.push(consumption);
  }

  return backflushedComponents;
}

/**
 * Calculate yield metrics for a production order
 */
export async function calculateYield(
  prisma: PrismaClient,
  productionOrderId: string
) {
  const productionOrder = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: {
      bom: {
        include: {
          item: true,
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
      outputs: true,
    },
  });

  if (!productionOrder) {
    throw new Error("Production order not found");
  }

  // Calculate planned vs actual for each component
  const componentAnalysis = productionOrder.bom.components.map((bomComponent) => {
    const plannedQty =
      (productionOrder.qtyCompleted / productionOrder.bom.baseQty) *
      bomComponent.qtyPer;

    const actualConsumptions = productionOrder.consumptions.filter(
      (c) => c.itemId === bomComponent.itemId
    );

    const actualQty = actualConsumptions.reduce(
      (sum, c) => sum + c.qtyConsumed,
      0
    );

    const scrapConsumptions = actualConsumptions.filter((c) => c.isScrap);
    const scrapQty = scrapConsumptions.reduce((sum, c) => sum + c.qtyConsumed, 0);

    const variance = actualQty - plannedQty;
    const variancePercent = plannedQty > 0 ? (variance / plannedQty) * 100 : 0;
    const scrapPercent = actualQty > 0 ? (scrapQty / actualQty) * 100 : 0;

    return {
      item: bomComponent.item,
      plannedQty,
      actualQty,
      scrapQty,
      variance,
      variancePercent,
      scrapPercent,
      uom: bomComponent.uom,
    };
  });

  // Overall production efficiency
  const productionEfficiency =
    productionOrder.qtyOrdered > 0
      ? (productionOrder.qtyCompleted / productionOrder.qtyOrdered) * 100
      : 0;

  const totalQtyProduced = productionOrder.outputs.reduce(
    (sum, o) => sum + o.qtyProduced,
    0
  );
  const totalQtyRejected = productionOrder.outputs.reduce(
    (sum, o) => sum + o.qtyRejected,
    0
  );
  const qualityRate =
    totalQtyProduced + totalQtyRejected > 0
      ? (totalQtyProduced / (totalQtyProduced + totalQtyRejected)) * 100
      : 0;

  return {
    productionOrder: {
      orderNumber: productionOrder.orderNumber,
      itemName: productionOrder.bom.item.name,
      qtyOrdered: productionOrder.qtyOrdered,
      qtyCompleted: productionOrder.qtyCompleted,
      qtyRejected: productionOrder.qtyRejected,
    },
    componentAnalysis,
    metrics: {
      productionEfficiency,
      qualityRate,
      totalComponents: componentAnalysis.length,
      componentsOverConsumed: componentAnalysis.filter((c) => c.variance > 0)
        .length,
      componentsUnderConsumed: componentAnalysis.filter((c) => c.variance < 0)
        .length,
    },
  };
}

/**
 * Get work in progress summary
 */
export async function getWIPSummary(prisma: PrismaClient, siteId: string) {
  const inProgressOrders = await prisma.productionOrder.findMany({
    where: {
      siteId,
      status: {
        in: ["RELEASED", "IN_PROGRESS"],
      },
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
      consumptions: true,
      outputs: true,
    },
  });

  const wipSummary = inProgressOrders.map((order) => {
    const materialCost = order.consumptions.reduce((sum, c) => {
      // Simplified - would need item cost from inventory in real implementation
      return sum + c.qtyConsumed;
    }, 0);

    const percentComplete =
      order.qtyOrdered > 0 ? (order.qtyCompleted / order.qtyOrdered) * 100 : 0;

    return {
      orderNumber: order.orderNumber,
      item: order.item.name,
      status: order.status,
      qtyOrdered: order.qtyOrdered,
      qtyCompleted: order.qtyCompleted,
      percentComplete,
      scheduledStart: order.scheduledStart,
      scheduledEnd: order.scheduledEnd,
      materialCost, // Simplified
      componentCount: order.bom.components.length,
      consumedComponents: new Set(order.consumptions.map((c) => c.itemId)).size,
    };
  });

  return {
    totalOrders: wipSummary.length,
    orders: wipSummary,
  };
}
