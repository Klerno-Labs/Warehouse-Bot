/**
 * Scanner Service Tests
 * 
 * Tests for AML and other barcode scanner support
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ScannerService,
  KeyboardWedgeScannerHandler,
  createAMLScanner,
  createScannerFromPreset,
  AML_SCANNER_PRESETS,
  SCANNER_PRESETS,
  defaultScanner,
} from "@server/scanner-service";

describe("Scanner Service", () => {
  describe("AML Scanner Presets", () => {
    it("should have AML M7225 preset (DBA compatible)", () => {
      const preset = AML_SCANNER_PRESETS['AML_M7225'];
      expect(preset).toBeDefined();
      expect(preset.type).toBe('AML');
      expect(preset.connectionMode).toBe('KEYBOARD_WEDGE');
      expect(preset.suffix).toBe('\r');
      expect(preset.enabledSymbologies).toContain('CODE128');
      expect(preset.enabledSymbologies).toContain('GS1_128');
    });

    it("should have AML M7500 preset", () => {
      const preset = AML_SCANNER_PRESETS['AML_M7500'];
      expect(preset).toBeDefined();
      expect(preset.enabledSymbologies).toContain('PDF417');
    });

    it("should have AML LDX10 preset", () => {
      const preset = AML_SCANNER_PRESETS['AML_LDX10'];
      expect(preset).toBeDefined();
      expect(preset.enabledSymbologies).toContain('INTERLEAVED_2_OF_5');
    });

    it("should have AML Scepter preset", () => {
      const preset = AML_SCANNER_PRESETS['AML_SCEPTER'];
      expect(preset).toBeDefined();
      expect(preset.enabledSymbologies).toContain('AZTEC');
      expect(preset.maxLength).toBe(500);
    });

    it("should have all AML presets in SCANNER_PRESETS", () => {
      expect(SCANNER_PRESETS['AML_M7225']).toBeDefined();
      expect(SCANNER_PRESETS['AML_M7500']).toBeDefined();
      expect(SCANNER_PRESETS['AML_LDX10']).toBeDefined();
      expect(SCANNER_PRESETS['AML_SCEPTER']).toBeDefined();
    });
  });

  describe("createAMLScanner", () => {
    it("should create scanner with default AML M7225 preset", () => {
      const scanner = createAMLScanner();
      expect(scanner).toBeInstanceOf(ScannerService);
    });

    it("should create scanner with specific AML preset", () => {
      const scanner = createAMLScanner('AML_M7500');
      expect(scanner).toBeInstanceOf(ScannerService);
    });
  });

  describe("createScannerFromPreset", () => {
    it("should create scanner from preset name", () => {
      const scanner = createScannerFromPreset('AML_M7225');
      expect(scanner).toBeInstanceOf(ScannerService);
    });

    it("should throw error for unknown preset", () => {
      expect(() => createScannerFromPreset('UNKNOWN_SCANNER')).toThrow('Unknown scanner preset');
    });
  });

  describe("ScannerService - Scan Processing", () => {
    let scanner: ScannerService;

    beforeEach(() => {
      scanner = createAMLScanner('AML_M7225');
    });

    it("should process raw scan data", () => {
      const event = scanner.processScan('ITEM-001');
      expect(event.rawData).toBe('ITEM-001');
      expect(event.cleanData).toBe('ITEM-001');
      expect(event.scannerType).toBe('AML');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it("should remove suffix from scan data", () => {
      const event = scanner.processScan('ITEM-001\r');
      expect(event.cleanData).toBe('ITEM-001');
    });

    it("should trim whitespace from scan data", () => {
      const event = scanner.processScan('  ITEM-001  ');
      expect(event.cleanData).toBe('ITEM-001');
    });

    it("should detect EAN-13 symbology", () => {
      const event = scanner.processScan('5901234123457');
      expect(event.symbology).toBe('EAN13');
    });

    it("should detect EAN-8 symbology", () => {
      const event = scanner.processScan('96385074');
      expect(event.symbology).toBe('EAN8');
    });

    it("should detect UPC-A symbology", () => {
      const event = scanner.processScan('012345678905');
      expect(event.symbology).toBe('UPC_A');
    });

    it("should detect CODE39 symbology", () => {
      const event = scanner.processScan('ABC-123');
      expect(event.symbology).toBe('CODE39');
    });

    it("should detect GS1-128 symbology", () => {
      const event = scanner.processScan('01095012345678903');
      expect(event.symbology).toBe('GS1_128');
    });

    it("should notify listeners on scan", () => {
      const listener = vi.fn();
      scanner.onScan(listener);
      
      scanner.processScan('TEST-SCAN');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        cleanData: 'TEST-SCAN',
      }));
    });

    it("should allow unsubscribing from scan events", () => {
      const listener = vi.fn();
      const unsubscribe = scanner.onScan(listener);
      
      scanner.processScan('SCAN-1');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      scanner.processScan('SCAN-2');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("ScannerService - Scan Data Parsing", () => {
    let scanner: ScannerService;

    beforeEach(() => {
      scanner = createAMLScanner();
    });

    it("should parse item barcode", () => {
      const result = scanner.parseScanData('SKU12345');
      expect(result.type).toBe('ITEM');
      expect(result.identifier).toBe('SKU12345');
    });

    it("should parse job/work order", () => {
      const result = scanner.parseScanData('JOB-123456');
      expect(result.type).toBe('JOB');
      expect(result.identifier).toBe('JOB-123456');
    });

    it("should parse work order without hyphen", () => {
      const result = scanner.parseScanData('WO123456');
      expect(result.type).toBe('JOB');
    });

    it("should parse manufacturing order", () => {
      const result = scanner.parseScanData('MO-789');
      expect(result.type).toBe('JOB');
    });

    it("should parse location barcode", () => {
      const result = scanner.parseScanData('LOC-A-01-01');
      expect(result.type).toBe('LOCATION');
      expect(result.identifier).toBe('LOC-A-01-01');
    });

    it("should parse location with zone format", () => {
      const result = scanner.parseScanData('A-01-01-02');
      expect(result.type).toBe('LOCATION');
    });

    it("should parse lot/batch barcode", () => {
      const result = scanner.parseScanData('LOT-2024001');
      expect(result.type).toBe('LOT');
      expect(result.identifier).toBe('2024001');
    });

    it("should parse serial number barcode", () => {
      const result = scanner.parseScanData('SN-ABC123XYZ');
      expect(result.type).toBe('SERIAL');
      expect(result.identifier).toBe('ABC123XYZ');
    });

    it("should parse purchase order barcode", () => {
      const result = scanner.parseScanData('PO-1234567');
      expect(result.type).toBe('PO');
    });

    it("should parse shipment/tracking barcode", () => {
      const result = scanner.parseScanData('1Z999AA10123456784');
      expect(result.type).toBe('SHIPMENT');
    });
  });

  describe("ScannerService - GS1-128 Parsing", () => {
    let scanner: ScannerService;

    beforeEach(() => {
      scanner = createAMLScanner();
    });

    it("should parse GS1-128 with GTIN (AI 01)", () => {
      const gs1Data = scanner.parseGS1('0195012345678903');
      expect(gs1Data.gtin).toBe('95012345678903');
    });

    it("should parse GS1-128 with batch/lot (AI 10)", () => {
      const gs1Data = scanner.parseGS1('10ABC123');
      expect(gs1Data.batchLot).toBe('ABC123');
    });

    it("should parse GS1-128 with expiration date (AI 17)", () => {
      const gs1Data = scanner.parseGS1('17260315');
      expect(gs1Data.expirationDate).toBe('2026-03-15');
    });

    it("should parse GS1-128 with serial number (AI 21)", () => {
      const gs1Data = scanner.parseGS1('21SN123456');
      expect(gs1Data.serialNumber).toBe('SN123456');
    });

    it("should parse GS1-128 with production date (AI 11)", () => {
      const gs1Data = scanner.parseGS1('11260101');
      expect(gs1Data.productionDate).toBe('2026-01-01');
    });

    it("should parse GS1-128 with quantity (AI 30)", () => {
      const gs1Data = scanner.parseGS1('30100');
      expect(gs1Data.quantity).toBe(100);
    });

    it("should parse GS1-128 with SSCC (AI 00)", () => {
      const gs1Data = scanner.parseGS1('00123456789012345678');
      expect(gs1Data.sscc).toBe('123456789012345678');
    });

    it("should parse complex GS1-128 with multiple AIs", () => {
      // GTIN + Lot + Expiry: (01)95012345678903(10)LOT001(17)260315
      const gs1Data = scanner.parseGS1('019501234567890310LOT001\x1D17260315');
      expect(gs1Data.gtin).toBe('95012345678903');
      expect(gs1Data.batchLot).toBe('LOT001');
      expect(gs1Data.expirationDate).toBe('2026-03-15');
    });

    it("should handle ]C1 symbology identifier", () => {
      const gs1Data = scanner.parseGS1(']C10195012345678903');
      expect(gs1Data.gtin).toBe('95012345678903');
    });

    it("should correctly determine type from GS1 data", () => {
      // With SSCC - should be SHIPMENT (AI 00 is recognized)
      const shipment = scanner.parseScanData('00123456789012345678');
      expect(shipment.type).toBe('SHIPMENT');

      // With GTIN + serial number - should be SERIAL
      const serial = scanner.parseScanData('019501234567890321SN123');
      expect(serial.type).toBe('SERIAL');

      // With GTIN + lot - should be LOT
      const lot = scanner.parseScanData('019501234567890310LOT001');
      expect(lot.type).toBe('LOT');

      // With GTIN only - should be ITEM
      const item = scanner.parseScanData('0195012345678903');
      expect(item.type).toBe('ITEM');
    });
  });

  describe("ScannerService - Validation", () => {
    let scanner: ScannerService;

    beforeEach(() => {
      scanner = createAMLScanner('AML_M7225');
    });

    it("should validate minimum length", () => {
      expect(scanner.isValidLength('AB')).toBe(false);  // Too short (min 3)
      expect(scanner.isValidLength('ABC')).toBe(true);
    });

    it("should validate maximum length", () => {
      const longBarcode = 'A'.repeat(100);
      expect(scanner.isValidLength(longBarcode)).toBe(true);
      
      const tooLongBarcode = 'A'.repeat(101);
      expect(scanner.isValidLength(tooLongBarcode)).toBe(false);
    });
  });

  describe("KeyboardWedgeScannerHandler", () => {
    let handler: KeyboardWedgeScannerHandler;
    let scanCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      handler = new KeyboardWedgeScannerHandler(AML_SCANNER_PRESETS['AML_M7225']);
      scanCallback = vi.fn();
    });

    it("should process manual input", () => {
      handler.manualInput('TEST-123');
      // Without callback registered, nothing happens
    });

    it("should clear buffer", () => {
      handler.handleKeyInput('A');
      handler.handleKeyInput('B');
      handler.clearBuffer();
      // Buffer should be cleared - no scan should fire on Enter
      handler.handleKeyInput('Enter');
      // Since no callback is registered in this basic test, we just verify no errors
    });
  });

  describe("Default Scanner Export", () => {
    it("should export a default scanner configured for AML M7225", () => {
      expect(defaultScanner).toBeInstanceOf(ScannerService);
    });
  });

  describe("Other Scanner Presets", () => {
    it("should have Zebra DS2208 preset", () => {
      const preset = SCANNER_PRESETS['ZEBRA_DS2208'];
      expect(preset).toBeDefined();
      expect(preset.type).toBe('ZEBRA');
      expect(preset.connectionMode).toBe('KEYBOARD_WEDGE');
    });

    it("should have Honeywell 1200g preset", () => {
      const preset = SCANNER_PRESETS['HONEYWELL_1200G'];
      expect(preset).toBeDefined();
      expect(preset.type).toBe('HONEYWELL');
    });

    it("should create scanner from Zebra preset", () => {
      const scanner = createScannerFromPreset('ZEBRA_DS2208');
      expect(scanner).toBeInstanceOf(ScannerService);
    });
  });
});
