import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jspdf and jspdf-autotable completely
vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    line: vi.fn().mockReturnThis(),
    setDrawColor: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    setFillColor: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    internal: {
      pageSize: { getWidth: () => 612, getHeight: () => 792 },
      getNumberOfPages: () => 1,
    },
    setPage: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
    lastAutoTable: { finalY: 400 },
    getTextWidth: vi.fn().mockReturnValue(50),
    splitTextToSize: vi.fn((text: string) => [text]),
    save: vi.fn(),
  };
  return {
    default: vi.fn(() => mockDoc),
    jsPDF: vi.fn(() => mockDoc),
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Import after mocks
import {
  generateSalesOrderPDF,
  generatePurchaseOrderPDF,
  generatePickListPDF,
  generateInvoicePDF,
  generatePackingSlipPDF,
  generateCycleCountSheetPDF,
} from '../../server/pdf-service';

describe('PDF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSalesOrderPDF', () => {
    const validSalesOrder = {
      orderNumber: 'SO-2026-001',
      orderDate: new Date('2026-01-06'),
      status: 'OPEN',
      customer: {
        name: 'Test Customer Inc',
        code: 'CUST-001',
        email: 'test@customer.com',
        phone: '555-1234',
      },
      billTo: {
        name: 'Test Customer Inc',
        address1: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
      },
      shipTo: {
        name: 'Test Customer Warehouse',
        address1: '456 Shipping Dr',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
      },
      lines: [
        { sku: 'ITEM-001', description: 'Widget A', qty: 10, uom: 'EA', unitPrice: 25.00, total: 250.00 },
        { sku: 'ITEM-002', description: 'Widget B', qty: 5, uom: 'EA', unitPrice: 50.00, total: 250.00 },
      ],
      subtotal: 500.00,
      taxAmount: 40.00,
      shippingAmount: 15.00,
      total: 555.00,
      notes: 'Priority order',
    };

    it('should generate a PDF buffer for valid sales order', () => {
      const result = generateSalesOrderPDF(validSalesOrder);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle sales order with customer PO', () => {
      const withPO = { ...validSalesOrder, customerPO: 'CUST-PO-12345' };
      const result = generateSalesOrderPDF(withPO);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle sales order with requested/promised dates', () => {
      const withDates = {
        ...validSalesOrder,
        requestedDate: new Date('2026-01-15'),
        promisedDate: new Date('2026-01-14'),
      };
      const result = generateSalesOrderPDF(withDates);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle sales order with many line items', () => {
      const manyLines = {
        ...validSalesOrder,
        lines: Array.from({ length: 50 }, (_, i) => ({
          sku: `ITEM-${i.toString().padStart(3, '0')}`,
          description: `Product ${i}`,
          qty: i + 1,
          uom: 'EA',
          unitPrice: 10 + i,
          total: (i + 1) * (10 + i),
        })),
      };
      const result = generateSalesOrderPDF(manyLines);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle sales order with no notes', () => {
      const noNotes = { ...validSalesOrder, notes: undefined };
      const result = generateSalesOrderPDF(noNotes);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generatePurchaseOrderPDF', () => {
    const validPO = {
      poNumber: 'PO-2026-001',
      orderDate: new Date('2026-01-06'),
      expectedDate: new Date('2026-01-20'),
      status: 'OPEN',
      supplier: {
        name: 'Acme Supplies',
        code: 'SUP-001',
        contactName: 'John Smith',
        email: 'john@acme.com',
        phone: '555-5678',
        address1: '789 Supplier Way',
        city: 'Indianapolis',
        state: 'IN',
        zip: '46201',
      },
      shipTo: {
        name: 'Main Warehouse',
        address1: '456 Warehouse Ave',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
      },
      lines: [
        { sku: 'RAW-001', description: 'Raw Material A', qty: 100, uom: 'KG', unitCost: 5.50, total: 550.00 },
        { sku: 'RAW-002', description: 'Raw Material B', qty: 50, uom: 'LB', unitCost: 12.00, total: 600.00 },
      ],
      subtotal: 1150.00,
      taxAmount: 92.00,
      shippingAmount: 50.00,
      total: 1292.00,
      notes: 'Deliver to loading dock B',
      createdBy: 'Admin User',
    };

    it('should generate a PDF buffer for valid purchase order', () => {
      const result = generatePurchaseOrderPDF(validPO);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle PO without expected date', () => {
      const noDate = { ...validPO, expectedDate: undefined };
      const result = generatePurchaseOrderPDF(noDate);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle PO with minimal supplier info', () => {
      const minSupplier = {
        ...validPO,
        supplier: {
          name: 'Basic Supplier',
          code: 'SUP-002',
        },
      };
      const result = generatePurchaseOrderPDF(minSupplier);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle PO without notes', () => {
      const noNotes = { ...validPO, notes: undefined };
      const result = generatePurchaseOrderPDF(noNotes);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle zero-value line items', () => {
      const zeroValues = {
        ...validPO,
        lines: [{ sku: 'FREE', description: 'Free Sample', qty: 1, uom: 'EA', unitCost: 0, total: 0 }],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      };
      const result = generatePurchaseOrderPDF(zeroValues);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generatePickListPDF', () => {
    const validPickList = {
      taskNumber: 'PICK-2026-001',
      orderNumber: 'SO-2026-001',
      createdDate: new Date('2026-01-06'),
      priority: 1,
      customer: {
        name: 'Test Customer',
        code: 'CUST-001',
      },
      lines: [
        { sku: 'ITEM-001', description: 'Widget A', location: 'A-01-01', qtyToPick: 10, uom: 'EA' },
        { sku: 'ITEM-002', description: 'Widget B', location: 'B-02-03', qtyToPick: 5, uom: 'EA' },
        { sku: 'ITEM-003', description: 'Widget C', location: 'C-03-05', qtyToPick: 20, uom: 'CS' },
      ],
      notes: 'Rush order',
      assignedTo: 'Picker Team A',
    };

    it('should generate a PDF buffer for valid pick list', () => {
      const result = generatePickListPDF(validPickList);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle pick list without assigned user', () => {
      const noAssignee = { ...validPickList, assignedTo: undefined };
      const result = generatePickListPDF(noAssignee);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle pick list with lot numbers', () => {
      const withLots = {
        ...validPickList,
        lines: validPickList.lines.map((l, i) => ({ ...l, lotNumber: `LOT-${i}` })),
      };
      const result = generatePickListPDF(withLots);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle high priority pick list', () => {
      const highPriority = { ...validPickList, priority: 5 };
      const result = generatePickListPDF(highPriority);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generateInvoicePDF', () => {
    const validInvoice = {
      invoiceNumber: 'INV-2026-001',
      invoiceDate: new Date('2026-01-06'),
      dueDate: new Date('2026-02-05'),
      orderNumber: 'SO-2026-001',
      orderDate: new Date('2026-01-01'),
      status: 'OPEN',
      customer: {
        name: 'Test Customer Inc',
        code: 'CUST-001',
        email: 'ar@customer.com',
      },
      billTo: {
        name: 'Test Customer Inc',
        address1: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
      },
      shipTo: {
        name: 'Test Customer Warehouse',
        address1: '456 Shipping Dr',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
      },
      lines: [
        { sku: 'ITEM-001', description: 'Widget A', qty: 10, uom: 'EA', unitPrice: 25.00, total: 250.00 },
      ],
      subtotal: 250.00,
      taxAmount: 20.00,
      shippingAmount: 10.00,
      total: 280.00,
      amountPaid: 0,
      balanceDue: 280.00,
      paymentTerms: 'Net 30',
    };

    it('should generate a PDF buffer for valid invoice', () => {
      const result = generateInvoicePDF(validInvoice);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle partially paid invoice', () => {
      const partialPaid = { ...validInvoice, amountPaid: 100.00, balanceDue: 180.00 };
      const result = generateInvoicePDF(partialPaid);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle fully paid invoice', () => {
      const fullyPaid = { ...validInvoice, amountPaid: 280.00, balanceDue: 0, status: 'PAID' };
      const result = generateInvoicePDF(fullyPaid);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generatePackingSlipPDF', () => {
    const validPackingSlip = {
      shipmentNumber: 'SHIP-2026-001',
      orderNumber: 'SO-2026-001',
      shipDate: new Date('2026-01-06'),
      carrier: 'UPS Ground',
      trackingNumber: '1Z999AA10123456784',
      customer: {
        name: 'Test Customer',
        code: 'CUST-001',
      },
      shipTo: {
        name: 'Test Customer Warehouse',
        address1: '456 Shipping Dr',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
      },
      lines: [
        { sku: 'ITEM-001', description: 'Widget A', qtyOrdered: 10, qtyShipped: 10, uom: 'EA' },
        { sku: 'ITEM-002', description: 'Widget B', qtyOrdered: 5, qtyShipped: 5, uom: 'EA' },
      ],
    };

    it('should generate a PDF buffer for valid packing slip', () => {
      const result = generatePackingSlipPDF(validPackingSlip);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle packing slip without tracking number', () => {
      const noTracking = { ...validPackingSlip, trackingNumber: undefined };
      const result = generatePackingSlipPDF(noTracking);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle packing slip without carrier', () => {
      const noCarrier = { ...validPackingSlip, carrier: undefined };
      const result = generatePackingSlipPDF(noCarrier);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle partial shipment', () => {
      const partial = {
        ...validPackingSlip,
        lines: [
          { sku: 'ITEM-001', description: 'Widget A', qtyOrdered: 10, qtyShipped: 8, uom: 'EA' },
          { sku: 'ITEM-002', description: 'Widget B', qtyOrdered: 5, qtyShipped: 0, uom: 'EA' },
        ],
      };
      const result = generatePackingSlipPDF(partial);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle packing slip with packages', () => {
      const withPackages = {
        ...validPackingSlip,
        packages: [
          { packageNumber: 1, weight: 15.5, trackingNumber: '1Z001' },
          { packageNumber: 2, weight: 10.0, trackingNumber: '1Z002' },
        ],
      };
      const result = generatePackingSlipPDF(withPackages);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generateCycleCountSheetPDF', () => {
    const validCycleCount = {
      countName: 'CC-2026-001',
      countDate: new Date('2026-01-06'),
      zone: 'Zone A',
      assignedTo: 'Counter Team A',
      items: [
        { sku: 'ITEM-001', description: 'Widget A', location: 'A-01-01', systemQty: 100, uom: 'EA' },
        { sku: 'ITEM-002', description: 'Widget B', location: 'A-01-02', systemQty: 50, uom: 'EA' },
      ],
    };

    it('should generate a PDF buffer for valid cycle count', () => {
      const result = generateCycleCountSheetPDF(validCycleCount);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle cycle count without zone', () => {
      const noZone = { ...validCycleCount, zone: undefined };
      const result = generateCycleCountSheetPDF(noZone);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle cycle count without assignee', () => {
      const noAssignee = { ...validCycleCount, assignedTo: undefined };
      const result = generateCycleCountSheetPDF(noAssignee);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle many items', () => {
      const manyItems = {
        ...validCycleCount,
        items: Array.from({ length: 100 }, (_, i) => ({
          sku: `ITEM-${i.toString().padStart(3, '0')}`,
          description: `Item ${i}`,
          location: `A-${Math.floor(i / 10).toString().padStart(2, '0')}-${(i % 10).toString().padStart(2, '0')}`,
          systemQty: Math.floor(Math.random() * 500),
          uom: 'EA',
        })),
      };
      const result = generateCycleCountSheetPDF(manyItems);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Currency Formatting', () => {
    it('should handle large values', () => {
      const largePO = {
        poNumber: 'PO-LARGE',
        orderDate: new Date(),
        status: 'OPEN',
        supplier: { name: 'Test', code: 'TEST' },
        shipTo: { name: 'Test' },
        lines: [{ description: 'Expensive Item', qty: 1000, uom: 'EA', unitCost: 99999.99, total: 99999990 }],
        subtotal: 99999990,
        taxAmount: 8000000,
        shippingAmount: 10000,
        total: 108009990,
      };
      const result = generatePurchaseOrderPDF(largePO);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle decimal precision', () => {
      const decimalPO = {
        poNumber: 'PO-DEC',
        orderDate: new Date(),
        status: 'OPEN',
        supplier: { name: 'Test', code: 'TEST' },
        shipTo: { name: 'Test' },
        lines: [{ description: 'Bulk', qty: 10.5, uom: 'KG', unitCost: 5.333, total: 55.9965 }],
        subtotal: 55.9965,
        taxAmount: 4.48,
        shippingAmount: 0,
        total: 60.4765,
      };
      const result = generatePurchaseOrderPDF(decimalPO);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Date Formatting', () => {
    it('should handle various date formats', () => {
      const dates = [
        new Date('2026-01-06'),
        new Date('2026-12-31'),
        new Date('2027-01-01T00:00:00Z'),
      ];

      dates.forEach(date => {
        const po = {
          poNumber: 'PO-DATE',
          orderDate: date,
          status: 'OPEN',
          supplier: { name: 'Test', code: 'TEST' },
          shipTo: { name: 'Test' },
          lines: [{ description: 'Item', qty: 1, uom: 'EA', unitCost: 10, total: 10 }],
          subtotal: 10,
          taxAmount: 0,
          shippingAmount: 0,
          total: 10,
        };
        const result = generatePurchaseOrderPDF(po);
        expect(result).toBeInstanceOf(Buffer);
      });
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in text fields', () => {
      const specialPO = {
        poNumber: 'PO-SPEC',
        orderDate: new Date(),
        status: 'OPEN',
        supplier: {
          name: 'Über Supplies & Co. "Special"',
          code: 'UBER',
          address1: '123 Ñoño Street',
        },
        shipTo: { name: 'Test™' },
        lines: [{ description: 'Item with <html> & special © chars', qty: 1, uom: 'EA', unitCost: 10, total: 10 }],
        subtotal: 10,
        taxAmount: 0,
        shippingAmount: 0,
        total: 10,
        notes: 'Notes: résumé, naïve, 日本語, 中文',
      };
      const result = generatePurchaseOrderPDF(specialPO);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty line items', () => {
      const emptyLines = {
        poNumber: 'PO-EMPTY',
        orderDate: new Date(),
        status: 'OPEN',
        supplier: { name: 'Test', code: 'TEST' },
        shipTo: { name: 'Test' },
        lines: [],
        subtotal: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
      };
      const result = generatePurchaseOrderPDF(emptyLines);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle very long description text', () => {
      const longText = {
        poNumber: 'PO-LONG',
        orderDate: new Date(),
        status: 'OPEN',
        supplier: { name: 'A'.repeat(100), code: 'TEST' },
        shipTo: { name: 'Test' },
        lines: [{ description: 'B'.repeat(500), qty: 1, uom: 'EA', unitCost: 10, total: 10 }],
        subtotal: 10,
        taxAmount: 0,
        shippingAmount: 0,
        total: 10,
        notes: 'C'.repeat(1000),
      };
      const result = generatePurchaseOrderPDF(longText);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle negative values (credits/returns)', () => {
      const negativePO = {
        poNumber: 'PO-NEG',
        orderDate: new Date(),
        status: 'CREDIT',
        supplier: { name: 'Test', code: 'TEST' },
        shipTo: { name: 'Test' },
        lines: [{ description: 'Return Credit', qty: -5, uom: 'EA', unitCost: 100, total: -500 }],
        subtotal: -500,
        taxAmount: -40,
        shippingAmount: 0,
        total: -540,
      };
      const result = generatePurchaseOrderPDF(negativePO);
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
