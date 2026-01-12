/**
 * Advanced Lot/Serial Tracking System
 *
 * Full traceability with FIFO/LIFO/FEFO enforcement, expiration management,
 * and recall management capabilities
 */

import { prisma } from "./prisma";
import { Uom } from "@prisma/client";

export type AllocationStrategy = "FIFO" | "LIFO" | "FEFO" | "MANUAL";
export type LotStatus = "AVAILABLE" | "QUARANTINE" | "HOLD" | "CONSUMED" | "EXPIRED";
export type SerialStatus = "AVAILABLE" | "ALLOCATED" | "SHIPPED" | "CONSUMED" | "WARRANTY_RETURN" | "SCRAPPED";

export interface LotAllocation {
  lotId: string;
  lotNumber: string;
  qtyAllocated: number;
  expirationDate?: Date;
  productionDate: Date;
}

export interface SerialAllocation {
  serialNumberId: string;
  serialNumber: string;
  lotId?: string;
  lotNumber?: string;
}

export interface TraceabilityRecord {
  type: "LOT" | "SERIAL";
  identifier: string;
  item: {
    id: string;
    sku: string;
    name: string;
  };
  history: {
    timestamp: Date;
    event: string;
    details: string;
    userId?: string;
    userName?: string;
  }[];
  currentStatus: string;
  currentLocation?: string;
  quantityRemaining?: number;
  relatedDocuments: {
    type: string;
    number: string;
    id: string;
  }[];
}

export interface RecallScope {
  affectedLots: string[];
  affectedSerials: string[];
  affectedCustomers: {
    customerId: string;
    customerName: string;
    shipments: string[];
  }[];
  totalQtyAffected: number;
}

export class LotSerialTrackingService {
  /**
   * Create a new lot
   */
  static async createLot(params: {
    tenantId: string;
    itemId: string;
    lotNumber: string;
    qtyProduced: number;
    uom: Uom;
    productionDate: Date;
    expirationDate?: Date;
    supplierId?: string;
    productionOrderId?: string;
    supplierLotNumber?: string;
    batchNumber?: string;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const lot = await prisma.lot.create({
      data: {
        tenantId: params.tenantId,
        itemId: params.itemId,
        lotNumber: params.lotNumber,
        qtyProduced: params.qtyProduced,
        qtyAvailable: params.qtyProduced,
        uom: params.uom,
        productionDate: params.productionDate,
        expirationDate: params.expirationDate,
        supplierId: params.supplierId,
        productionOrderId: params.productionOrderId,
        supplierLotNumber: params.supplierLotNumber,
        batchNumber: params.batchNumber,
        notes: params.notes,
        status: "AVAILABLE",
        qcStatus: "PENDING",
      },
    });

    // Record history
    await prisma.lotHistory.create({
      data: {
        lotId: lot.id,
        eventType: "CREATED",
        qtyBefore: 0,
        qtyAfter: params.qtyProduced,
        qtyChanged: params.qtyProduced,
        notes: `Lot created with quantity ${params.qtyProduced}`,
        userId: params.userId,
      },
    });

    return lot;
  }

  /**
   * Create a new serial number
   */
  static async createSerialNumber(params: {
    tenantId: string;
    itemId: string;
    serialNumber: string;
    lotId?: string;
    manufacturedDate?: Date;
    warrantyExpiry?: Date;
    locationId?: string;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const serial = await prisma.serialNumber.create({
      data: {
        tenantId: params.tenantId,
        itemId: params.itemId,
        serialNumber: params.serialNumber,
        lotId: params.lotId,
        manufacturedDate: params.manufacturedDate,
        warrantyExpiry: params.warrantyExpiry,
        currentLocationId: params.locationId,
        notes: params.notes,
        status: "AVAILABLE",
        receivedDate: new Date(),
      },
    });

    // Record history
    await prisma.serialNumberHistory.create({
      data: {
        serialNumberId: serial.id,
        eventType: "RECEIVED",
        statusBefore: null,
        statusAfter: "AVAILABLE",
        locationAfter: params.locationId,
        notes: "Serial number created",
        userId: params.userId,
      },
    });

    return serial;
  }

  /**
   * Allocate inventory using specified strategy (FIFO/LIFO/FEFO)
   */
  static async allocateInventory(params: {
    tenantId: string;
    itemId: string;
    qtyNeeded: number;
    strategy: AllocationStrategy;
    excludeExpiredDays?: number; // Exclude lots expiring within X days
    specificLotIds?: string[]; // For manual allocation
  }): Promise<LotAllocation[]> {
    const { tenantId, itemId, qtyNeeded, strategy, excludeExpiredDays = 0, specificLotIds } = params;

    // Build query based on strategy
    let orderBy: any;
    switch (strategy) {
      case "FIFO":
        orderBy = { productionDate: "asc" as const };
        break;
      case "LIFO":
        orderBy = { productionDate: "desc" as const };
        break;
      case "FEFO":
        orderBy = { expirationDate: "asc" as const };
        break;
      case "MANUAL":
        if (!specificLotIds || specificLotIds.length === 0) {
          throw new Error("Manual allocation requires specificLotIds");
        }
        break;
    }

    // Calculate minimum acceptable expiration date
    const minExpirationDate = new Date();
    minExpirationDate.setDate(minExpirationDate.getDate() + excludeExpiredDays);

    // Get available lots
    const whereClause: any = {
      tenantId,
      itemId,
      status: "AVAILABLE",
      qtyAvailable: { gt: 0 },
    };

    if (strategy !== "MANUAL") {
      whereClause.OR = [
        { expirationDate: null },
        { expirationDate: { gte: minExpirationDate } },
      ];
    } else {
      whereClause.id = { in: specificLotIds };
    }

    const lots = await prisma.lot.findMany({
      where: whereClause,
      orderBy: strategy !== "MANUAL" ? orderBy : undefined,
    });

    // Allocate from lots
    const allocations: LotAllocation[] = [];
    let remainingQty = qtyNeeded;

    for (const lot of lots) {
      if (remainingQty <= 0) break;

      const qtyToAllocate = Math.min(remainingQty, lot.qtyAvailable);

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        qtyAllocated: qtyToAllocate,
        expirationDate: lot.expirationDate || undefined,
        productionDate: lot.productionDate,
      });

      remainingQty -= qtyToAllocate;
    }

    if (remainingQty > 0) {
      throw new Error(`Insufficient inventory. Short by ${remainingQty} units.`);
    }

    return allocations;
  }

  /**
   * Allocate serial numbers
   */
  static async allocateSerialNumbers(params: {
    tenantId: string;
    itemId: string;
    qtyNeeded: number;
    specificSerials?: string[]; // For manual selection
    preferLotId?: string; // Prefer serials from specific lot
  }): Promise<SerialAllocation[]> {
    const { tenantId, itemId, qtyNeeded, specificSerials, preferLotId } = params;

    const whereClause: any = {
      tenantId,
      itemId,
      status: "AVAILABLE",
    };

    if (specificSerials && specificSerials.length > 0) {
      whereClause.serialNumber = { in: specificSerials };
    }

    if (preferLotId) {
      whereClause.lotId = preferLotId;
    }

    const serials = await prisma.serialNumber.findMany({
      where: whereClause,
      include: {
        lot: true,
      },
      take: qtyNeeded,
    });

    if (serials.length < qtyNeeded) {
      throw new Error(`Insufficient serial numbers. Found ${serials.length}, need ${qtyNeeded}.`);
    }

    return serials.map((s) => ({
      serialNumberId: s.id,
      serialNumber: s.serialNumber,
      lotId: s.lotId || undefined,
      lotNumber: s.lot?.lotNumber,
    }));
  }

  /**
   * Consume lot inventory
   */
  static async consumeLot(params: {
    lotId: string;
    qtyConsumed: number;
    referenceType?: string;
    referenceId?: string;
    userId?: string;
    notes?: string;
  }): Promise<any> {
    const { lotId, qtyConsumed, userId, notes } = params;

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Lot not found");
    if (lot.qtyAvailable < qtyConsumed) {
      throw new Error(`Insufficient quantity. Available: ${lot.qtyAvailable}, Requested: ${qtyConsumed}`);
    }

    const newQtyAvailable = lot.qtyAvailable - qtyConsumed;
    const newQtyConsumed = lot.qtyConsumed + qtyConsumed;
    const newStatus = newQtyAvailable <= 0 ? "CONSUMED" : lot.status;

    const updatedLot = await prisma.lot.update({
      where: { id: lotId },
      data: {
        qtyAvailable: newQtyAvailable,
        qtyConsumed: newQtyConsumed,
        status: newStatus,
      },
    });

    await prisma.lotHistory.create({
      data: {
        lotId,
        eventType: "CONSUMED",
        qtyBefore: lot.qtyAvailable,
        qtyAfter: newQtyAvailable,
        qtyChanged: -qtyConsumed,
        notes: notes || `Consumed ${qtyConsumed} units`,
        userId,
      },
    });

    return updatedLot;
  }

  /**
   * Consume serial number
   */
  static async consumeSerialNumber(params: {
    serialNumberId: string;
    referenceType?: string;
    referenceId?: string;
    userId?: string;
    notes?: string;
  }): Promise<any> {
    const { serialNumberId, userId, notes } = params;

    const serial = await prisma.serialNumber.findUnique({ where: { id: serialNumberId } });
    if (!serial) throw new Error("Serial number not found");
    if (serial.status !== "AVAILABLE" && serial.status !== "ALLOCATED") {
      throw new Error(`Cannot consume serial number with status: ${serial.status}`);
    }

    const updatedSerial = await prisma.serialNumber.update({
      where: { id: serialNumberId },
      data: {
        status: "CONSUMED",
      },
    });

    await prisma.serialNumberHistory.create({
      data: {
        serialNumberId,
        eventType: "CONSUMED",
        statusBefore: serial.status,
        statusAfter: "CONSUMED",
        notes: notes || "Serial number consumed",
        userId,
      },
    });

    return updatedSerial;
  }

  /**
   * Place lot on hold
   */
  static async holdLot(params: {
    lotId: string;
    reasonCodeId: string;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const { lotId, reasonCodeId, notes, userId } = params;

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Lot not found");

    const updatedLot = await prisma.lot.update({
      where: { id: lotId },
      data: {
        status: "HOLD",
        holdReasonId: reasonCodeId,
      },
    });

    await prisma.lotHistory.create({
      data: {
        lotId,
        eventType: "HOLD",
        qtyBefore: lot.qtyAvailable,
        qtyAfter: lot.qtyAvailable,
        qtyChanged: 0,
        notes: notes || "Lot placed on hold",
        userId,
      },
    });

    return updatedLot;
  }

  /**
   * Release lot from hold
   */
  static async releaseLot(params: {
    lotId: string;
    notes?: string;
    userId?: string;
  }): Promise<any> {
    const { lotId, notes, userId } = params;

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Lot not found");
    if (lot.status !== "HOLD" && lot.status !== "QUARANTINE") {
      throw new Error("Lot is not on hold or quarantine");
    }

    const updatedLot = await prisma.lot.update({
      where: { id: lotId },
      data: {
        status: "AVAILABLE",
        holdReasonId: null,
      },
    });

    await prisma.lotHistory.create({
      data: {
        lotId,
        eventType: "RELEASE",
        qtyBefore: lot.qtyAvailable,
        qtyAfter: lot.qtyAvailable,
        qtyChanged: 0,
        notes: notes || "Lot released from hold",
        userId,
      },
    });

    return updatedLot;
  }

  /**
   * Check for expiring lots
   */
  static async getExpiringLots(params: {
    tenantId: string;
    daysUntilExpiration: number;
    itemId?: string;
  }): Promise<any[]> {
    const { tenantId, daysUntilExpiration, itemId } = params;

    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + daysUntilExpiration);

    return prisma.lot.findMany({
      where: {
        tenantId,
        status: "AVAILABLE",
        qtyAvailable: { gt: 0 },
        expirationDate: {
          lte: expirationThreshold,
          gte: new Date(),
        },
        ...(itemId && { itemId }),
      },
      include: {
        item: true,
      },
      orderBy: {
        expirationDate: "asc",
      },
    });
  }

  /**
   * Process expired lots
   */
  static async processExpiredLots(tenantId: string, userId?: string): Promise<number> {
    const expiredLots = await prisma.lot.findMany({
      where: {
        tenantId,
        status: "AVAILABLE",
        expirationDate: { lt: new Date() },
      },
    });

    for (const lot of expiredLots) {
      await prisma.lot.update({
        where: { id: lot.id },
        data: { status: "EXPIRED" },
      });

      await prisma.lotHistory.create({
        data: {
          lotId: lot.id,
          eventType: "EXPIRED",
          qtyBefore: lot.qtyAvailable,
          qtyAfter: lot.qtyAvailable,
          qtyChanged: 0,
          notes: "Lot automatically expired",
          userId,
        },
      });
    }

    return expiredLots.length;
  }

  /**
   * Get full traceability for a lot
   */
  static async getLotTraceability(lotId: string): Promise<TraceabilityRecord> {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        item: true,
        supplier: true,
        productionOrder: true,
        inspections: true,
        lotHistory: {
          orderBy: { createdAt: "desc" },
        },
        serialNumbers: {
          include: {
            shipment: true,
            customer: true,
          },
        },
      },
    });

    if (!lot) throw new Error("Lot not found");

    const relatedDocuments: any[] = [];

    if (lot.productionOrder) {
      relatedDocuments.push({
        type: "Production Order",
        number: lot.productionOrder.orderNumber,
        id: lot.productionOrder.id,
      });
    }

    if (lot.supplier) {
      relatedDocuments.push({
        type: "Supplier",
        number: lot.supplier.code,
        id: lot.supplier.id,
      });
    }

    for (const inspection of lot.inspections) {
      relatedDocuments.push({
        type: "Quality Inspection",
        number: inspection.inspectionNumber,
        id: inspection.id,
      });
    }

    // Get shipments through serial numbers
    const shipmentIds = new Set<string>();
    for (const serial of lot.serialNumbers) {
      if (serial.shipment && !shipmentIds.has(serial.shipment.id)) {
        shipmentIds.add(serial.shipment.id);
        relatedDocuments.push({
          type: "Shipment",
          number: serial.shipment.shipmentNumber,
          id: serial.shipment.id,
        });
      }
    }

    return {
      type: "LOT",
      identifier: lot.lotNumber,
      item: {
        id: lot.item.id,
        sku: lot.item.sku,
        name: lot.item.name,
      },
      history: lot.lotHistory.map((h) => ({
        timestamp: h.createdAt,
        event: h.eventType,
        details: h.notes || "",
        userId: h.userId || undefined,
      })),
      currentStatus: lot.status,
      quantityRemaining: lot.qtyAvailable,
      relatedDocuments,
    };
  }

  /**
   * Get full traceability for a serial number
   */
  static async getSerialTraceability(serialNumberId: string): Promise<TraceabilityRecord> {
    const serial = await prisma.serialNumber.findUnique({
      where: { id: serialNumberId },
      include: {
        item: true,
        lot: true,
        location: true,
        customer: true,
        salesOrder: true,
        shipment: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!serial) throw new Error("Serial number not found");

    const relatedDocuments: any[] = [];

    if (serial.lot) {
      relatedDocuments.push({
        type: "Lot",
        number: serial.lot.lotNumber,
        id: serial.lot.id,
      });
    }

    if (serial.salesOrder) {
      relatedDocuments.push({
        type: "Sales Order",
        number: serial.salesOrder.orderNumber,
        id: serial.salesOrder.id,
      });
    }

    if (serial.shipment) {
      relatedDocuments.push({
        type: "Shipment",
        number: serial.shipment.shipmentNumber,
        id: serial.shipment.id,
      });
    }

    if (serial.customer) {
      relatedDocuments.push({
        type: "Customer",
        number: serial.customer.code,
        id: serial.customer.id,
      });
    }

    return {
      type: "SERIAL",
      identifier: serial.serialNumber,
      item: {
        id: serial.item.id,
        sku: serial.item.sku,
        name: serial.item.name,
      },
      history: serial.history.map((h) => ({
        timestamp: h.createdAt,
        event: h.eventType,
        details: h.notes || "",
        userId: h.userId || undefined,
      })),
      currentStatus: serial.status,
      currentLocation: serial.location?.label,
      relatedDocuments,
    };
  }

  /**
   * Initiate a recall - find all affected inventory and customers
   */
  static async initiateRecall(params: {
    tenantId: string;
    lotNumbers: string[];
    itemId?: string;
  }): Promise<RecallScope> {
    const { tenantId, lotNumbers, itemId } = params;

    // Find affected lots
    const affectedLots = await prisma.lot.findMany({
      where: {
        tenantId,
        lotNumber: { in: lotNumbers },
        ...(itemId && { itemId }),
      },
      include: {
        serialNumbers: {
          include: {
            customer: true,
            shipment: true,
          },
        },
      },
    });

    const affectedLotIds = affectedLots.map((l) => l.id);
    const affectedSerials: string[] = [];
    const customerMap = new Map<string, { name: string; shipments: Set<string> }>();
    let totalQtyAffected = 0;

    for (const lot of affectedLots) {
      totalQtyAffected += lot.qtyProduced;

      for (const serial of lot.serialNumbers) {
        affectedSerials.push(serial.serialNumber);

        if (serial.customer) {
          if (!customerMap.has(serial.customer.id)) {
            customerMap.set(serial.customer.id, {
              name: serial.customer.name,
              shipments: new Set(),
            });
          }
          if (serial.shipment) {
            customerMap.get(serial.customer.id)!.shipments.add(serial.shipment.shipmentNumber);
          }
        }
      }

      // Put lot on quarantine
      await prisma.lot.update({
        where: { id: lot.id },
        data: { status: "QUARANTINE" },
      });

      await prisma.lotHistory.create({
        data: {
          lotId: lot.id,
          eventType: "QUARANTINE",
          qtyBefore: lot.qtyAvailable,
          qtyAfter: lot.qtyAvailable,
          qtyChanged: 0,
          notes: "Lot quarantined for recall",
        },
      });
    }

    return {
      affectedLots: lotNumbers,
      affectedSerials,
      affectedCustomers: Array.from(customerMap.entries()).map(([id, data]) => ({
        customerId: id,
        customerName: data.name,
        shipments: Array.from(data.shipments),
      })),
      totalQtyAffected,
    };
  }

  /**
   * Get lot inventory summary by item
   */
  static async getLotSummaryByItem(tenantId: string, itemId: string): Promise<any> {
    const lots = await prisma.lot.findMany({
      where: {
        tenantId,
        itemId,
        qtyAvailable: { gt: 0 },
      },
      orderBy: {
        expirationDate: "asc",
      },
    });

    const totalAvailable = lots.reduce((sum, lot) => sum + lot.qtyAvailable, 0);
    const totalAllocated = lots.reduce((sum, lot) => sum + lot.qtyAllocated, 0);

    const expiringWithin30Days = lots.filter((lot) => {
      if (!lot.expirationDate) return false;
      const daysUntilExpiry = Math.ceil(
        (lot.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });

    const expiredLots = lots.filter(
      (lot) => lot.expirationDate && lot.expirationDate < new Date()
    );

    return {
      totalLots: lots.length,
      totalAvailable,
      totalAllocated,
      expiringWithin30Days: expiringWithin30Days.length,
      expiredLots: expiredLots.length,
      lots: lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        qtyAvailable: lot.qtyAvailable,
        qtyAllocated: lot.qtyAllocated,
        status: lot.status,
        qcStatus: lot.qcStatus,
        productionDate: lot.productionDate,
        expirationDate: lot.expirationDate,
        daysUntilExpiry: lot.expirationDate
          ? Math.ceil((lot.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    };
  }

  /**
   * Generate unique lot number
   */
  static async generateLotNumber(tenantId: string, prefix?: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const basePrefix = prefix || "LOT";

    // Find the highest sequence for today
    const existingLots = await prisma.lot.findMany({
      where: {
        tenantId,
        lotNumber: {
          startsWith: `${basePrefix}-${dateStr}`,
        },
      },
      orderBy: {
        lotNumber: "desc",
      },
      take: 1,
    });

    let sequence = 1;
    if (existingLots.length > 0) {
      const lastNumber = existingLots[0].lotNumber;
      const lastSequence = parseInt(lastNumber.split("-").pop() || "0", 10);
      sequence = lastSequence + 1;
    }

    return `${basePrefix}-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  /**
   * Generate unique serial number
   */
  static async generateSerialNumber(tenantId: string, prefix?: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const basePrefix = prefix || "SN";

    const existingSerials = await prisma.serialNumber.findMany({
      where: {
        tenantId,
        serialNumber: {
          startsWith: `${basePrefix}-${dateStr}`,
        },
      },
      orderBy: {
        serialNumber: "desc",
      },
      take: 1,
    });

    let sequence = 1;
    if (existingSerials.length > 0) {
      const lastNumber = existingSerials[0].serialNumber;
      const lastSequence = parseInt(lastNumber.split("-").pop() || "0", 10);
      sequence = lastSequence + 1;
    }

    return `${basePrefix}-${dateStr}-${sequence.toString().padStart(6, "0")}`;
  }
}
