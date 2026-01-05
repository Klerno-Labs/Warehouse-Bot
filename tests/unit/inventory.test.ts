/**
 * Inventory Business Logic Unit Tests
 * 
 * Tests core inventory calculations and validations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Test inventory quantity calculations
describe("Inventory Calculations", () => {
  describe("UOM Conversions", () => {
    const uomConversions = [
      { uom: "EA", toBase: 1 },
      { uom: "BOX", toBase: 12 },
      { uom: "CASE", toBase: 24 },
      { uom: "PALLET", toBase: 480 },
    ];

    const convertToBase = (qty: number, uom: string): number => {
      const conversion = uomConversions.find((c) => c.uom === uom);
      if (!conversion) throw new Error(`Unknown UOM: ${uom}`);
      return qty * conversion.toBase;
    };

    const convertFromBase = (baseQty: number, uom: string): number => {
      const conversion = uomConversions.find((c) => c.uom === uom);
      if (!conversion) throw new Error(`Unknown UOM: ${uom}`);
      return baseQty / conversion.toBase;
    };

    it("should convert EA to base correctly", () => {
      expect(convertToBase(10, "EA")).toBe(10);
    });

    it("should convert BOX to base correctly", () => {
      expect(convertToBase(5, "BOX")).toBe(60);
    });

    it("should convert CASE to base correctly", () => {
      expect(convertToBase(2, "CASE")).toBe(48);
    });

    it("should convert PALLET to base correctly", () => {
      expect(convertToBase(1, "PALLET")).toBe(480);
    });

    it("should convert from base to BOX correctly", () => {
      expect(convertFromBase(60, "BOX")).toBe(5);
    });

    it("should handle fractional conversions", () => {
      expect(convertFromBase(30, "BOX")).toBe(2.5);
    });

    it("should throw error for unknown UOM", () => {
      expect(() => convertToBase(10, "UNKNOWN")).toThrow("Unknown UOM");
    });
  });

  describe("Stock Level Calculations", () => {
    const calculateAvailableQty = (
      onHand: number,
      allocated: number,
      onOrder: number
    ): { available: number; projected: number } => {
      const available = Math.max(0, onHand - allocated);
      const projected = onHand - allocated + onOrder;
      return { available, projected };
    };

    it("should calculate available quantity correctly", () => {
      const result = calculateAvailableQty(100, 30, 50);
      expect(result.available).toBe(70);
      expect(result.projected).toBe(120);
    });

    it("should not return negative available", () => {
      const result = calculateAvailableQty(10, 30, 50);
      expect(result.available).toBe(0);
      expect(result.projected).toBe(30);
    });

    it("should handle zero inventory", () => {
      const result = calculateAvailableQty(0, 0, 100);
      expect(result.available).toBe(0);
      expect(result.projected).toBe(100);
    });
  });

  describe("Reorder Point Calculations", () => {
    const shouldReorder = (
      currentQty: number,
      reorderPoint: number,
      minQty: number
    ): { reorder: boolean; suggestedQty: number } => {
      const reorder = currentQty <= reorderPoint;
      const suggestedQty = reorder ? Math.max(minQty, reorderPoint * 2 - currentQty) : 0;
      return { reorder, suggestedQty };
    };

    it("should trigger reorder when below reorder point", () => {
      const result = shouldReorder(5, 10, 50);
      expect(result.reorder).toBe(true);
    });

    it("should not trigger reorder when above reorder point", () => {
      const result = shouldReorder(50, 10, 50);
      expect(result.reorder).toBe(false);
    });

    it("should suggest minimum quantity", () => {
      const result = shouldReorder(5, 10, 50);
      expect(result.suggestedQty).toBeGreaterThanOrEqual(50);
    });

    it("should trigger at exactly reorder point", () => {
      const result = shouldReorder(10, 10, 50);
      expect(result.reorder).toBe(true);
    });
  });

  describe("Inventory Valuation", () => {
    const calculateFIFOCost = (
      layers: Array<{ qty: number; cost: number }>,
      qtyToConsume: number
    ): { totalCost: number; remainingLayers: Array<{ qty: number; cost: number }> } => {
      let remaining = qtyToConsume;
      let totalCost = 0;
      const remainingLayers: Array<{ qty: number; cost: number }> = [];

      for (const layer of layers) {
        if (remaining <= 0) {
          remainingLayers.push({ ...layer });
          continue;
        }

        const consumed = Math.min(layer.qty, remaining);
        totalCost += consumed * layer.cost;
        remaining -= consumed;

        if (layer.qty > consumed) {
          remainingLayers.push({ qty: layer.qty - consumed, cost: layer.cost });
        }
      }

      return { totalCost, remainingLayers };
    };

    it("should calculate FIFO cost correctly", () => {
      const layers = [
        { qty: 10, cost: 5 },
        { qty: 20, cost: 6 },
        { qty: 30, cost: 7 },
      ];
      const result = calculateFIFOCost(layers, 25);
      // First 10 at $5 = $50, next 15 at $6 = $90
      expect(result.totalCost).toBe(140);
    });

    it("should leave remaining layers", () => {
      const layers = [
        { qty: 10, cost: 5 },
        { qty: 20, cost: 6 },
      ];
      const result = calculateFIFOCost(layers, 10);
      expect(result.remainingLayers).toHaveLength(1);
      expect(result.remainingLayers[0].qty).toBe(20);
    });

    it("should handle partial layer consumption", () => {
      const layers = [{ qty: 100, cost: 10 }];
      const result = calculateFIFOCost(layers, 30);
      expect(result.totalCost).toBe(300);
      expect(result.remainingLayers[0].qty).toBe(70);
    });
  });
});

// Test sales order calculations
describe("Sales Order Calculations", () => {
  describe("Order Totals", () => {
    interface OrderLine {
      qty: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
    }

    const calculateOrderTotals = (
      lines: OrderLine[],
      shippingAmount: number
    ): { subtotal: number; discountTotal: number; taxTotal: number; total: number } => {
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      for (const line of lines) {
        const lineSubtotal = line.qty * line.unitPrice;
        const lineDiscount = lineSubtotal * (line.discount / 100);
        const lineTaxable = lineSubtotal - lineDiscount;
        const lineTax = lineTaxable * (line.taxRate / 100);

        subtotal += lineSubtotal;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
      }

      const total = subtotal - discountTotal + taxTotal + shippingAmount;

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        total: Math.round(total * 100) / 100,
      };
    };

    it("should calculate simple order correctly", () => {
      const lines = [{ qty: 10, unitPrice: 100, discount: 0, taxRate: 10 }];
      const result = calculateOrderTotals(lines, 0);
      expect(result.subtotal).toBe(1000);
      expect(result.taxTotal).toBe(100);
      expect(result.total).toBe(1100);
    });

    it("should apply discount correctly", () => {
      const lines = [{ qty: 10, unitPrice: 100, discount: 10, taxRate: 0 }];
      const result = calculateOrderTotals(lines, 0);
      expect(result.subtotal).toBe(1000);
      expect(result.discountTotal).toBe(100);
      expect(result.total).toBe(900);
    });

    it("should calculate tax after discount", () => {
      const lines = [{ qty: 10, unitPrice: 100, discount: 10, taxRate: 10 }];
      const result = calculateOrderTotals(lines, 0);
      // Subtotal: 1000, Discount: 100, Taxable: 900, Tax: 90
      expect(result.taxTotal).toBe(90);
      expect(result.total).toBe(990);
    });

    it("should add shipping to total", () => {
      const lines = [{ qty: 1, unitPrice: 100, discount: 0, taxRate: 0 }];
      const result = calculateOrderTotals(lines, 25);
      expect(result.total).toBe(125);
    });

    it("should handle multiple lines", () => {
      const lines = [
        { qty: 5, unitPrice: 10, discount: 0, taxRate: 10 },
        { qty: 3, unitPrice: 20, discount: 0, taxRate: 10 },
      ];
      const result = calculateOrderTotals(lines, 5);
      // Line 1: 50 + 5 tax = 55
      // Line 2: 60 + 6 tax = 66
      // Total: 110 + 11 tax + 5 shipping = 126
      expect(result.subtotal).toBe(110);
      expect(result.taxTotal).toBe(11);
      expect(result.total).toBe(126);
    });
  });

  describe("ATP (Available To Promise)", () => {
    const calculateATP = (
      onHand: number,
      allocated: number,
      incoming: Array<{ date: Date; qty: number }>,
      outgoing: Array<{ date: Date; qty: number }>,
      targetDate: Date
    ): number => {
      let atp = onHand - allocated;

      for (const item of incoming) {
        if (item.date <= targetDate) {
          atp += item.qty;
        }
      }

      for (const item of outgoing) {
        if (item.date <= targetDate) {
          atp -= item.qty;
        }
      }

      return Math.max(0, atp);
    };

    it("should calculate ATP with no future changes", () => {
      const result = calculateATP(100, 20, [], [], new Date());
      expect(result).toBe(80);
    });

    it("should include incoming before target date", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      const incoming = [{ date: tomorrow, qty: 50 }];
      const result = calculateATP(100, 20, incoming, [], nextWeek);
      expect(result).toBe(130);
    });

    it("should exclude incoming after target date", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      const incoming = [{ date: nextWeek, qty: 50 }];
      const result = calculateATP(100, 20, incoming, [], tomorrow);
      expect(result).toBe(80);
    });

    it("should deduct outgoing commitments", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const outgoing = [{ date: tomorrow, qty: 30 }];
      const result = calculateATP(100, 20, [], outgoing, new Date(Date.now() + 7 * 86400000));
      expect(result).toBe(50);
    });

    it("should not return negative ATP", () => {
      const result = calculateATP(10, 50, [], [], new Date());
      expect(result).toBe(0);
    });
  });
});

// Test validation functions
describe("Input Validation", () => {
  describe("SKU Validation", () => {
    const isValidSKU = (sku: string): boolean => {
      // SKU must be 1-50 chars, alphanumeric with hyphens
      return /^[A-Z0-9][A-Z0-9-]{0,48}[A-Z0-9]$|^[A-Z0-9]$/.test(sku.toUpperCase());
    };

    it("should accept valid SKU", () => {
      expect(isValidSKU("ITEM-001")).toBe(true);
    });

    it("should accept simple SKU", () => {
      expect(isValidSKU("A")).toBe(true);
    });

    it("should reject empty SKU", () => {
      expect(isValidSKU("")).toBe(false);
    });

    it("should reject SKU starting with hyphen", () => {
      expect(isValidSKU("-ITEM")).toBe(false);
    });

    it("should reject SKU ending with hyphen", () => {
      expect(isValidSKU("ITEM-")).toBe(false);
    });

    it("should accept numeric SKU", () => {
      expect(isValidSKU("12345")).toBe(true);
    });
  });

  describe("Email Validation", () => {
    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    it("should accept valid email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
    });

    it("should accept email with subdomain", () => {
      expect(isValidEmail("test@mail.example.com")).toBe(true);
    });

    it("should reject email without @", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("should reject email without domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("should reject email with spaces", () => {
      expect(isValidEmail("test @example.com")).toBe(false);
    });
  });

  describe("Quantity Validation", () => {
    const isValidQuantity = (qty: number, allowNegative = false): boolean => {
      if (typeof qty !== "number" || isNaN(qty)) return false;
      if (!allowNegative && qty < 0) return false;
      if (!Number.isFinite(qty)) return false;
      return true;
    };

    it("should accept positive quantity", () => {
      expect(isValidQuantity(100)).toBe(true);
    });

    it("should accept zero", () => {
      expect(isValidQuantity(0)).toBe(true);
    });

    it("should reject negative by default", () => {
      expect(isValidQuantity(-10)).toBe(false);
    });

    it("should accept negative when allowed", () => {
      expect(isValidQuantity(-10, true)).toBe(true);
    });

    it("should reject NaN", () => {
      expect(isValidQuantity(NaN)).toBe(false);
    });

    it("should reject Infinity", () => {
      expect(isValidQuantity(Infinity)).toBe(false);
    });

    it("should accept decimal quantities", () => {
      expect(isValidQuantity(10.5)).toBe(true);
    });
  });
});
