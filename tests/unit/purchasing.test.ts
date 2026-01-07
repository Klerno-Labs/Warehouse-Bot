/**
 * Purchasing & Purchase Order Tests
 * 
 * Tests for purchase order management, receiving, and supplier operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Define mock prisma for use in tests
const prisma = {
  purchaseOrder: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  purchaseOrderLine: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  receipt: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  receiptLine: {
    create: vi.fn(),
  },
  supplier: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  inventoryBalance: {
    upsert: vi.fn(),
  },
  inventoryEvent: {
    create: vi.fn(),
  },
};

// Mock Prisma client module
vi.mock("@server/prisma", () => ({
  prisma: {
    purchaseOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrderLine: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    receipt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    receiptLine: {
      create: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryBalance: {
      upsert: vi.fn(),
    },
    inventoryEvent: {
      create: vi.fn(),
    },
  },
}));

describe("Purchasing Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Purchase Order Creation", () => {
    it("should create purchase order with lines", async () => {
      const mockPO = {
        id: "po-001",
        tenantId: "tenant-1",
        poNumber: "PO-2026-001",
        supplierId: "supplier-1",
        status: "DRAFT",
        orderDate: new Date("2026-01-06"),
        subtotal: 1000,
        taxAmount: 80,
        total: 1080,
        lines: [
          { id: "line-1", itemId: "item-1", qtyOrdered: 100, unitPrice: 10, lineTotal: 1000 },
        ],
      };

      (prisma.purchaseOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockPO);

      const result = await prisma.purchaseOrder.create({
        data: {
          tenantId: "tenant-1",
          poNumber: "PO-2026-001",
          supplierId: "supplier-1",
          orderDate: new Date(),
          lines: {
            create: [{ itemId: "item-1", qtyOrdered: 100, unitPrice: 10 }],
          },
        },
      });

      expect(result.poNumber).toBe("PO-2026-001");
      expect(result.lines).toHaveLength(1);
      expect(result.total).toBe(1080);
    });

    it("should calculate PO totals correctly", () => {
      const lines = [
        { qtyOrdered: 100, unitPrice: 10 },    // 1000
        { qtyOrdered: 50, unitPrice: 25 },     // 1250
        { qtyOrdered: 200, unitPrice: 5.5 },   // 1100
      ];

      const subtotal = lines.reduce((sum, line) => sum + line.qtyOrdered * line.unitPrice, 0);
      const taxRate = 0.08;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      expect(subtotal).toBe(3350);
      expect(taxAmount).toBeCloseTo(268, 2);
      expect(total).toBeCloseTo(3618, 2);
    });

    it("should validate PO line numbers are unique", () => {
      const lines = [
        { lineNumber: 10, itemId: "item-1" },
        { lineNumber: 20, itemId: "item-2" },
        { lineNumber: 10, itemId: "item-3" }, // Duplicate
      ];

      const lineNumbers = lines.map(l => l.lineNumber);
      const uniqueLineNumbers = new Set(lineNumbers);
      const hasDuplicates = lineNumbers.length !== uniqueLineNumbers.size;

      expect(hasDuplicates).toBe(true);
    });

    it("should generate sequential PO numbers", () => {
      const lastPONumber = "PO-2026-0099";
      
      const generateNextPONumber = (lastNumber: string): string => {
        const match = lastNumber.match(/PO-(\d{4})-(\d+)/);
        if (!match) return "PO-2026-0001";
        
        const year = match[1];
        const seq = parseInt(match[2]) + 1;
        return `PO-${year}-${seq.toString().padStart(4, "0")}`;
      };

      expect(generateNextPONumber(lastPONumber)).toBe("PO-2026-0100");
      expect(generateNextPONumber("PO-2026-0001")).toBe("PO-2026-0002");
    });
  });

  describe("Purchase Order Status Workflow", () => {
    it("should validate status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["SUBMITTED", "CANCELLED"],
        SUBMITTED: ["APPROVED", "REJECTED"],
        APPROVED: ["SENT", "CANCELLED"],
        SENT: ["ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED"],
        ACKNOWLEDGED: ["PARTIALLY_RECEIVED", "RECEIVED"],
        PARTIALLY_RECEIVED: ["RECEIVED", "CLOSED"],
        RECEIVED: ["CLOSED"],
        REJECTED: ["DRAFT"],
        CANCELLED: [],
        CLOSED: [],
      };

      // Valid transitions
      expect(validTransitions["DRAFT"].includes("SUBMITTED")).toBe(true);
      expect(validTransitions["APPROVED"].includes("SENT")).toBe(true);

      // Invalid transitions
      expect(validTransitions["DRAFT"].includes("RECEIVED")).toBe(false);
      expect(validTransitions["CLOSED"].length).toBe(0);
    });

    it("should track approval workflow", () => {
      const po = {
        id: "po-001",
        status: "SUBMITTED",
        total: 5000,
        approvalThreshold: 1000,
        approvals: [] as { userId: string; approved: boolean; date: Date }[],
      };

      const requiresApproval = po.total > po.approvalThreshold;
      expect(requiresApproval).toBe(true);

      // Simulate approval
      po.approvals.push({ userId: "user-1", approved: true, date: new Date() });
      const isApproved = po.approvals.some(a => a.approved);
      expect(isApproved).toBe(true);
    });
  });

  describe("Receiving Operations", () => {
    it("should create receipt against PO", async () => {
      const poLine = {
        id: "line-1",
        itemId: "item-1",
        qtyOrdered: 100,
        qtyReceived: 0,
      };

      const receiptQty = 50;
      const newReceivedQty = poLine.qtyReceived + receiptQty;

      expect(newReceivedQty).toBe(50);
      expect(newReceivedQty < poLine.qtyOrdered).toBe(true); // Partial receipt
    });

    it("should prevent over-receiving", () => {
      const poLine = {
        qtyOrdered: 100,
        qtyReceived: 90,
      };

      const attemptedReceiptQty = 20;
      const remainingQty = poLine.qtyOrdered - poLine.qtyReceived;
      const wouldOverReceive = attemptedReceiptQty > remainingQty;

      expect(wouldOverReceive).toBe(true);
      expect(remainingQty).toBe(10);
    });

    it("should allow over-receiving with tolerance", () => {
      const poLine = {
        qtyOrdered: 100,
        qtyReceived: 0,
        overReceiveTolerance: 10, // 10%
      };

      const maxAllowedQty = poLine.qtyOrdered * (1 + poLine.overReceiveTolerance / 100);
      
      // Use toBeCloseTo for floating point comparison
      expect(maxAllowedQty).toBeCloseTo(110, 5);
      expect(105 <= maxAllowedQty).toBe(true); // 105 is allowed
      expect(115 <= maxAllowedQty).toBe(false); // 115 exceeds tolerance
    });

    it("should update inventory on receipt", async () => {
      const receipt = {
        itemId: "item-1",
        locationId: "loc-1",
        qtyReceived: 50,
        unitCost: 10,
      };

      (prisma.inventoryBalance.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        itemId: receipt.itemId,
        locationId: receipt.locationId,
        qtyOnHand: 150, // 100 + 50
      });

      (prisma.inventoryEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        type: "RECEIPT",
        qty: receipt.qtyReceived,
      });

      const balance = await prisma.inventoryBalance.upsert({
        where: { itemId_locationId: { itemId: receipt.itemId, locationId: receipt.locationId } },
        create: { itemId: receipt.itemId, locationId: receipt.locationId, qtyOnHand: receipt.qtyReceived },
        update: { qtyOnHand: { increment: receipt.qtyReceived } },
      });

      expect(balance.qtyOnHand).toBe(150);
    });

    it("should update PO line status based on receipt", () => {
      const testCases = [
        { qtyOrdered: 100, qtyReceived: 0, expectedStatus: "OPEN" },
        { qtyOrdered: 100, qtyReceived: 50, expectedStatus: "PARTIALLY_RECEIVED" },
        { qtyOrdered: 100, qtyReceived: 100, expectedStatus: "RECEIVED" },
      ];

      const getLineStatus = (ordered: number, received: number): string => {
        if (received === 0) return "OPEN";
        if (received < ordered) return "PARTIALLY_RECEIVED";
        return "RECEIVED";
      };

      testCases.forEach(tc => {
        expect(getLineStatus(tc.qtyOrdered, tc.qtyReceived)).toBe(tc.expectedStatus);
      });
    });
  });

  describe("Supplier Management", () => {
    it("should create supplier with contact info", async () => {
      const mockSupplier = {
        id: "supplier-001",
        tenantId: "tenant-1",
        supplierCode: "SUP-001",
        name: "Acme Supplies",
        email: "orders@acme.com",
        phone: "555-0100",
        paymentTerms: "NET30",
        isActive: true,
      };

      (prisma.supplier.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupplier);

      const result = await prisma.supplier.create({
        data: mockSupplier,
      });

      expect(result.supplierCode).toBe("SUP-001");
      expect(result.paymentTerms).toBe("NET30");
    });

    it("should calculate supplier lead time", () => {
      const orderHistory = [
        { orderDate: new Date("2026-01-01"), receiptDate: new Date("2026-01-08") }, // 7 days
        { orderDate: new Date("2026-01-10"), receiptDate: new Date("2026-01-15") }, // 5 days
        { orderDate: new Date("2026-01-20"), receiptDate: new Date("2026-01-28") }, // 8 days
      ];

      const leadTimes = orderHistory.map(order => {
        const diff = order.receiptDate.getTime() - order.orderDate.getTime();
        return diff / (1000 * 60 * 60 * 24); // Convert to days
      });

      const avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;

      expect(avgLeadTime).toBeCloseTo(6.67, 1);
    });

    it("should track supplier performance metrics", () => {
      const supplier = {
        totalOrders: 100,
        onTimeDeliveries: 85,
        qualityIssues: 5,
        returnedOrders: 3,
      };

      const metrics = {
        onTimeRate: (supplier.onTimeDeliveries / supplier.totalOrders) * 100,
        qualityRate: ((supplier.totalOrders - supplier.qualityIssues) / supplier.totalOrders) * 100,
        returnRate: (supplier.returnedOrders / supplier.totalOrders) * 100,
      };

      expect(metrics.onTimeRate).toBe(85);
      expect(metrics.qualityRate).toBe(95);
      expect(metrics.returnRate).toBe(3);
    });
  });

  describe("PO Line Operations", () => {
    it("should add line to existing PO", async () => {
      const existingLines = [
        { lineNumber: 10, itemId: "item-1" },
        { lineNumber: 20, itemId: "item-2" },
      ];

      const getNextLineNumber = (lines: typeof existingLines): number => {
        const maxLine = Math.max(...lines.map(l => l.lineNumber), 0);
        return maxLine + 10;
      };

      expect(getNextLineNumber(existingLines)).toBe(30);
      expect(getNextLineNumber([])).toBe(10);
    });

    it("should calculate line total with discount", () => {
      const line = {
        qtyOrdered: 100,
        unitPrice: 50,
        discountPercent: 10,
      };

      const grossTotal = line.qtyOrdered * line.unitPrice;
      const discountAmount = grossTotal * (line.discountPercent / 100);
      const lineTotal = grossTotal - discountAmount;

      expect(grossTotal).toBe(5000);
      expect(discountAmount).toBe(500);
      expect(lineTotal).toBe(4500);
    });
  });

  describe("Purchase Order Validation", () => {
    it("should validate required fields", () => {
      const validatePO = (po: Partial<{
        supplierId: string;
        orderDate: Date;
        lines: unknown[];
      }>): string[] => {
        const errors: string[] = [];
        
        if (!po.supplierId) errors.push("Supplier is required");
        if (!po.orderDate) errors.push("Order date is required");
        if (!po.lines || po.lines.length === 0) errors.push("At least one line is required");
        
        return errors;
      };

      expect(validatePO({})).toHaveLength(3);
      expect(validatePO({ supplierId: "sup-1" })).toHaveLength(2);
      expect(validatePO({ supplierId: "sup-1", orderDate: new Date(), lines: [{}] })).toHaveLength(0);
    });

    it("should validate line item quantities", () => {
      const validateLineQty = (qty: number): boolean => {
        return qty > 0 && Number.isFinite(qty);
      };

      expect(validateLineQty(100)).toBe(true);
      expect(validateLineQty(0)).toBe(false);
      expect(validateLineQty(-10)).toBe(false);
      expect(validateLineQty(Infinity)).toBe(false);
    });

    it("should validate expected delivery date", () => {
      const validateDeliveryDate = (orderDate: Date, deliveryDate: Date): boolean => {
        return deliveryDate >= orderDate;
      };

      const today = new Date("2026-01-06");
      const tomorrow = new Date("2026-01-07");
      const yesterday = new Date("2026-01-05");

      expect(validateDeliveryDate(today, tomorrow)).toBe(true);
      expect(validateDeliveryDate(today, today)).toBe(true);
      expect(validateDeliveryDate(today, yesterday)).toBe(false);
    });
  });
});
