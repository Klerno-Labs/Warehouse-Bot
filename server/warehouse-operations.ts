/**
 * Advanced Warehouse Operations System
 *
 * Includes directed putaway, wave/batch/zone picking, slotting optimization,
 * and task management for enterprise-grade warehouse operations
 */

import { prisma } from "./prisma";
import { Uom } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export type PutawayStrategy = "DIRECTED" | "RANDOM" | "VELOCITY" | "ZONE" | "CONSOLIDATE";
export type PickingStrategy = "WAVE" | "BATCH" | "ZONE" | "CLUSTER" | "DISCRETE";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface PutawayTask {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  qty: number;
  uom: Uom;
  sourceLocation: string;
  suggestedLocation: string;
  alternativeLocations: string[];
  priority: TaskPriority;
  lotNumber?: string;
  receiptId?: string;
}

export interface PickTask {
  id: string;
  waveId?: string;
  batchId?: string;
  zoneId?: string;
  items: PickItem[];
  totalItems: number;
  totalQuantity: number;
  estimatedTime: number; // minutes
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
}

export interface PickItem {
  id: string;
  salesOrderLineId: string;
  orderNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  qty: number;
  uom: Uom;
  locationId: string;
  locationLabel: string;
  zone: string;
  bin: string;
  lotNumber?: string;
  serialNumbers?: string[];
  sequence: number;
}

export interface WaveConfig {
  maxOrders: number;
  maxLines: number;
  maxQuantity: number;
  cutoffTime?: string; // HH:mm format
  carrierFilter?: string[];
  priorityFilter?: number[];
}

export interface SlotProfile {
  locationId: string;
  zone: string;
  bin: string;
  velocity: "A" | "B" | "C"; // ABC classification
  maxCapacity: number;
  currentCapacity: number;
  itemRestrictions?: string[];
  temperatureZone?: string;
  pickSequence: number;
}

// ============================================================
// PUTAWAY SERVICE
// ============================================================

export class PutawayService {
  /**
   * Generate directed putaway suggestions
   */
  static async generatePutawaySuggestions(params: {
    tenantId: string;
    siteId: string;
    itemId: string;
    qty: number;
    lotNumber?: string;
    strategy?: PutawayStrategy;
  }): Promise<PutawayTask> {
    const { tenantId, siteId, itemId, qty, lotNumber, strategy = "DIRECTED" } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        balances: {
          where: { siteId },
          include: { location: true },
        },
      },
    });

    if (!item) throw new Error("Item not found");

    // Get all available stock locations
    const stockLocations = await prisma.location.findMany({
      where: {
        tenantId,
        siteId,
        type: "STOCK",
      },
      include: {
        balances: true,
      },
    });

    let suggestedLocation: string;
    let alternativeLocations: string[] = [];

    switch (strategy) {
      case "CONSOLIDATE":
        // Find locations that already have this item
        const existingLocations = item.balances
          .filter((b) => b.qtyBase > 0)
          .map((b) => b.location);

        if (existingLocations.length > 0) {
          suggestedLocation = existingLocations[0].id;
          alternativeLocations = existingLocations.slice(1, 4).map((l) => l.id);
        } else {
          // Fall back to empty location
          const emptyLocation = stockLocations.find(
            (l) => l.balances.reduce((sum, b) => sum + b.qtyBase, 0) === 0
          );
          suggestedLocation = emptyLocation?.id || stockLocations[0]?.id;
        }
        break;

      case "VELOCITY":
        // High-velocity items go to easily accessible locations
        const category = item.category;
        const velocityZone = category === "PRODUCTION" ? "A" : category === "PACKAGING" ? "B" : "C";

        const velocityLocations = stockLocations
          .filter((l) => l.zone === velocityZone || l.zone?.startsWith(velocityZone))
          .sort((a, b) => (a.bin || "").localeCompare(b.bin || ""));

        suggestedLocation = velocityLocations[0]?.id || stockLocations[0]?.id;
        alternativeLocations = velocityLocations.slice(1, 4).map((l) => l.id);
        break;

      case "ZONE":
        // Put in zone designated for item category
        const zoneLocations = stockLocations.filter(
          (l) => l.zone === item.category
        );
        suggestedLocation = zoneLocations[0]?.id || stockLocations[0]?.id;
        alternativeLocations = zoneLocations.slice(1, 4).map((l) => l.id);
        break;

      case "RANDOM":
        // Random empty location
        const emptyLocations = stockLocations.filter(
          (l) => l.balances.reduce((sum, b) => sum + b.qtyBase, 0) === 0
        );
        const randomIndex = Math.floor(Math.random() * emptyLocations.length);
        suggestedLocation = emptyLocations[randomIndex]?.id || stockLocations[0]?.id;
        alternativeLocations = emptyLocations
          .filter((_, i) => i !== randomIndex)
          .slice(0, 3)
          .map((l) => l.id);
        break;

      case "DIRECTED":
      default:
        // Smart algorithm considering multiple factors
        const scoredLocations = stockLocations.map((location) => {
          let score = 100;

          // Prefer locations with same item (consolidation bonus)
          const hasItem = item.balances.some((b) => b.locationId === location.id);
          if (hasItem) score += 50;

          // Prefer locations in correct zone
          if (location.zone === item.category) score += 30;

          // Prefer locations with lower fill rate
          const currentQty = location.balances.reduce((sum, b) => sum + b.qtyBase, 0);
          score -= currentQty * 0.1;

          // Prefer locations with lower bin numbers (easier access)
          const binNum = parseInt(location.bin || "0", 10);
          score -= binNum * 0.5;

          return { location, score };
        });

        scoredLocations.sort((a, b) => b.score - a.score);
        suggestedLocation = scoredLocations[0]?.location.id;
        alternativeLocations = scoredLocations.slice(1, 4).map((s) => s.location.id);
        break;
    }

    return {
      id: `PUT-${Date.now()}`,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      qty,
      uom: item.baseUom,
      sourceLocation: "RECEIVING",
      suggestedLocation,
      alternativeLocations,
      priority: "MEDIUM",
      lotNumber,
    };
  }

  /**
   * Execute putaway
   */
  static async executePutaway(params: {
    tenantId: string;
    siteId: string;
    itemId: string;
    qty: number;
    fromLocationId: string;
    toLocationId: string;
    lotNumber?: string;
    userId?: string;
  }): Promise<any> {
    const { tenantId, siteId, itemId, qty, fromLocationId, toLocationId, lotNumber, userId } = params;

    // Create inventory event for the move
    const event = await prisma.inventoryEvent.create({
      data: {
        tenantId,
        siteId,
        eventType: "MOVE",
        itemId,
        qtyEntered: qty,
        uomEntered: "EA",
        qtyBase: qty,
        fromLocationId,
        toLocationId,
        notes: lotNumber ? `Putaway - Lot: ${lotNumber}` : "Putaway",
        createdByUserId: userId,
      },
    });

    // Update inventory balances
    // Decrease from source
    await prisma.inventoryBalance.updateMany({
      where: {
        tenantId,
        siteId,
        itemId,
        locationId: fromLocationId,
      },
      data: {
        qtyBase: { decrement: qty },
      },
    });

    // Increase at destination
    await prisma.inventoryBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId,
          itemId,
          locationId: toLocationId,
        },
      },
      create: {
        tenantId,
        siteId,
        itemId,
        locationId: toLocationId,
        qtyBase: qty,
      },
      update: {
        qtyBase: { increment: qty },
      },
    });

    return event;
  }
}

// ============================================================
// PICKING SERVICE
// ============================================================

export class PickingService {
  /**
   * Create a wave for batch processing
   */
  static async createWave(params: {
    tenantId: string;
    siteId: string;
    config: WaveConfig;
    name?: string;
  }): Promise<{ waveId: string; orders: number; lines: number; quantity: number }> {
    const { tenantId, siteId, config, name } = params;

    // Get eligible orders
    const whereClause: any = {
      tenantId,
      siteId,
      status: "CONFIRMED",
    };

    if (config.priorityFilter && config.priorityFilter.length > 0) {
      // Filter by priority - not directly available, would need to extend SO model
    }

    const orders = await prisma.salesOrder.findMany({
      where: whereClause,
      include: {
        lines: {
          where: { status: "OPEN" },
          include: { item: true },
        },
      },
      take: config.maxOrders,
      orderBy: [
        { requestedDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    let totalLines = 0;
    let totalQuantity = 0;
    const selectedOrders: string[] = [];

    for (const order of orders) {
      const orderLines = order.lines.length;
      const orderQty = order.lines.reduce((sum, l) => sum + l.qtyOrdered, 0);

      if (
        totalLines + orderLines <= config.maxLines &&
        totalQuantity + orderQty <= config.maxQuantity
      ) {
        selectedOrders.push(order.id);
        totalLines += orderLines;
        totalQuantity += orderQty;
      }
    }

    const waveId = `WAVE-${Date.now()}`;

    // Update selected orders to allocated status
    await prisma.salesOrder.updateMany({
      where: { id: { in: selectedOrders } },
      data: { status: "ALLOCATED" },
    });

    return {
      waveId,
      orders: selectedOrders.length,
      lines: totalLines,
      quantity: totalQuantity,
    };
  }

  /**
   * Generate optimized pick list
   */
  static async generatePickList(params: {
    tenantId: string;
    siteId: string;
    orderIds: string[];
    strategy?: PickingStrategy;
  }): Promise<PickItem[]> {
    const { tenantId, siteId, orderIds, strategy = "ZONE" } = params;

    const orders = await prisma.salesOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId,
      },
      include: {
        lines: {
          where: { status: { in: ["OPEN", "ALLOCATED"] } },
          include: { item: true },
        },
      },
    });

    // Get all items that need to be picked
    const pickItems: PickItem[] = [];

    for (const order of orders) {
      for (const line of order.lines) {
        // Find best location to pick from (FIFO by default)
        const balances = await prisma.inventoryBalance.findMany({
          where: {
            tenantId,
            siteId,
            itemId: line.itemId,
            qtyBase: { gt: 0 },
          },
          include: {
            location: true,
          },
          orderBy: {
            updatedAt: "asc", // FIFO
          },
        });

        let remainingQty = line.qtyOrdered - line.qtyPicked;

        for (const balance of balances) {
          if (remainingQty <= 0) break;

          const pickQty = Math.min(remainingQty, balance.qtyBase);

          pickItems.push({
            id: `PICK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            salesOrderLineId: line.id,
            orderNumber: order.orderNumber,
            itemId: line.itemId,
            itemSku: line.item.sku,
            itemName: line.item.name,
            qty: pickQty,
            uom: line.uom,
            locationId: balance.locationId,
            locationLabel: balance.location.label,
            zone: balance.location.zone || "DEFAULT",
            bin: balance.location.bin || "",
            sequence: 0,
          });

          remainingQty -= pickQty;
        }
      }
    }

    // Sort and sequence based on strategy
    return this.optimizePickSequence(pickItems, strategy);
  }

  /**
   * Optimize pick sequence based on strategy
   */
  private static optimizePickSequence(items: PickItem[], strategy: PickingStrategy): PickItem[] {
    let sortedItems: PickItem[];

    switch (strategy) {
      case "ZONE":
        // Sort by zone, then by bin within zone
        sortedItems = items.sort((a, b) => {
          const zoneCompare = a.zone.localeCompare(b.zone);
          if (zoneCompare !== 0) return zoneCompare;
          return a.bin.localeCompare(b.bin);
        });
        break;

      case "BATCH":
        // Group by item to consolidate picks
        sortedItems = items.sort((a, b) => {
          const itemCompare = a.itemSku.localeCompare(b.itemSku);
          if (itemCompare !== 0) return itemCompare;
          return a.locationLabel.localeCompare(b.locationLabel);
        });
        break;

      case "CLUSTER":
        // Group items that are close together
        sortedItems = items.sort((a, b) => {
          return a.locationLabel.localeCompare(b.locationLabel);
        });
        break;

      case "DISCRETE":
        // Sort by order number
        sortedItems = items.sort((a, b) => {
          return a.orderNumber.localeCompare(b.orderNumber);
        });
        break;

      case "WAVE":
      default:
        // Serpentine path through warehouse
        sortedItems = items.sort((a, b) => {
          const zoneCompare = a.zone.localeCompare(b.zone);
          if (zoneCompare !== 0) return zoneCompare;

          // Alternate direction in each zone
          const zoneIndex = a.zone.charCodeAt(0);
          if (zoneIndex % 2 === 0) {
            return a.bin.localeCompare(b.bin);
          } else {
            return b.bin.localeCompare(a.bin);
          }
        });
        break;
    }

    // Assign sequence numbers
    return sortedItems.map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));
  }

  /**
   * Create pick task from pick list
   */
  static async createPickTask(params: {
    tenantId: string;
    siteId: string;
    salesOrderId: string;
    items: PickItem[];
    assignTo?: string;
    priority?: TaskPriority;
  }): Promise<any> {
    const { tenantId, siteId, salesOrderId, items, assignTo, priority = "MEDIUM" } = params;

    // Generate task number
    const taskNumber = `PT-${Date.now()}`;

    const pickTask = await prisma.pickTask.create({
      data: {
        tenantId,
        siteId,
        salesOrderId,
        taskNumber,
        status: assignTo ? "ASSIGNED" : "PENDING",
        priority: priority === "URGENT" ? 1 : priority === "HIGH" ? 3 : priority === "MEDIUM" ? 5 : 7,
        assignedToUserId: assignTo,
        assignedAt: assignTo ? new Date() : null,
        lines: {
          create: items.map((item) => ({
            salesOrderLineId: item.salesOrderLineId,
            itemId: item.itemId,
            locationId: item.locationId,
            qtyToPick: item.qty,
            uom: item.uom,
            lotNumber: item.lotNumber,
            status: "PENDING",
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return pickTask;
  }

  /**
   * Confirm pick
   */
  static async confirmPick(params: {
    pickTaskLineId: string;
    qtyPicked: number;
    actualLocationId?: string;
    lotNumber?: string;
    userId: string;
  }): Promise<any> {
    const { pickTaskLineId, qtyPicked, actualLocationId, lotNumber, userId } = params;

    const line = await prisma.pickTaskLine.findUnique({
      where: { id: pickTaskLineId },
      include: {
        pickTask: true,
      },
    });

    if (!line) throw new Error("Pick task line not found");

    const status = qtyPicked >= line.qtyToPick ? "PICKED" : "SHORT";

    const updatedLine = await prisma.pickTaskLine.update({
      where: { id: pickTaskLineId },
      data: {
        qtyPicked,
        status,
        pickedAt: new Date(),
        pickedByUserId: userId,
        actualLocationId: actualLocationId || line.locationId,
        lotNumber,
      },
    });

    // Update sales order line
    await prisma.salesOrderLine.update({
      where: { id: line.salesOrderLineId },
      data: {
        qtyPicked: { increment: qtyPicked },
        status: "PICKED",
      },
    });

    // Check if all lines are complete
    const allLines = await prisma.pickTaskLine.findMany({
      where: { pickTaskId: line.pickTaskId },
    });

    const allComplete = allLines.every((l) => l.status === "PICKED" || l.status === "SHORT");

    if (allComplete) {
      await prisma.pickTask.update({
        where: { id: line.pickTaskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedByUserId: userId,
        },
      });
    }

    return updatedLine;
  }
}

// ============================================================
// SLOTTING OPTIMIZATION SERVICE
// ============================================================

export class SlottingService {
  /**
   * Analyze current slotting efficiency
   */
  static async analyzeSlotting(tenantId: string, siteId: string): Promise<any> {
    const locations = await prisma.location.findMany({
      where: { tenantId, siteId, type: "STOCK" },
      include: {
        balances: {
          include: { item: true },
        },
      },
    });

    // Calculate metrics
    const metrics = {
      totalLocations: locations.length,
      usedLocations: 0,
      emptyLocations: 0,
      averageUtilization: 0,
      itemsInWrongZone: 0,
      consolidationOpportunities: 0,
    };

    const itemLocationMap = new Map<string, string[]>();

    for (const location of locations) {
      const totalQty = location.balances.reduce((sum, b) => sum + b.qtyBase, 0);

      if (totalQty > 0) {
        metrics.usedLocations++;

        for (const balance of location.balances) {
          if (balance.qtyBase > 0) {
            // Track items across locations for consolidation analysis
            if (!itemLocationMap.has(balance.itemId)) {
              itemLocationMap.set(balance.itemId, []);
            }
            itemLocationMap.get(balance.itemId)!.push(location.id);

            // Check if item is in correct zone
            if (location.zone !== balance.item.category) {
              metrics.itemsInWrongZone++;
            }
          }
        }
      } else {
        metrics.emptyLocations++;
      }
    }

    // Count consolidation opportunities
    for (const [, locationIds] of itemLocationMap) {
      if (locationIds.length > 1) {
        metrics.consolidationOpportunities++;
      }
    }

    metrics.averageUtilization = (metrics.usedLocations / metrics.totalLocations) * 100;

    return metrics;
  }

  /**
   * Generate slotting recommendations
   */
  static async generateSlottingRecommendations(
    tenantId: string,
    siteId: string
  ): Promise<any[]> {
    const recommendations: any[] = [];

    // Get items with movement history
    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: {
          where: { siteId },
          include: { location: true },
        },
      },
    });

    // Get recent movements to calculate velocity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const item of items) {
      const movements = await prisma.inventoryEvent.count({
        where: {
          itemId: item.id,
          createdAt: { gte: thirtyDaysAgo },
          eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE"] },
        },
      });

      // Calculate velocity class
      let velocityClass: "A" | "B" | "C";
      if (movements > 50) velocityClass = "A";
      else if (movements > 20) velocityClass = "B";
      else velocityClass = "C";

      // Check current location
      for (const balance of item.balances) {
        if (balance.qtyBase > 0 && balance.location.zone) {
          const currentZone = balance.location.zone;

          // Recommend moving high-velocity items to prime locations
          if (velocityClass === "A" && currentZone !== "A") {
            recommendations.push({
              type: "RELOCATE",
              priority: "HIGH",
              itemId: item.id,
              itemSku: item.sku,
              currentLocation: balance.location.label,
              suggestedZone: "A",
              reason: `High-velocity item (${movements} moves/month) should be in Zone A`,
            });
          }

          // Recommend moving low-velocity items to less prime locations
          if (velocityClass === "C" && currentZone === "A") {
            recommendations.push({
              type: "RELOCATE",
              priority: "LOW",
              itemId: item.id,
              itemSku: item.sku,
              currentLocation: balance.location.label,
              suggestedZone: "C",
              reason: `Low-velocity item (${movements} moves/month) can be moved from Zone A`,
            });
          }
        }
      }
    }

    // Check for consolidation opportunities
    const itemLocationMap = new Map<string, { item: any; locations: any[] }>();

    for (const item of items) {
      const locationsWithItem = item.balances.filter((b) => b.qtyBase > 0);
      if (locationsWithItem.length > 1) {
        const totalQty = locationsWithItem.reduce((sum, b) => sum + b.qtyBase, 0);

        recommendations.push({
          type: "CONSOLIDATE",
          priority: "MEDIUM",
          itemId: item.id,
          itemSku: item.sku,
          currentLocations: locationsWithItem.map((b) => b.location.label),
          totalQuantity: totalQty,
          reason: `Item spread across ${locationsWithItem.length} locations, consider consolidating`,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
  }

  /**
   * Perform ABC velocity analysis
   */
  static async performABCAnalysis(tenantId: string, siteId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get movement counts for all items
    const items = await prisma.item.findMany({
      where: { tenantId },
    });

    const itemMovements: { item: any; movements: number; value: number }[] = [];

    for (const item of items) {
      const movements = await prisma.inventoryEvent.count({
        where: {
          itemId: item.id,
          createdAt: { gte: thirtyDaysAgo },
          eventType: { in: ["ISSUE_TO_WORKCELL", "MOVE", "RECEIVE"] },
        },
      });

      const balance = await prisma.inventoryBalance.aggregate({
        where: {
          itemId: item.id,
          siteId,
        },
        _sum: {
          qtyBase: true,
        },
      });

      const value = (balance._sum.qtyBase || 0) * (item.costBase || 0);

      itemMovements.push({
        item,
        movements,
        value,
      });
    }

    // Sort by movements
    itemMovements.sort((a, b) => b.movements - a.movements);

    // Classify into ABC
    const total = itemMovements.length;
    const aCount = Math.ceil(total * 0.2);
    const bCount = Math.ceil(total * 0.3);

    const classified = {
      A: itemMovements.slice(0, aCount).map((im) => ({
        id: im.item.id,
        sku: im.item.sku,
        name: im.item.name,
        movements: im.movements,
        value: im.value,
      })),
      B: itemMovements.slice(aCount, aCount + bCount).map((im) => ({
        id: im.item.id,
        sku: im.item.sku,
        name: im.item.name,
        movements: im.movements,
        value: im.value,
      })),
      C: itemMovements.slice(aCount + bCount).map((im) => ({
        id: im.item.id,
        sku: im.item.sku,
        name: im.item.name,
        movements: im.movements,
        value: im.value,
      })),
    };

    return {
      summary: {
        totalItems: total,
        aItems: classified.A.length,
        bItems: classified.B.length,
        cItems: classified.C.length,
        aMovements: classified.A.reduce((sum, i) => sum + i.movements, 0),
        bMovements: classified.B.reduce((sum, i) => sum + i.movements, 0),
        cMovements: classified.C.reduce((sum, i) => sum + i.movements, 0),
      },
      items: classified,
    };
  }
}

// ============================================================
// TASK MANAGEMENT SERVICE
// ============================================================

export class TaskManagementService {
  /**
   * Get tasks for a user
   */
  static async getUserTasks(
    tenantId: string,
    userId: string,
    status?: TaskStatus[]
  ): Promise<any[]> {
    const pickTasks = await prisma.pickTask.findMany({
      where: {
        tenantId,
        assignedToUserId: userId,
        ...(status && { status: { in: status } }),
      },
      include: {
        salesOrder: {
          include: { customer: true },
        },
        lines: {
          include: {
            item: true,
            location: true,
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
    });

    return pickTasks.map((task) => ({
      id: task.id,
      type: "PICK",
      taskNumber: task.taskNumber,
      status: task.status,
      priority: task.priority,
      orderNumber: task.salesOrder.orderNumber,
      customerName: task.salesOrder.customer.name,
      totalLines: task.lines.length,
      completedLines: task.lines.filter((l) => l.status === "PICKED").length,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
    }));
  }

  /**
   * Assign tasks to users
   */
  static async assignTasks(params: {
    taskIds: string[];
    userId: string;
    taskType: "PICK" | "PUTAWAY";
  }): Promise<number> {
    const { taskIds, userId, taskType } = params;

    if (taskType === "PICK") {
      const result = await prisma.pickTask.updateMany({
        where: { id: { in: taskIds } },
        data: {
          assignedToUserId: userId,
          assignedAt: new Date(),
          status: "ASSIGNED",
        },
      });
      return result.count;
    }

    return 0;
  }

  /**
   * Get warehouse workload overview
   */
  static async getWorkloadOverview(tenantId: string, siteId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingPicks, inProgressPicks, completedPicks, pendingOrders] = await Promise.all([
      prisma.pickTask.count({
        where: { tenantId, siteId, status: "PENDING" },
      }),
      prisma.pickTask.count({
        where: { tenantId, siteId, status: "IN_PROGRESS" },
      }),
      prisma.pickTask.count({
        where: {
          tenantId,
          siteId,
          status: "COMPLETED",
          completedAt: { gte: today },
        },
      }),
      prisma.salesOrder.count({
        where: { tenantId, siteId, status: "CONFIRMED" },
      }),
    ]);

    // Get user productivity
    const userStats = await prisma.pickTask.groupBy({
      by: ["completedByUserId"],
      where: {
        tenantId,
        siteId,
        status: "COMPLETED",
        completedAt: { gte: today },
        completedByUserId: { not: null },
      },
      _count: true,
    });

    return {
      picking: {
        pending: pendingPicks,
        inProgress: inProgressPicks,
        completedToday: completedPicks,
      },
      orders: {
        pendingAllocation: pendingOrders,
      },
      productivity: userStats.map((s) => ({
        userId: s.completedByUserId,
        tasksCompleted: s._count,
      })),
    };
  }
}
