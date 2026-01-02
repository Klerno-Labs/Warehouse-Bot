import { prisma } from "./prisma";
import type { SessionUser } from "@shared/schema";
import type {
  User,
  Tenant,
  Site,
  Item,
  Location,
  ReasonCode,
  InventoryEvent,
  InventoryBalance,
  CycleCount,
  CycleCountLine,
  Job,
  JobLine,
  AuditEvent,
  Department,
  Workcell,
  Device,
  Prisma,
} from "@prisma/client";

class Storage {
  // ==================== USER METHODS ====================

  async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async getUser(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getSessionUser(userId: string): Promise<SessionUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        siteIds: true,
        isActive: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      siteIds: user.siteIds,
      isActive: user.isActive,
    };
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // ==================== TENANT METHODS ====================

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  // ==================== SITE METHODS ====================

  async getSitesForUser(userId: string): Promise<Site[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { siteIds: true },
    });

    if (!user || user.siteIds.length === 0) {
      return [];
    }

    return prisma.site.findMany({
      where: {
        id: { in: user.siteIds },
      },
      orderBy: { name: "asc" },
    });
  }

  // ==================== DEPARTMENT METHODS ====================

  async getDepartmentsBySite(siteId: string): Promise<Department[]> {
    return prisma.department.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
    });
  }

  // ==================== WORKCELL METHODS ====================

  async getWorkcellsBySite(siteId: string): Promise<Workcell[]> {
    return prisma.workcell.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
    });
  }

  // ==================== DEVICE METHODS ====================

  async getDevicesBySite(siteId: string): Promise<Device[]> {
    return prisma.device.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
    });
  }

  // ==================== ITEM METHODS ====================

  async getItemsByTenant(tenantId: string): Promise<Item[]> {
    return prisma.item.findMany({
      where: { tenantId },
      orderBy: { sku: "asc" },
    });
  }

  async getItemById(itemId: string): Promise<Item | null> {
    return prisma.item.findUnique({
      where: { id: itemId },
    });
  }

  async getItemBySku(tenantId: string, sku: string): Promise<Item | null> {
    return prisma.item.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku,
        },
      },
    });
  }

  async createItem(data: Omit<Item, "id" | "createdAt" | "updatedAt">): Promise<Item> {
    return prisma.item.create({
      data: data as any,
    });
  }

  async updateItem(itemId: string, data: Partial<Omit<Item, "id" | "tenantId" | "createdAt" | "updatedAt">>): Promise<Item> {
    return prisma.item.update({
      where: { id: itemId },
      data: data as any,
    });
  }

  // ==================== LOCATION METHODS ====================

  async getLocationsBySite(siteId: string): Promise<Location[]> {
    return prisma.location.findMany({
      where: { siteId },
      orderBy: { label: "asc" },
    });
  }

  async getLocationById(locationId: string): Promise<Location | null> {
    return prisma.location.findUnique({
      where: { id: locationId },
    });
  }

  async getLocationByLabel(siteId: string, label: string): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        siteId,
        label,
      },
    });
  }

  async createLocation(data: Omit<Location, "id" | "createdAt" | "updatedAt">): Promise<Location> {
    return prisma.location.create({
      data,
    });
  }

  async updateLocation(locationId: string, data: Partial<Location>): Promise<Location> {
    return prisma.location.update({
      where: { id: locationId },
      data,
    });
  }

  // ==================== REASON CODE METHODS ====================

  async getReasonCodesByTenant(tenantId: string): Promise<ReasonCode[]> {
    return prisma.reasonCode.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    });
  }

  async getReasonCodeById(reasonCodeId: string): Promise<ReasonCode | null> {
    return prisma.reasonCode.findUnique({
      where: { id: reasonCodeId },
    });
  }

  async createReasonCode(data: Omit<ReasonCode, "id" | "createdAt" | "updatedAt">): Promise<ReasonCode> {
    return prisma.reasonCode.create({
      data,
    });
  }

  async updateReasonCode(reasonCodeId: string, data: Partial<ReasonCode>): Promise<ReasonCode> {
    return prisma.reasonCode.update({
      where: { id: reasonCodeId },
      data,
    });
  }

  // ==================== INVENTORY EVENT METHODS ====================

  async getInventoryEventsByTenant(tenantId: string): Promise<InventoryEvent[]> {
    return prisma.inventoryEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 1000, // Limit to most recent 1000 events
    });
  }

  async createInventoryEvent(data: Omit<InventoryEvent, "id" | "createdAt">): Promise<InventoryEvent> {
    return prisma.inventoryEvent.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }

  // ==================== INVENTORY BALANCE METHODS ====================

  async getInventoryBalancesBySite(siteId: string): Promise<InventoryBalance[]> {
    return prisma.inventoryBalance.findMany({
      where: { siteId },
      orderBy: [
        { itemId: "asc" },
        { locationId: "asc" },
      ],
    });
  }

  async getInventoryBalance(
    tenantId: string,
    itemId: string,
    locationId: string
  ): Promise<InventoryBalance | null> {
    return prisma.inventoryBalance.findUnique({
      where: {
        tenantId_itemId_locationId: {
          tenantId,
          itemId,
          locationId,
        },
      },
    });
  }

  async upsertInventoryBalance(data: {
    tenantId: string;
    siteId: string;
    itemId: string;
    locationId: string;
    qtyBase: number;
  }): Promise<InventoryBalance> {
    return prisma.inventoryBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId: data.tenantId,
          itemId: data.itemId,
          locationId: data.locationId,
        },
      },
      update: {
        qtyBase: data.qtyBase,
      },
      create: data,
    });
  }

  // ==================== CYCLE COUNT METHODS ====================

  async getCycleCountsByTenant(tenantId: string): Promise<CycleCount[]> {
    return prisma.cycleCount.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCycleCountById(cycleCountId: string): Promise<CycleCount | null> {
    return prisma.cycleCount.findUnique({
      where: { id: cycleCountId },
    });
  }

  async createCycleCount(data: Omit<CycleCount, "id" | "createdAt" | "updatedAt">): Promise<CycleCount> {
    return prisma.cycleCount.create({
      data,
    });
  }

  async updateCycleCount(cycleCountId: string, data: Partial<CycleCount>): Promise<CycleCount> {
    return prisma.cycleCount.update({
      where: { id: cycleCountId },
      data,
    });
  }

  async deleteCycleCountLinesByCycleCount(cycleCountId: string): Promise<void> {
    await prisma.cycleCountLine.deleteMany({
      where: { cycleCountId },
    });
  }

  // ==================== CYCLE COUNT LINE METHODS ====================

  async getCycleCountLinesByCycleCount(cycleCountId: string): Promise<CycleCountLine[]> {
    return prisma.cycleCountLine.findMany({
      where: { cycleCountId },
      orderBy: { id: "asc" },
    });
  }

  async getCycleCountLineById(cycleCountLineId: string): Promise<CycleCountLine | null> {
    return prisma.cycleCountLine.findUnique({
      where: { id: cycleCountLineId },
    });
  }

  async createCycleCountLine(data: Omit<CycleCountLine, "id" | "createdAt" | "updatedAt">): Promise<CycleCountLine> {
    return prisma.cycleCountLine.create({
      data,
    });
  }

  async updateCycleCountLine(cycleCountLineId: string, data: Partial<CycleCountLine>): Promise<CycleCountLine> {
    return prisma.cycleCountLine.update({
      where: { id: cycleCountLineId },
      data,
    });
  }

  // ==================== JOB METHODS ====================

  async getJobsByTenant(tenantId: string): Promise<Job[]> {
    return prisma.job.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getJobById(jobId: string): Promise<Job | null> {
    return prisma.job.findUnique({
      where: { id: jobId },
    });
  }

  async getNextJobNumber(tenantId: string): Promise<string> {
    const lastJob = await prisma.job.findFirst({
      where: { tenantId },
      orderBy: { jobNumber: "desc" },
      select: { jobNumber: true },
    });

    if (!lastJob) {
      return "JOB-0001";
    }

    // Extract number from format like "JOB-0001"
    const match = lastJob.jobNumber.match(/JOB-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `JOB-${nextNum.toString().padStart(4, "0")}`;
    }

    return "JOB-0001";
  }

  async createJob(data: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job> {
    return prisma.job.create({
      data,
    });
  }

  async updateJob(jobId: string, data: Partial<Job>): Promise<Job> {
    return prisma.job.update({
      where: { id: jobId },
      data,
    });
  }

  async deleteJobLinesByJob(jobId: string): Promise<void> {
    await prisma.jobLine.deleteMany({
      where: { jobId },
    });
  }

  // ==================== JOB LINE METHODS ====================

  async getJobLinesByJob(jobId: string): Promise<JobLine[]> {
    return prisma.jobLine.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });
  }

  async getJobLineById(jobLineId: string): Promise<JobLine | null> {
    return prisma.jobLine.findUnique({
      where: { id: jobLineId },
    });
  }

  async createJobLine(data: Omit<JobLine, "id" | "createdAt" | "updatedAt">): Promise<JobLine> {
    return prisma.jobLine.create({
      data,
    });
  }

  async updateJobLine(jobLineId: string, data: Partial<JobLine>): Promise<JobLine> {
    return prisma.jobLine.update({
      where: { id: jobLineId },
      data,
    });
  }

  // ==================== AUDIT EVENT METHODS ====================

  async getAuditEvents(tenantId: string, limit: number = 100): Promise<AuditEvent[]> {
    return prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  async createAuditEvent(data: Omit<AuditEvent, "id" | "timestamp">): Promise<AuditEvent> {
    return prisma.auditEvent.create({
      data: {
        ...data,
        timestamp: new Date(),
      },
    });
  }

  // ==================== PURCHASING - SUPPLIER METHODS ====================

  async getSuppliersByTenant(tenantId: string) {
    return prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  async getSupplierById(supplierId: string) {
    return prisma.supplier.findUnique({
      where: { id: supplierId },
    });
  }

  async createSupplier(data: any) {
    return prisma.supplier.create({
      data,
    });
  }

  async updateSupplier(supplierId: string, data: any) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data,
    });
  }

  async deleteSupplier(supplierId: string) {
    return prisma.supplier.delete({
      where: { id: supplierId },
    });
  }

  // ==================== PURCHASING - PURCHASE ORDER METHODS ====================

  async getPurchaseOrdersByTenant(tenantId: string) {
    return prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        site: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPurchaseOrderById(poId: string) {
    return prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        supplier: true,
        site: true,
        createdBy: true,
        approvedBy: true,
        lines: {
          include: {
            item: true,
          },
          orderBy: { lineNumber: "asc" },
        },
      },
    });
  }

  async createPurchaseOrder(data: any) {
    return prisma.purchaseOrder.create({
      data,
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async updatePurchaseOrder(poId: string, data: any) {
    return prisma.purchaseOrder.update({
      where: { id: poId },
      data,
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async deletePurchaseOrder(poId: string) {
    return prisma.purchaseOrder.delete({
      where: { id: poId },
    });
  }

  // ==================== PURCHASING - PO LINE METHODS ====================

  async createPurchaseOrderLine(data: any) {
    return prisma.purchaseOrderLine.create({
      data,
      include: {
        item: true,
      },
    });
  }

  async updatePurchaseOrderLine(lineId: string, data: any) {
    return prisma.purchaseOrderLine.update({
      where: { id: lineId },
      data,
      include: {
        item: true,
      },
    });
  }

  async deletePurchaseOrderLine(lineId: string) {
    return prisma.purchaseOrderLine.delete({
      where: { id: lineId },
    });
  }

  // ==================== PURCHASING - RECEIPT METHODS ====================

  async getReceiptsByTenant(tenantId: string) {
    return prisma.receipt.findMany({
      where: { tenantId },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        location: true,
        lines: {
          include: {
            item: true,
            purchaseOrderLine: true,
          },
        },
      },
      orderBy: { receiptDate: "desc" },
    });
  }

  async getReceiptById(receiptId: string) {
    return prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        location: true,
        lines: {
          include: {
            item: true,
            purchaseOrderLine: true,
          },
        },
      },
    });
  }

  async createReceipt(data: any) {
    return prisma.receipt.create({
      data,
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async createReceiptLine(data: any) {
    return prisma.receiptLine.create({
      data,
      include: {
        item: true,
        purchaseOrderLine: true,
      },
    });
  }

  // ==================== MANUFACTURING - BOM METHODS ====================

  async getBOMsByTenant(tenantId: string) {
    return prisma.billOfMaterial.findMany({
      where: { tenantId },
      include: {
        item: true,
        components: {
          include: {
            item: true,
          },
          orderBy: { sequence: "asc" },
        },
        _count: {
          select: {
            components: true,
            productionOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getBOMById(bomId: string) {
    return prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        item: true,
        createdBy: true,
        approvedBy: true,
        components: {
          include: {
            item: true,
          },
          orderBy: { sequence: "asc" },
        },
        _count: {
          select: {
            productionOrders: true,
          },
        },
      },
    });
  }

  async getBOMsByItem(itemId: string) {
    return prisma.billOfMaterial.findMany({
      where: { itemId, status: "ACTIVE" },
      include: {
        components: {
          include: {
            item: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { version: "desc" },
    });
  }

  async createBOM(data: any) {
    return prisma.billOfMaterial.create({
      data,
      include: {
        item: true,
        components: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async updateBOM(bomId: string, data: any) {
    return prisma.billOfMaterial.update({
      where: { id: bomId },
      data,
      include: {
        item: true,
        components: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async deleteBOM(bomId: string) {
    return prisma.billOfMaterial.delete({
      where: { id: bomId },
    });
  }

  // ==================== MANUFACTURING - BOM COMPONENT METHODS ====================

  async getBOMComponents(bomId: string) {
    return prisma.bOMComponent.findMany({
      where: { bomId },
      include: {
        item: true,
      },
      orderBy: { sequence: "asc" },
    });
  }

  async createBOMComponent(data: any) {
    return prisma.bOMComponent.create({
      data,
      include: {
        item: true,
      },
    });
  }

  async updateBOMComponent(componentId: string, data: any) {
    return prisma.bOMComponent.update({
      where: { id: componentId },
      data,
      include: {
        item: true,
      },
    });
  }

  async deleteBOMComponent(componentId: string) {
    return prisma.bOMComponent.delete({
      where: { id: componentId },
    });
  }

  // ==================== MANUFACTURING - PRODUCTION ORDER METHODS ====================

  async getProductionOrdersByTenant(tenantId: string) {
    return prisma.productionOrder.findMany({
      where: { tenantId },
      include: {
        bom: {
          include: {
            item: true,
          },
        },
        item: true,
        site: true,
        workcell: true,
        createdBy: true,
        releasedBy: true,
        _count: {
          select: {
            consumptions: true,
            outputs: true,
          },
        },
      },
      orderBy: { scheduledStart: "desc" },
    });
  }

  async getProductionOrderById(orderId: string) {
    return prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        bom: {
          include: {
            item: true,
            components: {
              include: {
                item: true,
              },
              orderBy: { sequence: "asc" },
            },
          },
        },
        item: true,
        site: true,
        workcell: true,
        createdBy: true,
        releasedBy: true,
        consumptions: {
          include: {
            item: true,
            fromLocation: true,
            bomComponent: true,
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
        outputs: {
          include: {
            item: true,
            toLocation: true,
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async createProductionOrder(data: any) {
    return prisma.productionOrder.create({
      data,
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
        item: true,
        site: true,
      },
    });
  }

  async updateProductionOrder(orderId: string, data: any) {
    return prisma.productionOrder.update({
      where: { id: orderId },
      data,
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
        item: true,
        consumptions: {
          include: {
            item: true,
            fromLocation: true,
          },
        },
        outputs: {
          include: {
            item: true,
            toLocation: true,
          },
        },
      },
    });
  }

  async deleteProductionOrder(orderId: string) {
    return prisma.productionOrder.delete({
      where: { id: orderId },
    });
  }

  // ==================== MANUFACTURING - CONSUMPTION METHODS ====================

  async getConsumptionsByOrder(orderId: string) {
    return prisma.productionConsumption.findMany({
      where: { productionOrderId: orderId },
      include: {
        item: true,
        fromLocation: true,
        bomComponent: true,
        reasonCode: true,
        createdBy: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createConsumption(data: any) {
    return prisma.productionConsumption.create({
      data,
      include: {
        item: true,
        fromLocation: true,
        bomComponent: true,
      },
    });
  }

  // ==================== MANUFACTURING - OUTPUT METHODS ====================

  async getOutputsByOrder(orderId: string) {
    return prisma.productionOutput.findMany({
      where: { productionOrderId: orderId },
      include: {
        item: true,
        toLocation: true,
        createdBy: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createOutput(data: any) {
    return prisma.productionOutput.create({
      data,
      include: {
        item: true,
        toLocation: true,
      },
    });
  }
}

export const storage = new Storage();
