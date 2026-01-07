/**
 * Barcode Scanning Tests
 * 
 * Tests for barcode parsing, validation, and scanning operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Barcode types
const BARCODE_TYPES = {
  EAN13: "EAN13",
  EAN8: "EAN8",
  UPC_A: "UPC_A",
  UPC_E: "UPC_E",
  CODE128: "CODE128",
  CODE39: "CODE39",
  QR_CODE: "QR_CODE",
  DATA_MATRIX: "DATA_MATRIX",
  GS1_128: "GS1_128",
} as const;

type BarcodeType = typeof BARCODE_TYPES[keyof typeof BARCODE_TYPES];

// GS1 Application Identifiers
const GS1_AI = {
  GTIN: "01",           // Global Trade Item Number
  SERIAL: "21",         // Serial Number
  BATCH_LOT: "10",      // Batch/Lot Number
  PROD_DATE: "11",      // Production Date (YYMMDD)
  EXP_DATE: "17",       // Expiration Date (YYMMDD)
  QUANTITY: "30",       // Count of Items
  NET_WEIGHT_KG: "310", // Net Weight in kg
  NET_WEIGHT_LB: "320", // Net Weight in lb
};

interface ParsedBarcode {
  type: BarcodeType;
  rawValue: string;
  data: Record<string, string>;
  isValid: boolean;
  validationErrors: string[];
}

interface BarcodeParseResult {
  success: boolean;
  barcode?: ParsedBarcode;
  error?: string;
}

// Barcode parser functions
const calculateEAN13CheckDigit = (digits: string): number => {
  if (digits.length !== 12) throw new Error("EAN-13 requires 12 digits");
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  return (10 - (sum % 10)) % 10;
};

const validateEAN13 = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) return false;
  
  const digits = barcode.slice(0, 12);
  const checkDigit = parseInt(barcode[12], 10);
  
  return calculateEAN13CheckDigit(digits) === checkDigit;
};

const parseGS1_128 = (barcode: string): Record<string, string> => {
  const result: Record<string, string> = {};
  let remaining = barcode;
  
  // Remove start code if present
  if (remaining.startsWith("]C1")) {
    remaining = remaining.substring(3);
  }
  
  // Parse Application Identifiers
  const aiPatterns: [string, RegExp][] = [
    [GS1_AI.GTIN, /^01(\d{14})/],
    [GS1_AI.SERIAL, /^21([^\x1D]+)(?:\x1D|$)/],
    [GS1_AI.BATCH_LOT, /^10([^\x1D]+)(?:\x1D|$)/],
    [GS1_AI.PROD_DATE, /^11(\d{6})/],
    [GS1_AI.EXP_DATE, /^17(\d{6})/],
    [GS1_AI.QUANTITY, /^30(\d+)/],
  ];
  
  while (remaining.length > 0) {
    let matched = false;
    
    for (const [ai, pattern] of aiPatterns) {
      const match = remaining.match(pattern);
      if (match) {
        result[ai] = match[1];
        remaining = remaining.substring(match[0].length);
        // Remove FNC1 separator if present
        if (remaining.startsWith("\x1D")) {
          remaining = remaining.substring(1);
        }
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Unknown AI, skip
      remaining = remaining.substring(2);
    }
  }
  
  return result;
};

describe("Barcode Scanning Tests", () => {
  describe("Barcode Type Detection", () => {
    it("should detect EAN-13 barcode", () => {
      const detectBarcodeType = (value: string): BarcodeType | null => {
        if (/^\d{13}$/.test(value)) return BARCODE_TYPES.EAN13;
        if (/^\d{8}$/.test(value)) return BARCODE_TYPES.EAN8;
        if (/^\d{12}$/.test(value)) return BARCODE_TYPES.UPC_A;
        if (/^01\d{14}/.test(value)) return BARCODE_TYPES.GS1_128;
        if (/^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(value)) return BARCODE_TYPES.CODE39;
        return BARCODE_TYPES.CODE128;
      };

      expect(detectBarcodeType("5901234123457")).toBe(BARCODE_TYPES.EAN13);
      expect(detectBarcodeType("12345678")).toBe(BARCODE_TYPES.EAN8);
      expect(detectBarcodeType("012345678901")).toBe(BARCODE_TYPES.UPC_A);
      expect(detectBarcodeType("0100123456789012")).toBe(BARCODE_TYPES.GS1_128);
    });
  });

  describe("EAN-13 Validation", () => {
    it("should validate correct EAN-13 barcode", () => {
      // Valid EAN-13: 5901234123457
      expect(validateEAN13("5901234123457")).toBe(true);
    });

    it("should reject invalid EAN-13 check digit", () => {
      // Changed last digit from 7 to 8
      expect(validateEAN13("5901234123458")).toBe(false);
    });

    it("should reject non-numeric EAN-13", () => {
      expect(validateEAN13("590123412345A")).toBe(false);
    });

    it("should reject wrong length EAN-13", () => {
      expect(validateEAN13("123456789012")).toBe(false); // 12 digits
      expect(validateEAN13("12345678901234")).toBe(false); // 14 digits
    });

    it("should calculate correct check digit", () => {
      expect(calculateEAN13CheckDigit("590123412345")).toBe(7);
      expect(calculateEAN13CheckDigit("400638133393")).toBe(1);
    });
  });

  describe("GS1-128 Parsing", () => {
    it("should parse GTIN from GS1-128", () => {
      const barcode = "0100012345678905";
      const parsed = parseGS1_128(barcode);
      
      expect(parsed[GS1_AI.GTIN]).toBe("00012345678905");
    });

    it("should parse batch/lot number", () => {
      const barcode = "0100012345678905" + "10" + "BATCH001";
      const parsed = parseGS1_128(barcode);
      
      expect(parsed[GS1_AI.GTIN]).toBe("00012345678905");
      expect(parsed[GS1_AI.BATCH_LOT]).toBe("BATCH001");
    });

    it("should parse expiration date", () => {
      const barcode = "0100012345678905" + "17" + "261231";
      const parsed = parseGS1_128(barcode);
      
      expect(parsed[GS1_AI.GTIN]).toBe("00012345678905");
      expect(parsed[GS1_AI.EXP_DATE]).toBe("261231");
    });

    it("should parse multiple AIs with FNC1 separators", () => {
      // GTIN + Batch (with FNC1) + Serial
      const fnc1 = "\x1D";
      const barcode = "0100012345678905" + "10BATCH001" + fnc1 + "21SERIAL123";
      const parsed = parseGS1_128(barcode);
      
      expect(parsed[GS1_AI.GTIN]).toBe("00012345678905");
      expect(parsed[GS1_AI.BATCH_LOT]).toBe("BATCH001");
      expect(parsed[GS1_AI.SERIAL]).toBe("SERIAL123");
    });

    it("should parse quantity", () => {
      const barcode = "0100012345678905" + "30" + "50";
      const parsed = parseGS1_128(barcode);
      
      expect(parsed[GS1_AI.QUANTITY]).toBe("50");
    });
  });

  describe("Barcode to Item Lookup", () => {
    const mockItems = [
      { id: "item-001", sku: "SKU001", upc: "5901234123457", name: "Product A" },
      { id: "item-002", sku: "SKU002", upc: "4006381333931", name: "Product B" },
      { id: "item-003", sku: "SKU003", gtin: "00012345678905", name: "Product C" },
    ];

    it("should find item by UPC", () => {
      const findItemByBarcode = (barcode: string) => {
        return mockItems.find(item => 
          item.upc === barcode || item.gtin === barcode || item.sku === barcode
        );
      };

      const item = findItemByBarcode("5901234123457");
      expect(item?.id).toBe("item-001");
      expect(item?.name).toBe("Product A");
    });

    it("should find item by GTIN from GS1-128", () => {
      const barcode = "0100012345678905";
      const parsed = parseGS1_128(barcode);
      const gtin = parsed[GS1_AI.GTIN];

      const item = mockItems.find(i => i.gtin === gtin);
      expect(item?.id).toBe("item-003");
    });

    it("should return null for unknown barcode", () => {
      const findItemByBarcode = (barcode: string) => {
        return mockItems.find(item => 
          item.upc === barcode || item.gtin === barcode || item.sku === barcode
        );
      };

      const item = findItemByBarcode("9999999999999");
      expect(item).toBeUndefined();
    });
  });

  describe("Location Barcode Handling", () => {
    it("should parse location barcode", () => {
      const parseLocationBarcode = (barcode: string): { zone: string; aisle: string; rack: string; shelf: string } | null => {
        // Format: LOC-ZONE-AISLE-RACK-SHELF (e.g., LOC-A-01-03-02)
        const match = barcode.match(/^LOC-([A-Z])-(\d{2})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        
        return {
          zone: match[1],
          aisle: match[2],
          rack: match[3],
          shelf: match[4],
        };
      };

      const location = parseLocationBarcode("LOC-A-01-03-02");
      expect(location?.zone).toBe("A");
      expect(location?.aisle).toBe("01");
      expect(location?.rack).toBe("03");
      expect(location?.shelf).toBe("02");
    });

    it("should reject invalid location barcode", () => {
      const parseLocationBarcode = (barcode: string) => {
        const match = barcode.match(/^LOC-([A-Z])-(\d{2})-(\d{2})-(\d{2})$/);
        return match ? { zone: match[1] } : null;
      };

      expect(parseLocationBarcode("INVALID")).toBeNull();
      expect(parseLocationBarcode("LOC-AA-01-03-02")).toBeNull();
      expect(parseLocationBarcode("LOC-A-1-3-2")).toBeNull();
    });
  });

  describe("Scan Operations", () => {
    interface ScanEvent {
      barcode: string;
      timestamp: Date;
      userId: string;
      operation: "RECEIVE" | "PICK" | "TRANSFER" | "CYCLE_COUNT";
      locationId?: string;
      quantity?: number;
    }

    it("should record receiving scan", () => {
      const scanEvent: ScanEvent = {
        barcode: "5901234123457",
        timestamp: new Date(),
        userId: "user-001",
        operation: "RECEIVE",
        locationId: "loc-001",
        quantity: 10,
      };

      expect(scanEvent.operation).toBe("RECEIVE");
      expect(scanEvent.quantity).toBe(10);
    });

    it("should record pick scan", () => {
      const scanEvent: ScanEvent = {
        barcode: "5901234123457",
        timestamp: new Date(),
        userId: "user-001",
        operation: "PICK",
        locationId: "loc-001",
        quantity: 5,
      };

      expect(scanEvent.operation).toBe("PICK");
    });

    it("should batch multiple scans", () => {
      const scans: ScanEvent[] = [
        { barcode: "5901234123457", timestamp: new Date(), userId: "user-001", operation: "RECEIVE", quantity: 10 },
        { barcode: "5901234123457", timestamp: new Date(), userId: "user-001", operation: "RECEIVE", quantity: 10 },
        { barcode: "4006381333931", timestamp: new Date(), userId: "user-001", operation: "RECEIVE", quantity: 5 },
      ];

      // Aggregate by barcode
      const aggregated = scans.reduce((acc, scan) => {
        const key = scan.barcode;
        if (!acc[key]) acc[key] = 0;
        acc[key] += scan.quantity || 1;
        return acc;
      }, {} as Record<string, number>);

      expect(aggregated["5901234123457"]).toBe(20);
      expect(aggregated["4006381333931"]).toBe(5);
    });
  });

  describe("Barcode Generation", () => {
    it("should generate valid EAN-13 with check digit", () => {
      const generateEAN13 = (prefix: string): string => {
        if (prefix.length !== 12) throw new Error("Prefix must be 12 digits");
        const checkDigit = calculateEAN13CheckDigit(prefix);
        return prefix + checkDigit;
      };

      const ean13 = generateEAN13("590123412345");
      expect(ean13).toBe("5901234123457");
      expect(validateEAN13(ean13)).toBe(true);
    });

    it("should generate location barcode", () => {
      const generateLocationBarcode = (zone: string, aisle: number, rack: number, shelf: number): string => {
        return `LOC-${zone}-${String(aisle).padStart(2, "0")}-${String(rack).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`;
      };

      expect(generateLocationBarcode("A", 1, 3, 2)).toBe("LOC-A-01-03-02");
      expect(generateLocationBarcode("B", 12, 5, 10)).toBe("LOC-B-12-05-10");
    });

    it("should generate item label barcode with lot info", () => {
      const generateGS1_128 = (gtin: string, batch?: string, expDate?: string): string => {
        let barcode = `01${gtin.padStart(14, "0")}`;
        if (batch) barcode += `10${batch}\x1D`;
        if (expDate) barcode += `17${expDate}`;
        return barcode;
      };

      const barcode = generateGS1_128("12345678905", "LOT001", "261231");
      expect(barcode).toContain("0100012345678905");
      expect(barcode).toContain("10LOT001");
      expect(barcode).toContain("17261231");
    });
  });

  describe("Scan Validation", () => {
    it("should validate scan against expected item", () => {
      const validateScan = (
        scannedBarcode: string,
        expectedItemId: string,
        items: Array<{ id: string; upc: string }>
      ): { valid: boolean; error?: string } => {
        const scannedItem = items.find(i => i.upc === scannedBarcode);
        
        if (!scannedItem) {
          return { valid: false, error: "Unknown barcode" };
        }
        
        if (scannedItem.id !== expectedItemId) {
          return { valid: false, error: `Expected ${expectedItemId}, scanned ${scannedItem.id}` };
        }
        
        return { valid: true };
      };

      const items = [
        { id: "item-001", upc: "5901234123457" },
        { id: "item-002", upc: "4006381333931" },
      ];

      const validResult = validateScan("5901234123457", "item-001", items);
      expect(validResult.valid).toBe(true);

      const wrongItemResult = validateScan("4006381333931", "item-001", items);
      expect(wrongItemResult.valid).toBe(false);
      expect(wrongItemResult.error).toContain("Expected");

      const unknownResult = validateScan("9999999999999", "item-001", items);
      expect(unknownResult.valid).toBe(false);
      expect(unknownResult.error).toBe("Unknown barcode");
    });

    it("should validate lot-tracked item scan includes lot", () => {
      const validateLotScan = (
        barcode: string,
        isLotTracked: boolean
      ): { valid: boolean; error?: string; lot?: string } => {
        const parsed = parseGS1_128(barcode);
        
        if (isLotTracked && !parsed[GS1_AI.BATCH_LOT]) {
          return { valid: false, error: "Lot number required for lot-tracked item" };
        }
        
        return { valid: true, lot: parsed[GS1_AI.BATCH_LOT] };
      };

      const withLot = "0100012345678905" + "10LOT001";
      const withoutLot = "0100012345678905";

      expect(validateLotScan(withLot, true).valid).toBe(true);
      expect(validateLotScan(withLot, true).lot).toBe("LOT001");
      expect(validateLotScan(withoutLot, true).valid).toBe(false);
      expect(validateLotScan(withoutLot, false).valid).toBe(true);
    });
  });

  describe("Mobile Scanner Integration", () => {
    it("should handle camera scan result", () => {
      interface CameraScanResult {
        format: string;
        rawValue: string;
        timestamp: number;
      }

      const processCameraScan = (result: CameraScanResult): { barcode: string; type: BarcodeType } => {
        const typeMap: Record<string, BarcodeType> = {
          "EAN_13": BARCODE_TYPES.EAN13,
          "EAN_8": BARCODE_TYPES.EAN8,
          "UPC_A": BARCODE_TYPES.UPC_A,
          "CODE_128": BARCODE_TYPES.CODE128,
          "QR_CODE": BARCODE_TYPES.QR_CODE,
        };

        return {
          barcode: result.rawValue,
          type: typeMap[result.format] || BARCODE_TYPES.CODE128,
        };
      };

      const scanResult: CameraScanResult = {
        format: "EAN_13",
        rawValue: "5901234123457",
        timestamp: Date.now(),
      };

      const processed = processCameraScan(scanResult);
      expect(processed.barcode).toBe("5901234123457");
      expect(processed.type).toBe(BARCODE_TYPES.EAN13);
    });

    it("should handle keyboard wedge input", () => {
      const processKeyboardInput = (input: string): string => {
        // Remove common prefixes/suffixes added by scanners
        let cleaned = input.trim();
        
        // Remove carriage return/line feed
        cleaned = cleaned.replace(/[\r\n]/g, "");
        
        // Some scanners add prefix/suffix
        if (cleaned.startsWith("~")) cleaned = cleaned.substring(1);
        if (cleaned.endsWith("~")) cleaned = cleaned.slice(0, -1);
        
        return cleaned;
      };

      expect(processKeyboardInput("5901234123457\r\n")).toBe("5901234123457");
      expect(processKeyboardInput("~5901234123457~")).toBe("5901234123457");
      expect(processKeyboardInput("  5901234123457  ")).toBe("5901234123457");
    });
  });

  describe("Error Handling", () => {
    it("should handle corrupted barcode", () => {
      const parseBarcode = (value: string): BarcodeParseResult => {
        if (!value || value.length === 0) {
          return { success: false, error: "Empty barcode" };
        }

        if (value.includes("�") || value.includes("\uFFFD")) {
          return { success: false, error: "Corrupted barcode data" };
        }

        return {
          success: true,
          barcode: {
            type: BARCODE_TYPES.CODE128,
            rawValue: value,
            data: {},
            isValid: true,
            validationErrors: [],
          },
        };
      };

      expect(parseBarcode("").success).toBe(false);
      expect(parseBarcode("valid123").success).toBe(true);
      expect(parseBarcode("corrupted�data").success).toBe(false);
    });

    it("should handle rapid successive scans", () => {
      const DEBOUNCE_MS = 500;
      let lastScanTime = 0;
      const processedScans: string[] = [];

      const handleScan = (barcode: string, timestamp: number): boolean => {
        if (timestamp - lastScanTime < DEBOUNCE_MS) {
          return false; // Debounced
        }
        
        lastScanTime = timestamp;
        processedScans.push(barcode);
        return true;
      };

      const now = Date.now();
      expect(handleScan("barcode1", now)).toBe(true);
      expect(handleScan("barcode1", now + 100)).toBe(false); // Too fast
      expect(handleScan("barcode2", now + 600)).toBe(true); // OK
      
      expect(processedScans).toEqual(["barcode1", "barcode2"]);
    });
  });
});
