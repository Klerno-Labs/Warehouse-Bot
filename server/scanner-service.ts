/**
 * Scanner Service
 * 
 * Support for various barcode scanners including:
 * - AML scanners (keyboard wedge mode - DBA compatible)
 * - USB HID scanners
 * - Bluetooth scanners
 * - Camera-based scanning
 * 
 * AML scanners are already DBA-compatible and work in keyboard wedge mode,
 * sending keystrokes directly to the focused input field.
 */

// Supported scanner types
export type ScannerType = 
  | 'AML'           // AML barcode scanners (DBA compatible)
  | 'ZEBRA'         // Zebra handheld scanners
  | 'HONEYWELL'     // Honeywell Voyager, Xenon, etc.
  | 'DATALOGIC'     // Datalogic scanners
  | 'SOCKET'        // Socket Mobile scanners
  | 'GENERIC_HID'   // Generic USB HID scanner
  | 'CAMERA';       // Camera-based scanning

// Scanner connection modes
export type ConnectionMode = 
  | 'KEYBOARD_WEDGE'  // Standard keyboard emulation (AML, most scanners)
  | 'USB_HID'         // USB Human Interface Device
  | 'SERIAL'          // Serial port (COM port)
  | 'BLUETOOTH_HID'   // Bluetooth HID
  | 'BLUETOOTH_SPP';  // Bluetooth Serial Port Profile

// Common barcode symbologies
export type BarcodeSymbology =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC_A'
  | 'UPC_E'
  | 'QR_CODE'
  | 'DATA_MATRIX'
  | 'PDF417'
  | 'GS1_128'
  | 'GS1_DATABAR'
  | 'INTERLEAVED_2_OF_5'
  | 'AZTEC';

export interface ScannerConfig {
  type: ScannerType;
  connectionMode: ConnectionMode;
  prefix?: string;           // Scanner adds prefix to scans
  suffix?: string;           // Scanner adds suffix (usually Enter key)
  enabledSymbologies: BarcodeSymbology[];
  debounceMs?: number;       // Debounce rapid scans
  minLength?: number;        // Minimum valid barcode length
  maxLength?: number;        // Maximum valid barcode length
}

export interface ScanEvent {
  rawData: string;
  cleanData: string;
  symbology?: BarcodeSymbology;
  timestamp: Date;
  scannerType: ScannerType;
  metadata?: Record<string, string>;
}

export interface ParsedScanData {
  type: 'ITEM' | 'LOCATION' | 'JOB' | 'LOT' | 'SERIAL' | 'PO' | 'SHIPMENT' | 'UNKNOWN';
  identifier: string;
  gs1Data?: GS1ParsedData;
  raw: string;
}

export interface GS1ParsedData {
  gtin?: string;        // AI 01 - Global Trade Item Number
  serialNumber?: string; // AI 21 - Serial Number
  batchLot?: string;    // AI 10 - Batch/Lot Number
  productionDate?: string; // AI 11 - Production Date
  expirationDate?: string; // AI 17 - Expiration Date
  quantity?: number;    // AI 30 - Count of Items
  sscc?: string;        // AI 00 - Serial Shipping Container Code
}

// AML Scanner presets (DBA compatible configurations)
export const AML_SCANNER_PRESETS: Record<string, ScannerConfig> = {
  // AML M7225 - Handheld terminal (common for DBA)
  'AML_M7225': {
    type: 'AML',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',  // Enter key
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'UPC_A', 'QR_CODE', 'DATA_MATRIX', 'GS1_128'],
    debounceMs: 100,
    minLength: 3,
    maxLength: 100,
  },
  // AML M7500 - Rugged handheld
  'AML_M7500': {
    type: 'AML',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'UPC_A', 'QR_CODE', 'DATA_MATRIX', 'GS1_128', 'PDF417'],
    debounceMs: 100,
    minLength: 3,
    maxLength: 200,
  },
  // AML LDX10 - Linear imager
  'AML_LDX10': {
    type: 'AML',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC_A', 'UPC_E', 'GS1_128', 'INTERLEAVED_2_OF_5'],
    debounceMs: 100,
    minLength: 3,
    maxLength: 50,
  },
  // AML Scepter - Mobile computer
  'AML_SCEPTER': {
    type: 'AML',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'UPC_A', 'QR_CODE', 'DATA_MATRIX', 'GS1_128', 'PDF417', 'AZTEC'],
    debounceMs: 100,
    minLength: 3,
    maxLength: 500,
  },
};

// Other common scanner presets
export const SCANNER_PRESETS: Record<string, ScannerConfig> = {
  ...AML_SCANNER_PRESETS,
  // Zebra DS2208
  'ZEBRA_DS2208': {
    type: 'ZEBRA',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'UPC_A', 'QR_CODE', 'DATA_MATRIX', 'GS1_128'],
    debounceMs: 50,
    minLength: 1,
    maxLength: 100,
  },
  // Honeywell Voyager 1200g
  'HONEYWELL_1200G': {
    type: 'HONEYWELL',
    connectionMode: 'KEYBOARD_WEDGE',
    suffix: '\r',
    enabledSymbologies: ['CODE128', 'CODE39', 'EAN13', 'UPC_A', 'GS1_128'],
    debounceMs: 50,
    minLength: 1,
    maxLength: 80,
  },
};

// GS1 Application Identifier definitions
const GS1_AI_DEFINITIONS: Record<string, { name: string; length: number | 'variable'; format: string }> = {
  '00': { name: 'SSCC', length: 18, format: 'N18' },
  '01': { name: 'GTIN', length: 14, format: 'N14' },
  '02': { name: 'GTIN of contained items', length: 14, format: 'N14' },
  '10': { name: 'Batch/Lot', length: 'variable', format: 'X..20' },
  '11': { name: 'Production Date', length: 6, format: 'N6' },
  '12': { name: 'Due Date', length: 6, format: 'N6' },
  '13': { name: 'Packaging Date', length: 6, format: 'N6' },
  '15': { name: 'Best Before Date', length: 6, format: 'N6' },
  '17': { name: 'Expiration Date', length: 6, format: 'N6' },
  '20': { name: 'Variant', length: 2, format: 'N2' },
  '21': { name: 'Serial Number', length: 'variable', format: 'X..20' },
  '22': { name: 'Consumer Product Variant', length: 'variable', format: 'X..20' },
  '30': { name: 'Count of Items', length: 'variable', format: 'N..8' },
  '37': { name: 'Count of Trade Items', length: 'variable', format: 'N..8' },
  '240': { name: 'Additional Product ID', length: 'variable', format: 'X..30' },
  '241': { name: 'Customer Part Number', length: 'variable', format: 'X..30' },
  '250': { name: 'Secondary Serial Number', length: 'variable', format: 'X..30' },
  '400': { name: 'Customer PO Number', length: 'variable', format: 'X..30' },
  '410': { name: 'Ship to GLN', length: 13, format: 'N13' },
  '420': { name: 'Ship to Postal Code', length: 'variable', format: 'X..20' },
};

/**
 * Scanner Service - Handles barcode scanning from various devices
 */
export class ScannerService {
  private config: ScannerConfig;
  private lastScanTime: number = 0;
  private listeners: ((event: ScanEvent) => void)[] = [];

  constructor(config: ScannerConfig) {
    this.config = config;
  }

  /**
   * Process a raw scan input
   */
  processScan(rawData: string): ScanEvent {
    const now = Date.now();
    
    // Clean the data (remove prefix/suffix)
    let cleanData = rawData;
    if (this.config.prefix && cleanData.startsWith(this.config.prefix)) {
      cleanData = cleanData.substring(this.config.prefix.length);
    }
    if (this.config.suffix && cleanData.endsWith(this.config.suffix)) {
      cleanData = cleanData.substring(0, cleanData.length - this.config.suffix.length);
    }
    cleanData = cleanData.trim();

    const event: ScanEvent = {
      rawData,
      cleanData,
      timestamp: new Date(),
      scannerType: this.config.type,
      symbology: this.detectSymbology(cleanData),
    };

    this.lastScanTime = now;
    
    // Notify listeners
    this.listeners.forEach(listener => listener(event));
    
    return event;
  }

  /**
   * Detect the barcode symbology based on format
   */
  private detectSymbology(data: string): BarcodeSymbology | undefined {
    // Check for GS1-128 (contains FNC1 or starts with specific patterns)
    if (data.includes('\x1D') || /^\]C1/.test(data) || /^01\d{14}/.test(data)) {
      return 'GS1_128';
    }
    
    // EAN-13
    if (/^\d{13}$/.test(data)) {
      return 'EAN13';
    }
    
    // EAN-8
    if (/^\d{8}$/.test(data)) {
      return 'EAN8';
    }
    
    // UPC-A
    if (/^\d{12}$/.test(data)) {
      return 'UPC_A';
    }
    
    // UPC-E
    if (/^\d{6,8}$/.test(data) && data.length <= 8) {
      return 'UPC_E';
    }
    
    // QR Code typically contains URLs or structured data
    if (data.includes('http') || data.includes('://') || data.length > 50) {
      return 'QR_CODE';
    }
    
    // CODE39 - alphanumeric with specific characters
    if (/^[A-Z0-9\-\.\s\$\/\+\%]+$/.test(data)) {
      return 'CODE39';
    }
    
    // Default to CODE128 for other alphanumeric
    if (/^[\x20-\x7E]+$/.test(data)) {
      return 'CODE128';
    }
    
    return undefined;
  }

  /**
   * Parse the scan data to identify what was scanned
   */
  parseScanData(data: string): ParsedScanData {
    // Check for GS1-128 format
    if (this.isGS1Format(data)) {
      const gs1Data = this.parseGS1(data);
      return {
        type: this.determineGS1Type(gs1Data),
        identifier: gs1Data.gtin || gs1Data.serialNumber || gs1Data.sscc || data,
        gs1Data,
        raw: data,
      };
    }

    // Check for application-specific prefixes
    const upperData = data.toUpperCase();
    
    // Job/Work Order patterns (common in DBA)
    if (/^(JOB|WO|MO|SO)-?\d+/.test(upperData) || /^[A-Z]{2,3}\d{6,}$/.test(upperData)) {
      return { type: 'JOB', identifier: data, raw: data };
    }
    
    // Location patterns
    if (/^(LOC|BIN|ZONE|RACK|AISLE)-/.test(upperData) || /^[A-Z]-\d{2}-\d{2}(-\d{2})?$/.test(upperData)) {
      return { type: 'LOCATION', identifier: data, raw: data };
    }
    
    // Lot/Batch patterns
    if (/^(LOT|BATCH)-/.test(upperData)) {
      return { type: 'LOT', identifier: data.replace(/^(LOT|BATCH)-/i, ''), raw: data };
    }
    
    // Serial number patterns
    if (/^(SN|SERIAL)-/.test(upperData)) {
      return { type: 'SERIAL', identifier: data.replace(/^(SN|SERIAL)-/i, ''), raw: data };
    }
    
    // Purchase Order patterns
    if (/^(PO|PURCHASE)-?\d+/.test(upperData)) {
      return { type: 'PO', identifier: data, raw: data };
    }
    
    // Shipment/Tracking patterns
    if (/^(SHIP|TRK|TRACK|1Z|FX|JD)/.test(upperData)) {
      return { type: 'SHIPMENT', identifier: data, raw: data };
    }
    
    // Default to ITEM (most common scan type)
    return { type: 'ITEM', identifier: data, raw: data };
  }

  /**
   * Check if data is in GS1-128 format
   */
  private isGS1Format(data: string): boolean {
    // Check for FNC1 character or ]C1 symbology identifier
    if (data.includes('\x1D') || data.startsWith(']C1')) {
      return true;
    }
    // Check for common AI patterns
    return /^(00|01|02|10|11|17|21|30)\d/.test(data);
  }

  /**
   * Parse GS1-128 barcode data
   */
  parseGS1(data: string): GS1ParsedData {
    const result: GS1ParsedData = {};
    
    // Remove symbology identifier if present
    let remaining = data.replace(/^\]C1/, '');
    
    // Group Separator character (FNC1 in keyboard mode often becomes this)
    const GS = '\x1D';
    
    while (remaining.length > 0) {
      let matched = false;
      
      // Try 3-digit AIs first (like 240, 241, etc.)
      for (const [ai, def] of Object.entries(GS1_AI_DEFINITIONS)) {
        if (remaining.startsWith(ai)) {
          const aiLength = ai.length;
          remaining = remaining.substring(aiLength);
          
          let value: string;
          if (def.length === 'variable') {
            // Variable length - read until GS or end
            const gsIndex = remaining.indexOf(GS);
            if (gsIndex !== -1) {
              value = remaining.substring(0, gsIndex);
              remaining = remaining.substring(gsIndex + 1);
            } else {
              value = remaining;
              remaining = '';
            }
          } else {
            // Fixed length
            value = remaining.substring(0, def.length);
            remaining = remaining.substring(def.length);
          }
          
          // Map to result fields
          switch (ai) {
            case '00': result.sscc = value; break;
            case '01': result.gtin = value; break;
            case '10': result.batchLot = value; break;
            case '11': result.productionDate = this.formatGS1Date(value); break;
            case '17': result.expirationDate = this.formatGS1Date(value); break;
            case '21': result.serialNumber = value; break;
            case '30': result.quantity = parseInt(value, 10); break;
          }
          
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Unknown AI - skip one character and continue
        remaining = remaining.substring(1);
      }
    }
    
    return result;
  }

  /**
   * Format GS1 date (YYMMDD) to ISO format
   */
  private formatGS1Date(dateStr: string): string {
    if (dateStr.length !== 6) return dateStr;
    
    const year = parseInt(dateStr.substring(0, 2), 10);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    
    // Y2K handling: 00-49 = 2000s, 50-99 = 1900s
    const fullYear = year <= 49 ? 2000 + year : 1900 + year;
    
    return `${fullYear}-${month}-${day}`;
  }

  /**
   * Determine the scan type from GS1 data
   */
  private determineGS1Type(gs1: GS1ParsedData): ParsedScanData['type'] {
    if (gs1.sscc) return 'SHIPMENT';
    if (gs1.serialNumber) return 'SERIAL';
    if (gs1.batchLot) return 'LOT';
    if (gs1.gtin) return 'ITEM';
    return 'UNKNOWN';
  }

  /**
   * Register a scan event listener
   */
  onScan(callback: (event: ScanEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Check if enough time has passed since last scan (debounce)
   */
  shouldProcessScan(): boolean {
    const now = Date.now();
    const debounce = this.config.debounceMs || 100;
    return now - this.lastScanTime >= debounce;
  }

  /**
   * Validate barcode length
   */
  isValidLength(data: string): boolean {
    const { minLength = 1, maxLength = 500 } = this.config;
    return data.length >= minLength && data.length <= maxLength;
  }
}

/**
 * Keyboard Wedge Scanner Handler
 * 
 * Detects rapid keystrokes (typical of scanner input) vs. human typing.
 * AML scanners in keyboard wedge mode send characters very quickly.
 */
export class KeyboardWedgeScannerHandler {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private config: ScannerConfig;
  private scanCallback?: (data: string) => void;
  
  // Scanners typically send characters < 50ms apart
  private readonly SCAN_CHAR_INTERVAL_MS = 50;
  // Buffer timeout to reset if no new characters
  private readonly BUFFER_TIMEOUT_MS = 200;
  private bufferTimeoutId?: ReturnType<typeof setTimeout>;

  constructor(config: ScannerConfig) {
    this.config = config;
  }

  /**
   * Initialize keyboard event listeners (call in browser context)
   */
  initializeBrowserListeners(callback: (data: string) => void): () => void {
    this.scanCallback = callback;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      this.handleKeyInput(event.key, event);
    };
    
    // This would be called in browser context
    // document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      // document.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Handle a key input (character or control key)
   */
  handleKeyInput(key: string, event?: KeyboardEvent): void {
    const now = Date.now();
    const timeSinceLastKey = now - this.lastKeyTime;
    
    // Reset buffer if too much time has passed
    if (timeSinceLastKey > this.BUFFER_TIMEOUT_MS) {
      this.buffer = '';
    }
    
    // Clear existing timeout
    if (this.bufferTimeoutId) {
      clearTimeout(this.bufferTimeoutId);
    }
    
    // Check for terminator (Enter key or configured suffix)
    if (key === 'Enter' || key === this.config.suffix) {
      if (this.buffer.length > 0 && this.isLikelyScan()) {
        // This looks like a scan - process it
        if (event) event.preventDefault();
        this.processScanBuffer();
      }
      return;
    }
    
    // Only process printable characters
    if (key.length === 1) {
      // Check if this is rapid input (likely from scanner)
      if (timeSinceLastKey < this.SCAN_CHAR_INTERVAL_MS || this.buffer.length === 0) {
        this.buffer += key;
      } else {
        // Slow typing - probably human, reset buffer
        this.buffer = key;
      }
    }
    
    this.lastKeyTime = now;
    
    // Set timeout to process buffer if no more input
    this.bufferTimeoutId = setTimeout(() => {
      if (this.buffer.length > 0 && this.isLikelyScan()) {
        this.processScanBuffer();
      }
    }, this.BUFFER_TIMEOUT_MS);
  }

  /**
   * Check if buffered input looks like a scan (not human typing)
   */
  private isLikelyScan(): boolean {
    const { minLength = 3 } = this.config;
    return this.buffer.length >= minLength;
  }

  /**
   * Process the buffered scan data
   */
  private processScanBuffer(): void {
    const data = this.buffer;
    this.buffer = '';
    
    if (this.scanCallback) {
      this.scanCallback(data);
    }
  }

  /**
   * Manually input scan data (for testing or direct input)
   */
  manualInput(data: string): void {
    if (this.scanCallback) {
      this.scanCallback(data);
    }
  }

  /**
   * Clear the buffer
   */
  clearBuffer(): void {
    this.buffer = '';
    if (this.bufferTimeoutId) {
      clearTimeout(this.bufferTimeoutId);
    }
  }
}

/**
 * Create a scanner service configured for AML scanners (DBA compatible)
 */
export function createAMLScanner(preset: keyof typeof AML_SCANNER_PRESETS = 'AML_M7225'): ScannerService {
  return new ScannerService(AML_SCANNER_PRESETS[preset]);
}

/**
 * Create a scanner service from a preset name
 */
export function createScannerFromPreset(presetName: string): ScannerService {
  const config = SCANNER_PRESETS[presetName];
  if (!config) {
    throw new Error(`Unknown scanner preset: ${presetName}`);
  }
  return new ScannerService(config);
}

// Default scanner service (AML M7225 - most common DBA configuration)
export const defaultScanner = createAMLScanner('AML_M7225');
