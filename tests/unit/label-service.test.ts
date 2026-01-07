import { describe, it, expect } from 'vitest';
import {
  TSPLLabelGenerator,
  ZPLLabelGenerator,
  LabelPrintService,
  PRINTER_PRESETS,
  labelService,
  type ItemLabel,
  type LocationLabel,
  type ShippingLabel,
} from '../../server/label-service';

describe('Label Service', () => {
  describe('PRINTER_PRESETS', () => {
    it('should have TSC TDP-244 preset', () => {
      expect(PRINTER_PRESETS.TSC_TDP244).toBeDefined();
      expect(PRINTER_PRESETS.TSC_TDP244.type).toBe('tspl');
      expect(PRINTER_PRESETS.TSC_TDP244.dpi).toBe(203);
    });

    it('should have Zebra preset', () => {
      expect(PRINTER_PRESETS.ZEBRA_GK420).toBeDefined();
      expect(PRINTER_PRESETS.ZEBRA_GK420.type).toBe('zpl');
    });
  });

  describe('TSPLLabelGenerator', () => {
    const generator = new TSPLLabelGenerator();

    describe('generateItemLabel', () => {
      const mockItem: ItemLabel = {
        sku: 'WIDGET-001',
        name: 'Test Widget',
        description: 'A test widget for testing',
        barcode: '123456789012',
        location: 'A-01-01',
        uom: 'EA',
      };

      it('should generate TSPL commands for item label', () => {
        const commands = generator.generateItemLabel(mockItem);

        expect(commands).toContain('SIZE');
        expect(commands).toContain('GAP');
        expect(commands).toContain('CLS');
        expect(commands).toContain('WIDGET-001');
        expect(commands).toContain('Test Widget');
        expect(commands).toContain('BARCODE');
        expect(commands).toContain('123456789012');
        expect(commands).toContain('LOC: A-01-01');
        expect(commands).toContain('UOM: EA');
        expect(commands).toContain('PRINT 1,1');
      });

      it('should support multiple copies', () => {
        const commands = generator.generateItemLabel(mockItem, 3);
        expect(commands).toContain('PRINT 3,1');
      });

      it('should handle item with lot number', () => {
        const itemWithLot: ItemLabel = {
          ...mockItem,
          lotNumber: 'LOT-2024-001',
        };
        const commands = generator.generateItemLabel(itemWithLot);
        expect(commands).toContain('LOT: LOT-2024-001');
      });

      it('should handle item with expiry date', () => {
        const itemWithExpiry: ItemLabel = {
          ...mockItem,
          expiryDate: new Date('2025-12-31'),
        };
        const commands = generator.generateItemLabel(itemWithExpiry);
        expect(commands).toContain('EXP:');
      });

      it('should escape special characters', () => {
        const itemWithQuotes: ItemLabel = {
          ...mockItem,
          name: 'Widget "Pro" Edition',
        };
        const commands = generator.generateItemLabel(itemWithQuotes);
        // The escaped quotes appear as \\" in TSPL output
        expect(commands).toContain('Widget \\\\"Pro\\\\" Edition');
      });
    });

    describe('generateLocationLabel', () => {
      const mockLocation: LocationLabel = {
        locationCode: 'A-01-01',
        zone: 'A',
        aisle: '01',
        rack: '01',
        level: '1',
        barcode: 'LOC-A-01-01',
      };

      it('should generate TSPL commands for location label', () => {
        const commands = generator.generateLocationLabel(mockLocation);

        expect(commands).toContain('SIZE');
        expect(commands).toContain('A-01-01');
        expect(commands).toContain('Zone: A');
        expect(commands).toContain('BARCODE');
        expect(commands).toContain('LOC-A-01-01');
        expect(commands).toContain('PRINT 1,1');
      });

      it('should support multiple copies', () => {
        const commands = generator.generateLocationLabel(mockLocation, 5);
        expect(commands).toContain('PRINT 5,1');
      });
    });

    describe('generateShippingLabel', () => {
      const mockShipping: ShippingLabel = {
        shipmentNumber: 'SHIP-001',
        orderNumber: 'ORD-001',
        carrier: 'UPS',
        trackingNumber: '1Z999AA10123456784',
        shipTo: {
          name: 'John Doe',
          address1: '123 Main St',
          address2: 'Suite 100',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          country: 'US',
        },
        weight: 5.5,
        packageCount: '1 of 2',
      };

      it('should generate TSPL commands for shipping label', () => {
        const commands = generator.generateShippingLabel(mockShipping);

        expect(commands).toContain('SHIP TO:');
        expect(commands).toContain('John Doe');
        expect(commands).toContain('123 Main St');
        expect(commands).toContain('Suite 100');
        expect(commands).toContain('Springfield, IL 62701');
        expect(commands).toContain('Order: ORD-001');
        expect(commands).toContain('Carrier: UPS');
        expect(commands).toContain('1Z999AA10123456784');
        expect(commands).toContain('Weight: 5.5 lbs');
        expect(commands).toContain('Pkg: 1 of 2');
      });

      it('should handle international addresses', () => {
        const intlShipping: ShippingLabel = {
          ...mockShipping,
          shipTo: {
            ...mockShipping.shipTo,
            country: 'CA',
          },
        };
        const commands = generator.generateShippingLabel(intlShipping);
        expect(commands).toContain('CA');
      });
    });

    describe('generateQRLabel', () => {
      it('should generate TSPL commands for QR label', () => {
        const commands = generator.generateQRLabel({
          content: 'https://example.com/item/123',
          title: 'Scan for Details',
          subtitle: 'Item #123',
        });

        expect(commands).toContain('QRCODE');
        expect(commands).toContain('https://example.com/item/123');
        expect(commands).toContain('Scan for Details');
        expect(commands).toContain('Item #123');
      });
    });
  });

  describe('ZPLLabelGenerator', () => {
    const generator = new ZPLLabelGenerator();

    describe('generateItemLabel', () => {
      const mockItem: ItemLabel = {
        sku: 'WIDGET-001',
        name: 'Test Widget',
        barcode: '123456789012',
        location: 'A-01-01',
      };

      it('should generate ZPL commands for item label', () => {
        const commands = generator.generateItemLabel(mockItem);

        expect(commands).toContain('^XA');  // Start format
        expect(commands).toContain('^XZ');  // End format
        expect(commands).toContain('WIDGET-001');
        expect(commands).toContain('Test Widget');
        expect(commands).toContain('^BC');  // Barcode command
        expect(commands).toContain('123456789012');
        expect(commands).toContain('LOC: A-01-01');
      });

      it('should support multiple copies', () => {
        const commands = generator.generateItemLabel(mockItem, 3);
        expect(commands).toContain('^PQ3');
      });
    });

    describe('generateLocationLabel', () => {
      it('should generate ZPL commands', () => {
        const commands = generator.generateLocationLabel({
          locationCode: 'B-02-03',
          barcode: 'LOC-B-02-03',
        });

        expect(commands).toContain('^XA');
        expect(commands).toContain('B-02-03');
        expect(commands).toContain('LOC-B-02-03');
      });
    });

    describe('generateShippingLabel', () => {
      it('should generate ZPL commands', () => {
        const commands = generator.generateShippingLabel({
          shipmentNumber: 'SHIP-001',
          orderNumber: 'ORD-001',
          carrier: 'FedEx',
          trackingNumber: '794644790132',
          shipTo: {
            name: 'Jane Smith',
            address1: '456 Oak Ave',
            city: 'Portland',
            state: 'OR',
            zip: '97201',
          },
        });

        expect(commands).toContain('^XA');
        expect(commands).toContain('SHIP TO:');
        expect(commands).toContain('Jane Smith');
        expect(commands).toContain('794644790132');
      });
    });
  });

  describe('LabelPrintService', () => {
    it('should create service with default preset', () => {
      const service = new LabelPrintService();
      expect(service).toBeDefined();
    });

    it('should create service with specific preset', () => {
      const service = new LabelPrintService('ZEBRA_GK420');
      expect(service).toBeDefined();
    });

    it('should generate TSPL by default', () => {
      const service = new LabelPrintService('TSC_TDP244');
      const commands = service.generateItemLabel({
        sku: 'TEST',
        name: 'Test',
        barcode: '123',
      });

      expect(commands).toContain('SIZE');
      expect(commands).not.toContain('^XA');
    });

    it('should generate ZPL when specified', () => {
      const service = new LabelPrintService('TSC_TDP244');
      const commands = service.generateItemLabel({
        sku: 'TEST',
        name: 'Test',
        barcode: '123',
      }, 'zpl');

      expect(commands).toContain('^XA');
    });

    it('should generate batch labels', () => {
      const service = new LabelPrintService();
      const items: ItemLabel[] = [
        { sku: 'A', name: 'Item A', barcode: '001' },
        { sku: 'B', name: 'Item B', barcode: '002' },
        { sku: 'C', name: 'Item C', barcode: '003' },
      ];

      const commands = service.generateBatchItemLabels(items);

      expect(commands).toContain('Item A');
      expect(commands).toContain('Item B');
      expect(commands).toContain('Item C');
      // Should have 3 PRINT commands
      expect((commands.match(/PRINT 1,1/g) || []).length).toBe(3);
    });
  });

  describe('Default labelService export', () => {
    it('should be configured for TSC TDP-244', () => {
      expect(labelService).toBeDefined();
      
      // Generate a label and verify TSPL format
      const commands = labelService.generateItemLabel({
        sku: 'DEFAULT-TEST',
        name: 'Default Test',
        barcode: '999',
      });

      expect(commands).toContain('SIZE');
      expect(commands).toContain('DEFAULT-TEST');
    });
  });
});
