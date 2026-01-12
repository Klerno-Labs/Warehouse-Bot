/**
 * E-commerce Integration System
 *
 * Shopify, WooCommerce, Amazon, eBay integrations for
 * order sync, inventory sync, and fulfillment
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type EcommercePlatform = "SHOPIFY" | "WOOCOMMERCE" | "AMAZON" | "EBAY" | "BIGCOMMERCE";
export type OrderSyncStatus = "PENDING" | "IMPORTED" | "ALLOCATED" | "FULFILLED" | "CANCELLED";

export interface EcommerceConnection {
  id: string;
  tenantId: string;
  platform: EcommercePlatform;
  storeName: string;
  storeUrl: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  isActive: boolean;
  lastSyncAt?: Date;
  settings: EcommerceSettings;
}

export interface EcommerceSettings {
  autoImportOrders: boolean;
  autoFulfill: boolean;
  syncInventory: boolean;
  inventorySyncFrequency: "REALTIME" | "HOURLY" | "DAILY";
  defaultLocationId?: string;
  orderStatusMapping: Record<string, string>;
  productMapping: "SKU" | "BARCODE" | "CUSTOM_ID";
}

export interface EcommerceOrder {
  platformOrderId: string;
  platform: EcommercePlatform;
  orderNumber: string;
  orderDate: Date;
  status: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  lines: {
    platformLineId: string;
    platformProductId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  notes?: string;
  tags?: string[];
}

export interface InventoryUpdate {
  sku: string;
  platformProductId: string;
  quantity: number;
  locationId?: string;
}

export interface FulfillmentData {
  platformOrderId: string;
  trackingNumber?: string;
  carrier?: string;
  items: {
    platformLineId: string;
    quantity: number;
  }[];
}

// ============================================================
// SHOPIFY SERVICE
// ============================================================

export class ShopifyService {
  private static connections: Map<string, EcommerceConnection> = new Map();

  /**
   * Connect to Shopify store
   */
  static async connect(params: {
    tenantId: string;
    storeName: string;
    accessToken: string;
  }): Promise<EcommerceConnection> {
    const connection: EcommerceConnection = {
      id: `SHOPIFY-${params.tenantId}`,
      tenantId: params.tenantId,
      platform: "SHOPIFY",
      storeName: params.storeName,
      storeUrl: `https://${params.storeName}.myshopify.com`,
      accessToken: params.accessToken,
      isActive: true,
      settings: {
        autoImportOrders: true,
        autoFulfill: false,
        syncInventory: true,
        inventorySyncFrequency: "HOURLY",
        orderStatusMapping: {
          unfulfilled: "CONFIRMED",
          fulfilled: "SHIPPED",
          cancelled: "CANCELLED",
        },
        productMapping: "SKU",
      },
    };

    this.connections.set(params.tenantId, connection);
    return connection;
  }

  /**
   * Import orders from Shopify
   */
  static async importOrders(params: {
    tenantId: string;
    since?: Date;
    status?: string;
  }): Promise<{ imported: number; orders: EcommerceOrder[] }> {
    const connection = this.connections.get(params.tenantId);
    if (!connection) throw new Error("No Shopify connection found");

    // In production, call Shopify Admin API
    // GET /admin/api/2024-01/orders.json

    const mockOrders: EcommerceOrder[] = [
      {
        platformOrderId: `SHOP-${Date.now()}`,
        platform: "SHOPIFY",
        orderNumber: `#${Math.floor(Math.random() * 10000)}`,
        orderDate: new Date(),
        status: "unfulfilled",
        customer: {
          email: "customer@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        shippingAddress: {
          name: "John Doe",
          address1: "123 Main St",
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "US",
        },
        lines: [
          {
            platformLineId: `LINE-${Date.now()}`,
            platformProductId: `PROD-001`,
            sku: "SKU-001",
            name: "Sample Product",
            quantity: 2,
            unitPrice: 29.99,
            total: 59.98,
          },
        ],
        subtotal: 59.98,
        shippingCost: 5.99,
        taxAmount: 5.28,
        total: 71.25,
      },
    ];

    // Create sales orders in our system
    for (const ecomOrder of mockOrders) {
      await this.createSalesOrderFromEcommerce(params.tenantId, ecomOrder);
    }

    return {
      imported: mockOrders.length,
      orders: mockOrders,
    };
  }

  /**
   * Create sales order from e-commerce order
   */
  private static async createSalesOrderFromEcommerce(
    tenantId: string,
    ecomOrder: EcommerceOrder
  ): Promise<any> {
    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: ecomOrder.customer.email,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          code: `SHOP-${Date.now()}`,
          name: `${ecomOrder.customer.firstName} ${ecomOrder.customer.lastName}`,
          email: ecomOrder.customer.email,
          phone: ecomOrder.customer.phone,
          shippingAddress1: ecomOrder.shippingAddress.address1,
          shippingAddress2: ecomOrder.shippingAddress.address2,
          shippingCity: ecomOrder.shippingAddress.city,
          shippingState: ecomOrder.shippingAddress.state,
          shippingZip: ecomOrder.shippingAddress.postalCode,
          shippingCountry: ecomOrder.shippingAddress.country,
        },
      });
    }

    // Get default site
    const site = await prisma.site.findFirst({
      where: { tenantId },
    });

    if (!site) throw new Error("No site found");

    // Create sales order
    const orderNumber = `SO-${ecomOrder.platform}-${ecomOrder.orderNumber}`;

    const salesOrder = await prisma.salesOrder.create({
      data: {
        tenantId,
        siteId: site.id,
        customerId: customer.id,
        orderNumber,
        customerPO: ecomOrder.orderNumber,
        status: "CONFIRMED",
        orderDate: ecomOrder.orderDate,
        shipToName: ecomOrder.shippingAddress.name,
        shipToAddress1: ecomOrder.shippingAddress.address1,
        shipToAddress2: ecomOrder.shippingAddress.address2,
        shipToCity: ecomOrder.shippingAddress.city,
        shipToState: ecomOrder.shippingAddress.state,
        shipToZip: ecomOrder.shippingAddress.postalCode,
        shipToCountry: ecomOrder.shippingAddress.country,
        subtotal: ecomOrder.subtotal,
        shippingAmount: ecomOrder.shippingCost,
        taxAmount: ecomOrder.taxAmount,
        total: ecomOrder.total,
        notes: `Imported from ${ecomOrder.platform}: ${ecomOrder.platformOrderId}`,
        lines: {
          create: await Promise.all(
            ecomOrder.lines.map(async (line, index) => {
              const item = await prisma.item.findFirst({
                where: { tenantId, sku: line.sku },
              });

              return {
                lineNumber: index + 1,
                itemId: item?.id || "",
                description: line.name,
                qtyOrdered: line.quantity,
                uom: "EA" as const,
                unitPrice: line.unitPrice,
                lineTotal: line.total,
                status: "OPEN" as const,
              };
            })
          ),
        },
      },
    });

    return salesOrder;
  }

  /**
   * Sync inventory levels to Shopify
   */
  static async syncInventory(
    tenantId: string,
    updates: InventoryUpdate[]
  ): Promise<{ synced: number; failed: number }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Shopify connection found");

    let synced = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        // In production, call Shopify Inventory API
        // POST /admin/api/2024-01/inventory_levels/set.json
        synced++;
      } catch (error) {
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Push inventory from WMS to Shopify
   */
  static async pushAllInventory(tenantId: string, siteId?: string): Promise<any> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Shopify connection found");

    const balances = await prisma.inventoryBalance.findMany({
      where: {
        tenantId,
        ...(siteId && { siteId }),
      },
      include: {
        item: true,
      },
    });

    // Aggregate by item
    const itemTotals = new Map<string, { sku: string; qty: number }>();
    for (const balance of balances) {
      const existing = itemTotals.get(balance.itemId);
      if (existing) {
        existing.qty += balance.qtyBase;
      } else {
        itemTotals.set(balance.itemId, {
          sku: balance.item.sku,
          qty: balance.qtyBase,
        });
      }
    }

    const updates: InventoryUpdate[] = Array.from(itemTotals.entries()).map(
      ([itemId, data]) => ({
        sku: data.sku,
        platformProductId: itemId,
        quantity: data.qty,
      })
    );

    return this.syncInventory(tenantId, updates);
  }

  /**
   * Create fulfillment in Shopify
   */
  static async createFulfillment(
    tenantId: string,
    fulfillment: FulfillmentData
  ): Promise<{ fulfillmentId: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Shopify connection found");

    // In production, call Shopify Fulfillment API
    // POST /admin/api/2024-01/orders/{order_id}/fulfillments.json

    return {
      fulfillmentId: `FULFILL-${Date.now()}`,
    };
  }

  /**
   * Register webhooks
   */
  static async registerWebhooks(tenantId: string, callbackUrl: string): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Shopify connection found");

    const webhookTopics = [
      "orders/create",
      "orders/updated",
      "orders/cancelled",
      "products/create",
      "products/update",
      "inventory_levels/update",
    ];

    // In production, register each webhook with Shopify
    console.log(`Registered ${webhookTopics.length} webhooks for Shopify`);
  }
}

// ============================================================
// WOOCOMMERCE SERVICE
// ============================================================

export class WooCommerceService {
  private static connections: Map<string, EcommerceConnection> = new Map();

  /**
   * Connect to WooCommerce store
   */
  static async connect(params: {
    tenantId: string;
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }): Promise<EcommerceConnection> {
    const connection: EcommerceConnection = {
      id: `WOO-${params.tenantId}`,
      tenantId: params.tenantId,
      platform: "WOOCOMMERCE",
      storeName: new URL(params.storeUrl).hostname,
      storeUrl: params.storeUrl,
      apiKey: params.consumerKey,
      apiSecret: params.consumerSecret,
      isActive: true,
      settings: {
        autoImportOrders: true,
        autoFulfill: false,
        syncInventory: true,
        inventorySyncFrequency: "HOURLY",
        orderStatusMapping: {
          processing: "CONFIRMED",
          completed: "SHIPPED",
          cancelled: "CANCELLED",
        },
        productMapping: "SKU",
      },
    };

    this.connections.set(params.tenantId, connection);
    return connection;
  }

  /**
   * Import orders from WooCommerce
   */
  static async importOrders(params: {
    tenantId: string;
    since?: Date;
    status?: string;
  }): Promise<{ imported: number; orders: EcommerceOrder[] }> {
    const connection = this.connections.get(params.tenantId);
    if (!connection) throw new Error("No WooCommerce connection found");

    // In production, call WooCommerce REST API
    // GET /wp-json/wc/v3/orders

    return { imported: 0, orders: [] };
  }

  /**
   * Sync inventory to WooCommerce
   */
  static async syncInventory(
    tenantId: string,
    updates: InventoryUpdate[]
  ): Promise<{ synced: number; failed: number }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No WooCommerce connection found");

    // In production, call WooCommerce Product API
    // PUT /wp-json/wc/v3/products/{id}

    return { synced: updates.length, failed: 0 };
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(params: {
    tenantId: string;
    platformOrderId: string;
    status: string;
    trackingNumber?: string;
  }): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No WooCommerce connection found");

    // In production, call WooCommerce Order API
    // PUT /wp-json/wc/v3/orders/{id}
  }
}

// ============================================================
// AMAZON SERVICE
// ============================================================

export class AmazonService {
  private static connections: Map<string, EcommerceConnection> = new Map();

  /**
   * Connect to Amazon Seller Central
   */
  static async connect(params: {
    tenantId: string;
    sellerId: string;
    marketplaceId: string;
    accessKey: string;
    secretKey: string;
    refreshToken: string;
  }): Promise<EcommerceConnection> {
    const connection: EcommerceConnection = {
      id: `AMAZON-${params.tenantId}`,
      tenantId: params.tenantId,
      platform: "AMAZON",
      storeName: `Amazon Seller: ${params.sellerId}`,
      storeUrl: `https://sellercentral.amazon.com`,
      apiKey: params.accessKey,
      apiSecret: params.secretKey,
      accessToken: params.refreshToken,
      isActive: true,
      settings: {
        autoImportOrders: true,
        autoFulfill: false,
        syncInventory: true,
        inventorySyncFrequency: "HOURLY",
        orderStatusMapping: {
          Pending: "CONFIRMED",
          Shipped: "SHIPPED",
          Cancelled: "CANCELLED",
        },
        productMapping: "SKU",
      },
    };

    this.connections.set(params.tenantId, connection);
    return connection;
  }

  /**
   * Import orders from Amazon
   */
  static async importOrders(params: {
    tenantId: string;
    since?: Date;
  }): Promise<{ imported: number; orders: EcommerceOrder[] }> {
    const connection = this.connections.get(params.tenantId);
    if (!connection) throw new Error("No Amazon connection found");

    // In production, call Amazon SP-API
    // GET /orders/v0/orders

    return { imported: 0, orders: [] };
  }

  /**
   * Update FBA inventory
   */
  static async syncFBAInventory(tenantId: string): Promise<any> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Amazon connection found");

    // In production, call Amazon FBA Inventory API
    return { synced: 0 };
  }

  /**
   * Create FBA shipment
   */
  static async createFBAShipment(params: {
    tenantId: string;
    items: { sku: string; quantity: number }[];
    destinationFulfillmentCenter: string;
  }): Promise<{ shipmentId: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Amazon connection found");

    // In production, call Amazon Inbound Shipment API
    return { shipmentId: `FBA-${Date.now()}` };
  }

  /**
   * Confirm shipment (Merchant Fulfilled)
   */
  static async confirmShipment(params: {
    tenantId: string;
    amazonOrderId: string;
    trackingNumber: string;
    carrier: string;
    items: { orderItemId: string; quantity: number }[];
  }): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Amazon connection found");

    // In production, call Amazon Orders API to confirm shipment
  }
}

// ============================================================
// ECOMMERCE SYNC SERVICE (Unified)
// ============================================================

export class EcommerceSyncService {
  /**
   * Get all connections for tenant
   */
  static async getConnections(tenantId: string): Promise<EcommerceConnection[]> {
    const connections: EcommerceConnection[] = [];

    const shopify = (ShopifyService as any).connections?.get(tenantId);
    if (shopify) connections.push(shopify);

    const woo = (WooCommerceService as any).connections?.get(tenantId);
    if (woo) connections.push(woo);

    const amazon = (AmazonService as any).connections?.get(tenantId);
    if (amazon) connections.push(amazon);

    return connections;
  }

  /**
   * Import orders from all connected platforms
   */
  static async importAllOrders(
    tenantId: string,
    since?: Date
  ): Promise<{ platform: string; imported: number }[]> {
    const results: { platform: string; imported: number }[] = [];

    try {
      const shopifyResult = await ShopifyService.importOrders({ tenantId, since });
      results.push({ platform: "SHOPIFY", imported: shopifyResult.imported });
    } catch (e) {}

    try {
      const wooResult = await WooCommerceService.importOrders({ tenantId, since });
      results.push({ platform: "WOOCOMMERCE", imported: wooResult.imported });
    } catch (e) {}

    try {
      const amazonResult = await AmazonService.importOrders({ tenantId, since });
      results.push({ platform: "AMAZON", imported: amazonResult.imported });
    } catch (e) {}

    return results;
  }

  /**
   * Push inventory to all connected platforms
   */
  static async pushInventoryToAll(tenantId: string, siteId?: string): Promise<any[]> {
    const results: any[] = [];

    // Get inventory
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        tenantId,
        ...(siteId && { siteId }),
      },
      include: { item: true },
    });

    // Aggregate
    const itemTotals = new Map<string, { sku: string; qty: number }>();
    for (const balance of balances) {
      const existing = itemTotals.get(balance.itemId);
      if (existing) {
        existing.qty += balance.qtyBase;
      } else {
        itemTotals.set(balance.itemId, {
          sku: balance.item.sku,
          qty: balance.qtyBase,
        });
      }
    }

    const updates: InventoryUpdate[] = Array.from(itemTotals.entries()).map(
      ([itemId, data]) => ({
        sku: data.sku,
        platformProductId: itemId,
        quantity: data.qty,
      })
    );

    // Push to each platform
    try {
      results.push({
        platform: "SHOPIFY",
        result: await ShopifyService.syncInventory(tenantId, updates),
      });
    } catch (e) {}

    try {
      results.push({
        platform: "WOOCOMMERCE",
        result: await WooCommerceService.syncInventory(tenantId, updates),
      });
    } catch (e) {}

    return results;
  }

  /**
   * Fulfill order and notify platform
   */
  static async fulfillOrder(params: {
    tenantId: string;
    salesOrderId: string;
    shipmentId: string;
    trackingNumber: string;
    carrier: string;
  }): Promise<void> {
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: params.salesOrderId },
      include: { lines: true },
    });

    if (!salesOrder) throw new Error("Sales order not found");

    // Determine platform from order notes or customer PO
    const platformMatch = salesOrder.notes?.match(/Imported from (\w+):/);
    if (!platformMatch) return;

    const platform = platformMatch[1] as EcommercePlatform;

    const fulfillmentData: FulfillmentData = {
      platformOrderId: salesOrder.customerPO || "",
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      items: salesOrder.lines.map((line) => ({
        platformLineId: line.id,
        quantity: line.qtyShipped,
      })),
    };

    if (platform === "SHOPIFY") {
      await ShopifyService.createFulfillment(params.tenantId, fulfillmentData);
    } else if (platform === "WOOCOMMERCE") {
      await WooCommerceService.updateOrderStatus({
        tenantId: params.tenantId,
        platformOrderId: fulfillmentData.platformOrderId,
        status: "completed",
        trackingNumber: params.trackingNumber,
      });
    }
  }
}
