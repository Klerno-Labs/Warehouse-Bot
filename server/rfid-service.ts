/**
 * RFID Support System
 *
 * Bulk scanning, asset tracking, and RFID tag management
 * for enterprise warehouse operations
 */

import { prisma } from "./prisma";
import { Uom } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export type RFIDTagType = "EPC" | "TID" | "USER_MEMORY";
export type TagStatus = "ACTIVE" | "INACTIVE" | "LOST" | "DAMAGED" | "RETURNED";

export interface RFIDTag {
  id: string;
  epc: string; // Electronic Product Code
  tid?: string; // Tag ID (unique to each physical tag)
  itemId?: string;
  serialNumberId?: string;
  lotId?: string;
  locationId?: string;
  assetId?: string;
  status: TagStatus;
  lastSeenAt?: Date;
  lastLocationId?: string;
  signalStrength?: number;
  metadata?: Record<string, any>;
}

export interface BulkScanResult {
  timestamp: Date;
  readerId: string;
  readerLocation: string;
  tagsRead: number;
  tags: {
    epc: string;
    rssi: number; // Signal strength
    antennaPort: number;
    readCount: number;
    item?: {
      id: string;
      sku: string;
      name: string;
    };
    location?: {
      id: string;
      label: string;
    };
  }[];
  newTags: number;
  knownTags: number;
  processingTime: number; // ms
}

export interface RFIDReader {
  id: string;
  name: string;
  type: string; // FIXED, HANDHELD, PORTAL
  locationId?: string;
  ipAddress?: string;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat?: Date;
  antennas: number;
  configuration: {
    readPower: number;
    readMode: "CONTINUOUS" | "TRIGGERED";
    tagFilter?: string;
    antennaConfig: {
      port: number;
      enabled: boolean;
      power: number;
    }[];
  };
}

export interface InventoryCountSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  readerId: string;
  locationId?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  totalReads: number;
  uniqueTags: number;
  expectedTags?: number;
  accuracy?: number;
  results?: {
    found: string[];
    missing: string[];
    unexpected: string[];
  };
}

export interface AssetTrackingEvent {
  timestamp: Date;
  tagEpc: string;
  assetId: string;
  readerId: string;
  locationId: string;
  eventType: "ENTER" | "EXIT" | "MOVE" | "DWELL";
  dwellTime?: number; // seconds
}

// ============================================================
// RFID SERVICE
// ============================================================

export class RFIDService {
  private static readers: Map<string, RFIDReader> = new Map();
  private static tagCache: Map<string, RFIDTag> = new Map();

  /**
   * Register a new RFID reader
   */
  static registerReader(reader: RFIDReader): void {
    this.readers.set(reader.id, reader);
    console.log(`RFID Reader registered: ${reader.name} (${reader.id})`);
  }

  /**
   * Process bulk tag reads from a reader
   */
  static async processBulkScan(params: {
    tenantId: string;
    readerId: string;
    reads: {
      epc: string;
      rssi: number;
      antennaPort: number;
      timestamp?: Date;
    }[];
  }): Promise<BulkScanResult> {
    const startTime = Date.now();
    const { tenantId, readerId, reads } = params;

    const reader = this.readers.get(readerId);
    if (!reader) {
      throw new Error(`Reader not found: ${readerId}`);
    }

    // Deduplicate reads by EPC
    const uniqueReads = new Map<string, { rssi: number; count: number; antennaPort: number }>();
    for (const read of reads) {
      const existing = uniqueReads.get(read.epc);
      if (existing) {
        existing.count++;
        existing.rssi = Math.max(existing.rssi, read.rssi);
      } else {
        uniqueReads.set(read.epc, {
          rssi: read.rssi,
          count: 1,
          antennaPort: read.antennaPort,
        });
      }
    }

    const processedTags: BulkScanResult["tags"] = [];
    let newTags = 0;
    let knownTags = 0;

    for (const [epc, readData] of uniqueReads) {
      // Look up tag in database
      const tagInfo = await this.getTagInfo(tenantId, epc);

      if (tagInfo) {
        knownTags++;
        processedTags.push({
          epc,
          rssi: readData.rssi,
          antennaPort: readData.antennaPort,
          readCount: readData.count,
          item: tagInfo.item,
          location: tagInfo.location,
        });

        // Update last seen
        await this.updateTagLastSeen(epc, readerId, reader.locationId);
      } else {
        newTags++;
        processedTags.push({
          epc,
          rssi: readData.rssi,
          antennaPort: readData.antennaPort,
          readCount: readData.count,
        });
      }
    }

    return {
      timestamp: new Date(),
      readerId,
      readerLocation: reader.locationId || "Unknown",
      tagsRead: reads.length,
      tags: processedTags,
      newTags,
      knownTags,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Get tag information from database
   */
  private static async getTagInfo(
    tenantId: string,
    epc: string
  ): Promise<{
    tag: any;
    item?: { id: string; sku: string; name: string };
    location?: { id: string; label: string };
  } | null> {
    // Check cache first
    const cached = this.tagCache.get(epc);
    if (cached) {
      // Return cached info with item lookup
      if (cached.itemId) {
        const item = await prisma.item.findUnique({
          where: { id: cached.itemId },
          select: { id: true, sku: true, name: true },
        });
        return { tag: cached, item: item || undefined };
      }
      return { tag: cached };
    }

    // Not in cache - would query RFID tag table if we had one
    // For now, try to parse EPC as item barcode
    const item = await prisma.item.findFirst({
      where: {
        tenantId,
        OR: [
          { barcode: epc },
          { alternateBarcode: epc },
        ],
      },
      select: { id: true, sku: true, name: true },
    });

    if (item) {
      const tag: RFIDTag = {
        id: `TAG-${epc}`,
        epc,
        itemId: item.id,
        status: "ACTIVE",
      };
      this.tagCache.set(epc, tag);
      return { tag, item };
    }

    return null;
  }

  /**
   * Update tag last seen timestamp
   */
  private static async updateTagLastSeen(
    epc: string,
    readerId: string,
    locationId?: string
  ): Promise<void> {
    const cached = this.tagCache.get(epc);
    if (cached) {
      cached.lastSeenAt = new Date();
      cached.lastLocationId = locationId;
    }
  }

  /**
   * Associate RFID tag with item
   */
  static async associateTag(params: {
    tenantId: string;
    epc: string;
    itemId?: string;
    serialNumberId?: string;
    lotId?: string;
    assetId?: string;
  }): Promise<RFIDTag> {
    const { tenantId, epc, itemId, serialNumberId, lotId, assetId } = params;

    const tag: RFIDTag = {
      id: `TAG-${epc}`,
      epc,
      itemId,
      serialNumberId,
      lotId,
      assetId,
      status: "ACTIVE",
    };

    this.tagCache.set(epc, tag);

    // If serial number, update the serial number record
    if (serialNumberId) {
      await prisma.serialNumber.update({
        where: { id: serialNumberId },
        data: {
          notes: `RFID: ${epc}`,
        },
      });
    }

    return tag;
  }

  /**
   * Start RFID inventory count session
   */
  static async startInventoryCount(params: {
    tenantId: string;
    siteId: string;
    readerId: string;
    locationId?: string;
    expectedTags?: string[]; // EPCs expected to be found
  }): Promise<InventoryCountSession> {
    const session: InventoryCountSession = {
      id: `COUNT-${Date.now()}`,
      startTime: new Date(),
      readerId: params.readerId,
      locationId: params.locationId,
      status: "IN_PROGRESS",
      totalReads: 0,
      uniqueTags: 0,
      expectedTags: params.expectedTags?.length,
    };

    return session;
  }

  /**
   * Complete RFID inventory count
   */
  static async completeInventoryCount(params: {
    sessionId: string;
    scannedTags: string[];
    expectedTags: string[];
  }): Promise<InventoryCountSession> {
    const { sessionId, scannedTags, expectedTags } = params;

    const scannedSet = new Set(scannedTags);
    const expectedSet = new Set(expectedTags);

    const found = scannedTags.filter((t) => expectedSet.has(t));
    const missing = expectedTags.filter((t) => !scannedSet.has(t));
    const unexpected = scannedTags.filter((t) => !expectedSet.has(t));

    const accuracy = expectedTags.length > 0
      ? (found.length / expectedTags.length) * 100
      : 100;

    return {
      id: sessionId,
      startTime: new Date(),
      endTime: new Date(),
      readerId: "",
      status: "COMPLETED",
      totalReads: scannedTags.length,
      uniqueTags: scannedSet.size,
      expectedTags: expectedTags.length,
      accuracy: Math.round(accuracy * 100) / 100,
      results: {
        found,
        missing,
        unexpected,
      },
    };
  }

  /**
   * Generate RFID receiving workflow
   */
  static async processReceiving(params: {
    tenantId: string;
    siteId: string;
    purchaseOrderId: string;
    scannedTags: string[];
    readerId: string;
  }): Promise<{
    matched: { epc: string; itemId: string; qty: number }[];
    unmatched: string[];
    shortages: { itemId: string; expected: number; received: number }[];
  }> {
    const { tenantId, purchaseOrderId, scannedTags } = params;

    // Get PO lines
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        lines: {
          include: { item: true },
        },
      },
    });

    if (!po) throw new Error("Purchase order not found");

    const matched: { epc: string; itemId: string; qty: number }[] = [];
    const unmatched: string[] = [];
    const receivedByItem = new Map<string, number>();

    for (const epc of scannedTags) {
      const tagInfo = await this.getTagInfo(tenantId, epc);

      if (tagInfo?.item) {
        matched.push({
          epc,
          itemId: tagInfo.item.id,
          qty: 1,
        });

        const current = receivedByItem.get(tagInfo.item.id) || 0;
        receivedByItem.set(tagInfo.item.id, current + 1);
      } else {
        unmatched.push(epc);
      }
    }

    // Calculate shortages
    const shortages: { itemId: string; expected: number; received: number }[] = [];
    for (const line of po.lines) {
      const received = receivedByItem.get(line.itemId) || 0;
      if (received < line.qtyOrdered) {
        shortages.push({
          itemId: line.itemId,
          expected: line.qtyOrdered,
          received,
        });
      }
    }

    return { matched, unmatched, shortages };
  }

  /**
   * Generate shipping verification
   */
  static async verifyShipment(params: {
    tenantId: string;
    shipmentId: string;
    scannedTags: string[];
    readerId: string;
  }): Promise<{
    verified: boolean;
    correct: string[];
    missing: string[];
    extra: string[];
  }> {
    const { tenantId, shipmentId, scannedTags } = params;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        lines: {
          include: { item: true },
        },
      },
    });

    if (!shipment) throw new Error("Shipment not found");

    // Build expected EPCs from shipment lines
    const expectedItems = new Map<string, number>();
    for (const line of shipment.lines) {
      expectedItems.set(line.itemId, line.qtyShipped);
    }

    const scannedByItem = new Map<string, string[]>();
    const unknownTags: string[] = [];

    for (const epc of scannedTags) {
      const tagInfo = await this.getTagInfo(tenantId, epc);
      if (tagInfo?.item) {
        if (!scannedByItem.has(tagInfo.item.id)) {
          scannedByItem.set(tagInfo.item.id, []);
        }
        scannedByItem.get(tagInfo.item.id)!.push(epc);
      } else {
        unknownTags.push(epc);
      }
    }

    const correct: string[] = [];
    const missing: string[] = [];
    const extra: string[] = [...unknownTags];

    for (const [itemId, expectedQty] of expectedItems) {
      const scannedEpcs = scannedByItem.get(itemId) || [];
      const scannedQty = scannedEpcs.length;

      if (scannedQty >= expectedQty) {
        correct.push(...scannedEpcs.slice(0, expectedQty));
        extra.push(...scannedEpcs.slice(expectedQty));
      } else {
        correct.push(...scannedEpcs);
        // Missing items - we don't have EPCs for them
        for (let i = 0; i < expectedQty - scannedQty; i++) {
          missing.push(`MISSING-${itemId}-${i}`);
        }
      }
    }

    // Check for items not in shipment
    for (const [itemId, epcs] of scannedByItem) {
      if (!expectedItems.has(itemId)) {
        extra.push(...epcs);
      }
    }

    return {
      verified: missing.length === 0 && extra.length === 0,
      correct,
      missing,
      extra,
    };
  }

  /**
   * Track asset movement
   */
  static async trackAssetMovement(params: {
    tenantId: string;
    epc: string;
    readerId: string;
    locationId: string;
    eventType: AssetTrackingEvent["eventType"];
  }): Promise<AssetTrackingEvent> {
    const tag = this.tagCache.get(params.epc);

    const event: AssetTrackingEvent = {
      timestamp: new Date(),
      tagEpc: params.epc,
      assetId: tag?.assetId || params.epc,
      readerId: params.readerId,
      locationId: params.locationId,
      eventType: params.eventType,
    };

    // Update tag location
    if (tag) {
      tag.lastSeenAt = new Date();
      tag.lastLocationId = params.locationId;
    }

    return event;
  }

  /**
   * Generate EPC for item
   */
  static generateEPC(params: {
    companyPrefix: string;
    itemReference: string;
    serialNumber?: string;
  }): string {
    const { companyPrefix, itemReference, serialNumber } = params;

    // Generate SGTIN-96 format EPC
    const header = "30"; // SGTIN-96 header
    const partition = "3"; // Partition value

    // Pad values
    const paddedPrefix = companyPrefix.padStart(7, "0");
    const paddedItem = itemReference.padStart(5, "0");
    const paddedSerial = (serialNumber || Date.now().toString()).padStart(12, "0");

    return `${header}${partition}${paddedPrefix}${paddedItem}${paddedSerial}`;
  }

  /**
   * Get reader status
   */
  static getReaderStatus(): RFIDReader[] {
    return Array.from(this.readers.values());
  }

  /**
   * Configure reader
   */
  static async configureReader(
    readerId: string,
    config: Partial<RFIDReader["configuration"]>
  ): Promise<RFIDReader> {
    const reader = this.readers.get(readerId);
    if (!reader) throw new Error("Reader not found");

    reader.configuration = {
      ...reader.configuration,
      ...config,
    };

    return reader;
  }

  /**
   * Get tag location history
   */
  static async getTagLocationHistory(epc: string, days: number = 30): Promise<any[]> {
    // In production, would query location history table
    const tag = this.tagCache.get(epc);

    return [
      {
        timestamp: new Date(),
        locationId: tag?.lastLocationId,
        readerId: "READER-01",
      },
    ];
  }

  /**
   * Find items by zone using RFID
   */
  static async findItemsInZone(params: {
    tenantId: string;
    zone: string;
    readerId: string;
  }): Promise<{
    zone: string;
    items: { itemId: string; sku: string; name: string; epcs: string[] }[];
    totalTags: number;
  }> {
    // Simulate zone scan
    const items: { itemId: string; sku: string; name: string; epcs: string[] }[] = [];
    let totalTags = 0;

    // Get all cached tags for zone
    for (const [epc, tag] of this.tagCache) {
      if (tag.itemId && tag.lastLocationId === params.zone) {
        const item = await prisma.item.findUnique({
          where: { id: tag.itemId },
        });

        if (item) {
          const existing = items.find((i) => i.itemId === item.id);
          if (existing) {
            existing.epcs.push(epc);
          } else {
            items.push({
              itemId: item.id,
              sku: item.sku,
              name: item.name,
              epcs: [epc],
            });
          }
          totalTags++;
        }
      }
    }

    return {
      zone: params.zone,
      items,
      totalTags,
    };
  }
}
