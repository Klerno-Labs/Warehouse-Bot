/**
 * Thermal Label Printing Service
 * 
 * Generates TSPL (TSC Printer Language) commands for TSC TDP-244 and compatible printers.
 * Also supports ZPL for Zebra printers and raw text for generic thermal printers.
 * 
 * TSC TDP-244 Specs:
 * - 203 DPI resolution
 * - Max print width: 4.25" (108mm)
 * - Supports direct thermal and thermal transfer
 * - USB, Serial, Ethernet connectivity
 * 
 * Usage:
 * 1. Generate label commands using the service
 * 2. Send raw commands to printer via USB/network
 * 3. Or use browser-based printing with WebUSB/WebSerial API
 */

// Printer configurations
export interface PrinterConfig {
  type: 'tspl' | 'zpl' | 'raw';
  dpi: number;
  widthMm: number;
  heightMm: number;
  gapMm?: number;  // Label gap for continuous media
  speed?: number;  // Print speed (1-10)
  darkness?: number; // Print darkness (0-15)
}

export const PRINTER_PRESETS: Record<string, PrinterConfig> = {
  'TSC_TDP244': {
    type: 'tspl',
    dpi: 203,
    widthMm: 100,
    heightMm: 50,
    gapMm: 3,
    speed: 4,
    darkness: 8,
  },
  'TSC_TDP247': {
    type: 'tspl',
    dpi: 203,
    widthMm: 100,
    heightMm: 100,
    gapMm: 3,
    speed: 4,
    darkness: 8,
  },
  'ZEBRA_GK420': {
    type: 'zpl',
    dpi: 203,
    widthMm: 100,
    heightMm: 50,
    gapMm: 3,
    speed: 4,
    darkness: 15,
  },
};

// Label data structures
export interface ItemLabel {
  sku: string;
  name: string;
  description?: string;
  barcode: string;
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'QR';
  location?: string;
  uom?: string;
  lotNumber?: string;
  expiryDate?: Date;
  quantity?: number;
}

export interface LocationLabel {
  locationCode: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  barcode: string;
}

export interface ShippingLabel {
  shipmentNumber: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  shipTo: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  weight?: number;
  packageCount?: string;  // e.g., "1 of 3"
}

export interface QRLabelData {
  content: string;
  title?: string;
  subtitle?: string;
}

/**
 * TSC Printer Language (TSPL) Label Generator
 * Compatible with TSC TDP-244, TDP-247, TE200, TE300, etc.
 */
export class TSPLLabelGenerator {
  private config: PrinterConfig;

  constructor(config: PrinterConfig = PRINTER_PRESETS.TSC_TDP244) {
    this.config = config;
  }

  /**
   * Convert mm to dots based on DPI
   */
  private mmToDots(mm: number): number {
    return Math.round((mm / 25.4) * this.config.dpi);
  }

  /**
   * Generate label setup commands
   */
  private getSetupCommands(): string {
    const width = this.mmToDots(this.config.widthMm);
    const height = this.mmToDots(this.config.heightMm);
    const gap = this.mmToDots(this.config.gapMm || 3);
    
    return [
      `SIZE ${this.config.widthMm} mm, ${this.config.heightMm} mm`,
      `GAP ${this.config.gapMm || 3} mm, 0 mm`,
      `SPEED ${this.config.speed || 4}`,
      `DENSITY ${this.config.darkness || 8}`,
      'DIRECTION 1',
      'CLS',  // Clear image buffer
    ].join('\n');
  }

  /**
   * Generate Item/SKU label
   */
  generateItemLabel(item: ItemLabel, copies: number = 1): string {
    const commands: string[] = [this.getSetupCommands()];
    
    // Calculate positions (based on 100mm x 50mm label)
    const margin = this.mmToDots(3);
    const lineHeight = this.mmToDots(5);
    
    // Title - SKU
    commands.push(`TEXT ${margin},${margin},"4",0,1,1,"${this.escapeText(item.sku)}"`);
    
    // Item name
    commands.push(`TEXT ${margin},${margin + lineHeight},"3",0,1,1,"${this.escapeText(item.name.substring(0, 30))}"`);
    
    // Description (if fits)
    if (item.description) {
      commands.push(`TEXT ${margin},${margin + lineHeight * 2},"2",0,1,1,"${this.escapeText(item.description.substring(0, 40))}"`);
    }
    
    // Barcode - centered, CODE128 by default
    const barcodeY = this.mmToDots(20);
    const barcodeType = item.barcodeType || 'CODE128';
    commands.push(`BARCODE ${margin},${barcodeY},"${barcodeType.replace('CODE', '')}",60,1,0,2,4,"${item.barcode}"`);
    
    // Barcode text below
    commands.push(`TEXT ${margin},${barcodeY + this.mmToDots(18)},"2",0,1,1,"${item.barcode}"`);
    
    // Location and UOM on right side
    const rightX = this.mmToDots(60);
    if (item.location) {
      commands.push(`TEXT ${rightX},${margin},"2",0,1,1,"LOC: ${this.escapeText(item.location)}"`);
    }
    if (item.uom) {
      commands.push(`TEXT ${rightX},${margin + lineHeight},"2",0,1,1,"UOM: ${item.uom}"`);
    }
    
    // Lot number and expiry (if present)
    if (item.lotNumber) {
      commands.push(`TEXT ${rightX},${margin + lineHeight * 2},"2",0,1,1,"LOT: ${item.lotNumber}"`);
    }
    if (item.expiryDate) {
      const expiry = item.expiryDate.toLocaleDateString();
      commands.push(`TEXT ${rightX},${margin + lineHeight * 3},"2",0,1,1,"EXP: ${expiry}"`);
    }
    
    // Print command
    commands.push(`PRINT ${copies},1`);
    commands.push('');  // Trailing newline
    
    return commands.join('\n');
  }

  /**
   * Generate Location/Bin label
   */
  generateLocationLabel(location: LocationLabel, copies: number = 1): string {
    const commands: string[] = [this.getSetupCommands()];
    
    const margin = this.mmToDots(3);
    const centerX = this.mmToDots(this.config.widthMm / 2);
    
    // Large location code - centered
    commands.push(`TEXT ${centerX},${margin},"5",0,1,1,1,"${location.locationCode}"`);
    
    // Zone/Aisle/Rack info
    const infoY = this.mmToDots(15);
    let infoLine = '';
    if (location.zone) infoLine += `Zone: ${location.zone}  `;
    if (location.aisle) infoLine += `Aisle: ${location.aisle}  `;
    if (location.rack) infoLine += `Rack: ${location.rack}  `;
    if (location.level) infoLine += `Level: ${location.level}`;
    
    if (infoLine) {
      commands.push(`TEXT ${margin},${infoY},"2",0,1,1,"${this.escapeText(infoLine.trim())}"`);
    }
    
    // Large barcode for scanning
    const barcodeY = this.mmToDots(22);
    commands.push(`BARCODE ${margin},${barcodeY},"128",80,1,0,2,6,"${location.barcode}"`);
    
    // Barcode text
    commands.push(`TEXT ${centerX},${barcodeY + this.mmToDots(22)},"3",0,1,1,1,"${location.barcode}"`);
    
    commands.push(`PRINT ${copies},1`);
    commands.push('');
    
    return commands.join('\n');
  }

  /**
   * Generate Shipping label
   */
  generateShippingLabel(shipping: ShippingLabel, copies: number = 1): string {
    // Use larger label for shipping
    const shippingConfig = { ...this.config, heightMm: 100 };
    const originalHeight = this.config.heightMm;
    this.config.heightMm = 100;
    
    const commands: string[] = [this.getSetupCommands()];
    
    const margin = this.mmToDots(5);
    const lineHeight = this.mmToDots(5);
    
    // Ship To header
    commands.push(`TEXT ${margin},${margin},"3",0,1,1,"SHIP TO:"`);
    
    // Address block
    let y = margin + lineHeight;
    commands.push(`TEXT ${margin},${y},"4",0,1,1,"${this.escapeText(shipping.shipTo.name)}"`);
    y += lineHeight * 1.5;
    commands.push(`TEXT ${margin},${y},"2",0,1,1,"${this.escapeText(shipping.shipTo.address1)}"`);
    y += lineHeight;
    if (shipping.shipTo.address2) {
      commands.push(`TEXT ${margin},${y},"2",0,1,1,"${this.escapeText(shipping.shipTo.address2)}"`);
      y += lineHeight;
    }
    commands.push(`TEXT ${margin},${y},"2",0,1,1,"${shipping.shipTo.city}, ${shipping.shipTo.state} ${shipping.shipTo.zip}"`);
    y += lineHeight;
    if (shipping.shipTo.country && shipping.shipTo.country !== 'US') {
      commands.push(`TEXT ${margin},${y},"2",0,1,1,"${shipping.shipTo.country}"`);
      y += lineHeight;
    }
    
    // Divider line
    y += lineHeight;
    commands.push(`BAR ${margin},${y},${this.mmToDots(this.config.widthMm - 10)},2`);
    
    // Order and shipment info
    y += lineHeight;
    commands.push(`TEXT ${margin},${y},"2",0,1,1,"Order: ${shipping.orderNumber}  Ship#: ${shipping.shipmentNumber}"`);
    y += lineHeight;
    commands.push(`TEXT ${margin},${y},"2",0,1,1,"Carrier: ${shipping.carrier}"`);
    
    // Weight and package count
    const rightX = this.mmToDots(60);
    if (shipping.weight) {
      commands.push(`TEXT ${rightX},${y - lineHeight},"2",0,1,1,"Weight: ${shipping.weight} lbs"`);
    }
    if (shipping.packageCount) {
      commands.push(`TEXT ${rightX},${y},"2",0,1,1,"Pkg: ${shipping.packageCount}"`);
    }
    
    // Tracking barcode (large)
    y += lineHeight * 2;
    commands.push(`BARCODE ${margin},${y},"128",100,1,0,3,6,"${shipping.trackingNumber}"`);
    
    // Tracking number text
    y += this.mmToDots(28);
    commands.push(`TEXT ${this.mmToDots(this.config.widthMm / 2)},${y},"3",0,1,1,1,"${shipping.trackingNumber}"`);
    
    commands.push(`PRINT ${copies},1`);
    commands.push('');
    
    // Restore original config
    this.config.heightMm = originalHeight;
    
    return commands.join('\n');
  }

  /**
   * Generate QR code label (for items with public links)
   */
  generateQRLabel(data: { content: string; title?: string; subtitle?: string }, copies: number = 1): string {
    const commands: string[] = [this.getSetupCommands()];
    
    const margin = this.mmToDots(5);
    const qrSize = this.mmToDots(35);  // ~35mm QR code
    
    // QR Code
    commands.push(`QRCODE ${margin},${margin},H,6,A,0,"${this.escapeText(data.content)}"`);
    
    // Title and subtitle on right
    const textX = margin + qrSize + this.mmToDots(5);
    if (data.title) {
      commands.push(`TEXT ${textX},${margin},"3",0,1,1,"${this.escapeText(data.title)}"`);
    }
    if (data.subtitle) {
      commands.push(`TEXT ${textX},${margin + this.mmToDots(8)},"2",0,1,1,"${this.escapeText(data.subtitle)}"`);
    }
    
    commands.push(`PRINT ${copies},1`);
    commands.push('');
    
    return commands.join('\n');
  }

  /**
   * Escape special characters for TSPL
   */
  private escapeText(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
  }
}

/**
 * ZPL (Zebra Programming Language) Label Generator
 * For Zebra printers (GK420, ZD420, ZT230, etc.)
 */
export class ZPLLabelGenerator {
  private config: PrinterConfig;

  constructor(config: PrinterConfig = PRINTER_PRESETS.ZEBRA_GK420) {
    this.config = config;
  }

  private mmToDots(mm: number): number {
    return Math.round((mm / 25.4) * this.config.dpi);
  }

  generateItemLabel(item: ItemLabel, copies: number = 1): string {
    const width = this.mmToDots(this.config.widthMm);
    const height = this.mmToDots(this.config.heightMm);
    
    return `
^XA
^PW${width}
^LL${height}
^FO20,20^A0N,30,30^FD${item.sku}^FS
^FO20,60^A0N,25,25^FD${item.name.substring(0, 30)}^FS
^FO20,120^BY2,2,60^BCN,60,Y,N,N^FD${item.barcode}^FS
${item.location ? `^FO${width - 150},20^A0N,20,20^FDLOC: ${item.location}^FS` : ''}
${item.lotNumber ? `^FO${width - 150},50^A0N,20,20^FDLOT: ${item.lotNumber}^FS` : ''}
^PQ${copies}
^XZ
`.trim();
  }

  generateLocationLabel(location: LocationLabel, copies: number = 1): string {
    const width = this.mmToDots(this.config.widthMm);
    const center = width / 2;
    
    return `
^XA
^PW${width}
^FO${center - 100},20^A0N,50,50^FD${location.locationCode}^FS
^FO20,100^BY3,2,80^BCN,80,Y,N,N^FD${location.barcode}^FS
^PQ${copies}
^XZ
`.trim();
  }

  generateShippingLabel(shipping: ShippingLabel, copies: number = 1): string {
    return `
^XA
^PW${this.mmToDots(this.config.widthMm)}
^LL${this.mmToDots(100)}
^FO20,20^A0N,25,25^FDSHIP TO:^FS
^FO20,50^A0N,35,35^FD${shipping.shipTo.name}^FS
^FO20,95^A0N,25,25^FD${shipping.shipTo.address1}^FS
^FO20,125^A0N,25,25^FD${shipping.shipTo.city}, ${shipping.shipTo.state} ${shipping.shipTo.zip}^FS
^FO20,180^GB750,2,2^FS
^FO20,200^A0N,20,20^FDOrder: ${shipping.orderNumber}  Carrier: ${shipping.carrier}^FS
^FO20,250^BY3,2,100^BCN,100,Y,N,N^FD${shipping.trackingNumber}^FS
^PQ${copies}
^XZ
`.trim();
  }
}

/**
 * Label Print Service
 * High-level API for generating labels in multiple formats
 */
export class LabelPrintService {
  private tsplGenerator: TSPLLabelGenerator;
  private zplGenerator: ZPLLabelGenerator;

  constructor(printerPreset: keyof typeof PRINTER_PRESETS = 'TSC_TDP244') {
    const config = PRINTER_PRESETS[printerPreset];
    this.tsplGenerator = new TSPLLabelGenerator(config);
    this.zplGenerator = new ZPLLabelGenerator(config);
  }

  /**
   * Generate item label commands for specified printer type
   */
  generateItemLabel(item: ItemLabel, printerType: 'tspl' | 'zpl' = 'tspl', copies: number = 1): string {
    if (printerType === 'zpl') {
      return this.zplGenerator.generateItemLabel(item, copies);
    }
    return this.tsplGenerator.generateItemLabel(item, copies);
  }

  /**
   * Generate location label commands
   */
  generateLocationLabel(location: LocationLabel, printerType: 'tspl' | 'zpl' = 'tspl', copies: number = 1): string {
    if (printerType === 'zpl') {
      return this.zplGenerator.generateLocationLabel(location, copies);
    }
    return this.tsplGenerator.generateLocationLabel(location, copies);
  }

  /**
   * Generate shipping label commands
   */
  generateShippingLabel(shipping: ShippingLabel, printerType: 'tspl' | 'zpl' = 'tspl', copies: number = 1): string {
    if (printerType === 'zpl') {
      return this.zplGenerator.generateShippingLabel(shipping, copies);
    }
    return this.tsplGenerator.generateShippingLabel(shipping, copies);
  }

  /**
   * Generate QR code label (TSPL only)
   */
  generateQRLabel(data: { content: string; title?: string; subtitle?: string }, copies: number = 1): string {
    return this.tsplGenerator.generateQRLabel(data, copies);
  }

  /**
   * Batch generate labels for multiple items
   */
  generateBatchItemLabels(items: ItemLabel[], printerType: 'tspl' | 'zpl' = 'tspl'): string {
    return items.map(item => this.generateItemLabel(item, printerType, 1)).join('\n');
  }
}

// Export a default instance for TSC TDP-244
export const labelService = new LabelPrintService('TSC_TDP244');

/**
 * Helper: Send commands to printer via network (for server-side printing)
 * This requires the printer to be configured with a network interface
 */
export async function sendToPrinter(
  commands: string,
  printerAddress: string,
  port: number = 9100
): Promise<boolean> {
  // Note: This requires a TCP connection - implement based on your server environment
  // Example with Node.js net module:
  // const net = require('net');
  // const client = new net.Socket();
  // client.connect(port, printerAddress, () => {
  //   client.write(commands);
  //   client.end();
  // });
  
  console.log(`Would send ${commands.length} bytes to ${printerAddress}:${port}`);
  return true;
}

/**
 * Client-side WebUSB printing support
 * Returns instructions for browser-based printing
 */
export function getWebUSBInstructions(): string {
  return `
To print labels from the browser using WebUSB:

1. Add this to your client code:

async function printLabel(commands) {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x1203 }, // TSC
        { vendorId: 0x0A5F }, // Zebra
      ]
    });
    
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(commands);
    
    await device.transferOut(1, data);
    await device.close();
    
    return true;
  } catch (error) {
    console.error('Print failed:', error);
    return false;
  }
}

2. Call with generated commands:
   const commands = generateItemLabel({ ... });
   await printLabel(commands);

Note: WebUSB requires HTTPS and user interaction to request device access.
`;
}
