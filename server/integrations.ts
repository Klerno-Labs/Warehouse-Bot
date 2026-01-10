/**
 * Third-Party Integration Manager
 *
 * Provides connectors for popular business systems
 * Supports webhooks, REST APIs, and file-based integrations
 */

import { logger } from "./logger";
import * as crypto from "crypto";

export type IntegrationType =
  | "QUICKBOOKS"
  | "XERO"
  | "NETSUITE"
  | "SHOPIFY"
  | "WOOCOMMERCE"
  | "SALESFORCE"
  | "STRIPE"
  | "SHIPSTATION"
  | "FEDEX"
  | "UPS"
  | "USPS"
  | "CUSTOM_WEBHOOK";

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  enabled: boolean;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookUrl?: string;
    [key: string]: any;
  };
  settings: {
    syncInterval?: number; // Minutes
    autoSync?: boolean;
    syncDirection?: "PUSH" | "PULL" | "BIDIRECTIONAL";
    fieldMapping?: Record<string, string>;
  };
  lastSyncAt?: Date;
  tenantId: string;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export class IntegrationManager {
  /**
   * Sync inventory to QuickBooks
   */
  static async syncToQuickBooks(
    tenantId: string,
    config: IntegrationConfig
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Get items from database
      const items = await this.getItemsForSync(tenantId);

      // Transform to QuickBooks format
      const qbItems = items.map((item) => ({
        Name: item.name,
        Sku: item.sku,
        Type: "Inventory",
        QtyOnHand: item.qtyOnHand,
        InvStartDate: new Date().toISOString(),
        UnitPrice: item.costBase,
        TrackQtyOnHand: true,
      }));

      // Send to QuickBooks API
      for (const qbItem of qbItems) {
        try {
          await this.callQuickBooksAPI(config, "POST", "/v3/company/items", qbItem);
          result.recordsSynced++;
        } catch (error: any) {
          result.errors.push(`Failed to sync ${qbItem.Sku}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Sync orders from Shopify
   */
  static async syncFromShopify(
    tenantId: string,
    config: IntegrationConfig
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Fetch orders from Shopify
      const orders = await this.callShopifyAPI(config, "GET", "/admin/api/2024-01/orders.json");

      // Transform and import orders
      for (const order of orders.orders || []) {
        try {
          await this.importShopifyOrder(tenantId, order);
          result.recordsSynced++;
        } catch (error: any) {
          result.errors.push(`Failed to import order ${order.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Send shipment to ShipStation
   */
  static async sendToShipStation(
    tenantId: string,
    config: IntegrationConfig,
    orderId: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Get order details
      const order = await this.getOrderForShipping(tenantId, orderId);

      // Transform to ShipStation format
      const shipment = {
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderStatus: "awaiting_shipment",
        customerEmail: order.customerEmail,
        billTo: order.billingAddress,
        shipTo: order.shippingAddress,
        items: order.items.map((item: any) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        weight: {
          value: order.weight,
          units: "ounces",
        },
      };

      // Send to ShipStation
      await this.callShipStationAPI(config, "POST", "/orders/createorder", shipment);
      result.recordsSynced = 1;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Create shipping label via carrier API
   */
  static async createCarrierLabel(
    tenantId: string,
    carrier: "FEDEX" | "UPS" | "USPS",
    shipment: any
  ): Promise<{ trackingNumber: string; labelUrl: string }> {
    switch (carrier) {
      case "FEDEX":
        return this.createFedExLabel(shipment);
      case "UPS":
        return this.createUPSLabel(shipment);
      case "USPS":
        return this.createUSPSLabel(shipment);
      default:
        throw new Error(`Unsupported carrier: ${carrier}`);
    }
  }

  /**
   * Send webhook notification
   */
  static async sendWebhook(
    config: IntegrationConfig,
    event: string,
    payload: any
  ): Promise<boolean> {
    try {
      const response = await fetch(config.credentials.webhookUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-API-Key": config.credentials.apiKey || "",
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error("Webhook failed", error as Error);
      return false;
    }
  }

  /**
   * Import data from CSV
   */
  static async importFromCSV(
    tenantId: string,
    csvData: string,
    entityType: "items" | "locations" | "suppliers"
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Parse CSV
      const lines = csvData.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const records = lines.slice(1).map((line) => {
        const values = line.split(",");
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index]?.trim();
        });
        return record;
      });

      // Import records
      for (const record of records) {
        try {
          await this.importRecord(tenantId, entityType, record);
          result.recordsSynced++;
        } catch (error: any) {
          result.errors.push(`Line ${result.recordsSynced + 2}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Export data to CSV
   */
  static async exportToCSV(
    tenantId: string,
    entityType: "items" | "locations" | "transactions",
    filters?: any
  ): Promise<string> {
    const data = await this.getDataForExport(tenantId, entityType, filters);

    if (data.length === 0) {
      throw new Error("No data to export");
    }

    // Generate CSV
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h] || "").join(",")),
    ].join("\n");

    return csv;
  }

  /**
   * Sync to external REST API
   */
  static async syncToExternalAPI(
    config: IntegrationConfig,
    endpoint: string,
    data: any
  ): Promise<boolean> {
    try {
      const response = await fetch(`${config.credentials.apiKey}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.credentials.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      logger.error("External API sync failed", error as Error);
      return false;
    }
  }

  // Private helper methods

  private static async getItemsForSync(tenantId: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }

  private static async getOrderForShipping(tenantId: string, orderId: string): Promise<any> {
    // In production, fetch from database
    return {};
  }

  private static async getDataForExport(
    tenantId: string,
    entityType: string,
    filters?: any
  ): Promise<any[]> {
    // In production, fetch from database
    return [];
  }

  private static async importRecord(
    tenantId: string,
    entityType: string,
    record: any
  ): Promise<void> {
    // In production, insert into database
  }

  private static async importShopifyOrder(tenantId: string, order: any): Promise<void> {
    // In production, create order in database
  }

  private static async callQuickBooksAPI(
    config: IntegrationConfig,
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    // In production, call QuickBooks API
    return {};
  }

  private static async callShopifyAPI(
    config: IntegrationConfig,
    method: string,
    endpoint: string
  ): Promise<any> {
    // In production, call Shopify API
    return {};
  }

  private static async callShipStationAPI(
    config: IntegrationConfig,
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    // In production, call ShipStation API
    return {};
  }

  private static async createFedExLabel(shipment: any): Promise<{
    trackingNumber: string;
    labelUrl: string;
  }> {
    // In production, call FedEx API
    return {
      trackingNumber: `1Z999AA10123456784`,
      labelUrl: "https://example.com/label.pdf",
    };
  }

  private static async createUPSLabel(shipment: any): Promise<{
    trackingNumber: string;
    labelUrl: string;
  }> {
    // In production, call UPS API
    return {
      trackingNumber: `1Z999AA10123456784`,
      labelUrl: "https://example.com/label.pdf",
    };
  }

  private static async createUSPSLabel(shipment: any): Promise<{
    trackingNumber: string;
    labelUrl: string;
  }> {
    // In production, call USPS API
    return {
      trackingNumber: `9400111699000367891234`,
      labelUrl: "https://example.com/label.pdf",
    };
  }
}

/**
 * Webhook event handlers
 */
export class WebhookHandler {
  /**
   * Handle incoming webhook from external system
   */
  static async handleWebhook(
    type: IntegrationType,
    event: string,
    payload: any,
    signature?: string
  ): Promise<{ success: boolean; message?: string }> {
    // Verify signature
    if (signature && !this.verifySignature(type, payload, signature)) {
      return { success: false, message: "Invalid signature" };
    }

    try {
      switch (type) {
        case "SHOPIFY":
          return await this.handleShopifyWebhook(event, payload);
        case "STRIPE":
          return await this.handleStripeWebhook(event, payload);
        case "SHIPSTATION":
          return await this.handleShipStationWebhook(event, payload);
        default:
          return await this.handleCustomWebhook(event, payload);
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private static verifySignature(
    type: IntegrationType,
    payload: unknown,
    signature: string
  ): boolean {
    const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);

    // Get the appropriate secret based on integration type
    let secret: string | undefined;
    switch (type) {
      case "SHOPIFY":
        secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        break;
      case "STRIPE":
        secret = process.env.STRIPE_WEBHOOK_SECRET;
        break;
      case "SHIPSTATION":
        secret = process.env.SHIPSTATION_WEBHOOK_SECRET;
        break;
      default:
        secret = process.env.WEBHOOK_SECRET;
    }

    if (!secret) {
      logger.warn("Webhook secret not configured", { type });
      return false;
    }

    // Calculate HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      // Buffers have different lengths
      return false;
    }
  }

  private static async handleShopifyWebhook(
    event: string,
    payload: any
  ): Promise<{ success: boolean }> {
    logger.info("Shopify webhook received", { event, payload });
    // Handle Shopify events (orders/create, products/update, etc.)
    return { success: true };
  }

  private static async handleStripeWebhook(
    event: string,
    payload: any
  ): Promise<{ success: boolean }> {
    logger.info("Stripe webhook received", { event, payload });
    // Handle Stripe events (payment_intent.succeeded, etc.)
    return { success: true };
  }

  private static async handleShipStationWebhook(
    event: string,
    payload: any
  ): Promise<{ success: boolean }> {
    logger.info("ShipStation webhook received", { event, payload });
    // Handle ShipStation events (shipment tracking updates, etc.)
    return { success: true };
  }

  private static async handleCustomWebhook(
    event: string,
    payload: any
  ): Promise<{ success: boolean }> {
    logger.info("Custom webhook received", { event, payload });
    // Handle custom webhook events
    return { success: true };
  }
}
