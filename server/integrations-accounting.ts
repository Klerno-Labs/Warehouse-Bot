/**
 * Accounting Integration System
 *
 * QuickBooks Online, Xero integration for automatic sync
 * of inventory transactions, invoices, and financial data
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type AccountingProvider = "QUICKBOOKS" | "XERO" | "SAGE" | "NETSUITE";
export type SyncDirection = "TO_ACCOUNTING" | "FROM_ACCOUNTING" | "BIDIRECTIONAL";
export type SyncStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface AccountingConnection {
  id: string;
  tenantId: string;
  provider: AccountingProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  companyId: string;
  companyName: string;
  isActive: boolean;
  lastSyncAt?: Date;
  syncSettings: SyncSettings;
}

export interface SyncSettings {
  syncInventory: boolean;
  syncPurchases: boolean;
  syncSales: boolean;
  syncPayments: boolean;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  salesAccountId?: string;
  apAccountId?: string;
  arAccountId?: string;
  syncFrequency: "REALTIME" | "HOURLY" | "DAILY";
}

export interface JournalEntry {
  date: Date;
  reference: string;
  memo: string;
  lines: {
    accountId: string;
    description: string;
    debit?: number;
    credit?: number;
    class?: string;
    location?: string;
  }[];
}

export interface SyncResult {
  provider: AccountingProvider;
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: { record: string; error: string }[];
}

export interface InvoiceData {
  customerRef: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  lines: {
    itemRef: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface BillData {
  vendorRef: string;
  billNumber: string;
  billDate: Date;
  dueDate: Date;
  lines: {
    itemRef: string;
    description: string;
    quantity: number;
    unitCost: number;
    amount: number;
  }[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

// ============================================================
// QUICKBOOKS SERVICE
// ============================================================

export class QuickBooksService {
  private static connections: Map<string, AccountingConnection> = new Map();

  /**
   * Initialize OAuth connection
   */
  static getAuthUrl(tenantId: string, redirectUri: string): string {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const scope = "com.intuit.quickbooks.accounting";

    return `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenantId}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async handleCallback(params: {
    tenantId: string;
    code: string;
    realmId: string;
    redirectUri: string;
  }): Promise<AccountingConnection> {
    // In production, exchange code for tokens via QuickBooks OAuth API
    const connection: AccountingConnection = {
      id: `QBO-${params.tenantId}`,
      tenantId: params.tenantId,
      provider: "QUICKBOOKS",
      accessToken: `mock_access_token_${Date.now()}`,
      refreshToken: `mock_refresh_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
      companyId: params.realmId,
      companyName: "QuickBooks Company",
      isActive: true,
      syncSettings: {
        syncInventory: true,
        syncPurchases: true,
        syncSales: true,
        syncPayments: true,
        syncFrequency: "REALTIME",
      },
    };

    this.connections.set(params.tenantId, connection);
    return connection;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(tenantId: string): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    // In production, call QuickBooks token refresh endpoint
    connection.accessToken = `refreshed_token_${Date.now()}`;
    connection.expiresAt = new Date(Date.now() + 3600000);
  }

  /**
   * Create invoice in QuickBooks
   */
  static async createInvoice(
    tenantId: string,
    salesOrderId: string
  ): Promise<{ qbInvoiceId: string; docNumber: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    });

    if (!salesOrder) throw new Error("Sales order not found");

    const invoiceData: InvoiceData = {
      customerRef: salesOrder.customer.code,
      invoiceNumber: salesOrder.orderNumber,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lines: salesOrder.lines.map((line) => ({
        itemRef: line.item.sku,
        description: line.description || line.item.name,
        quantity: line.qtyOrdered,
        unitPrice: line.unitPrice,
        amount: line.lineTotal,
      })),
      subtotal: salesOrder.subtotal,
      taxAmount: salesOrder.taxAmount,
      total: salesOrder.total,
    };

    // In production, POST to QuickBooks API
    const qbInvoiceId = `QBI-${Date.now()}`;

    return {
      qbInvoiceId,
      docNumber: salesOrder.orderNumber,
    };
  }

  /**
   * Create bill in QuickBooks from PO
   */
  static async createBill(
    tenantId: string,
    purchaseOrderId: string
  ): Promise<{ qbBillId: string; docNumber: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        supplier: true,
        lines: { include: { item: true } },
      },
    });

    if (!po) throw new Error("Purchase order not found");

    const billData: BillData = {
      vendorRef: po.supplier.code,
      billNumber: po.poNumber,
      billDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lines: po.lines.map((line) => ({
        itemRef: line.item.sku,
        description: line.description || line.item.name,
        quantity: line.qtyOrdered,
        unitCost: line.unitPrice,
        amount: line.lineTotal,
      })),
      subtotal: po.subtotal,
      taxAmount: po.tax,
      total: po.total,
    };

    // In production, POST to QuickBooks API
    const qbBillId = `QBB-${Date.now()}`;

    return {
      qbBillId,
      docNumber: po.poNumber,
    };
  }

  /**
   * Sync inventory adjustments
   */
  static async syncInventoryAdjustment(params: {
    tenantId: string;
    itemId: string;
    qtyChange: number;
    reason: string;
    date: Date;
  }): Promise<{ journalEntryId: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const item = await prisma.item.findUnique({
      where: { id: params.itemId },
    });

    if (!item) throw new Error("Item not found");

    const value = Math.abs(params.qtyChange) * (item.costBase || 0);

    // Create journal entry for inventory adjustment
    const journalEntry: JournalEntry = {
      date: params.date,
      reference: `INV-ADJ-${Date.now()}`,
      memo: `Inventory adjustment: ${params.reason}`,
      lines: params.qtyChange > 0
        ? [
            {
              accountId: connection.syncSettings.inventoryAccountId || "Inventory",
              description: `${item.sku} - ${item.name}`,
              debit: value,
            },
            {
              accountId: "Inventory Adjustment",
              description: `${item.sku} - ${item.name}`,
              credit: value,
            },
          ]
        : [
            {
              accountId: "Inventory Adjustment",
              description: `${item.sku} - ${item.name}`,
              debit: value,
            },
            {
              accountId: connection.syncSettings.inventoryAccountId || "Inventory",
              description: `${item.sku} - ${item.name}`,
              credit: value,
            },
          ],
    };

    // In production, POST to QuickBooks API
    return { journalEntryId: `QBJE-${Date.now()}` };
  }

  /**
   * Sync customers
   */
  static async syncCustomers(tenantId: string): Promise<SyncResult> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const errors: { record: string; error: string }[] = [];

    const customers = await prisma.customer.findMany({
      where: { tenantId },
    });

    for (const customer of customers) {
      try {
        // In production, create/update in QuickBooks
        recordsProcessed++;
        recordsCreated++;
      } catch (error: any) {
        errors.push({ record: customer.code, error: error.message });
      }
    }

    return {
      provider: "QUICKBOOKS",
      direction: "TO_ACCOUNTING",
      status: errors.length === 0 ? "COMPLETED" : "COMPLETED",
      startedAt,
      completedAt: new Date(),
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsFailed: errors.length,
      errors,
    };
  }

  /**
   * Sync vendors/suppliers
   */
  static async syncVendors(tenantId: string): Promise<SyncResult> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const errors: { record: string; error: string }[] = [];

    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
    });

    for (const supplier of suppliers) {
      try {
        recordsProcessed++;
        recordsCreated++;
      } catch (error: any) {
        errors.push({ record: supplier.code, error: error.message });
      }
    }

    return {
      provider: "QUICKBOOKS",
      direction: "TO_ACCOUNTING",
      status: "COMPLETED",
      startedAt,
      completedAt: new Date(),
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsFailed: errors.length,
      errors,
    };
  }

  /**
   * Sync items/products
   */
  static async syncItems(tenantId: string): Promise<SyncResult> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const errors: { record: string; error: string }[] = [];

    const items = await prisma.item.findMany({
      where: { tenantId },
    });

    for (const item of items) {
      try {
        recordsProcessed++;
        recordsCreated++;
      } catch (error: any) {
        errors.push({ record: item.sku, error: error.message });
      }
    }

    return {
      provider: "QUICKBOOKS",
      direction: "TO_ACCOUNTING",
      status: "COMPLETED",
      startedAt,
      completedAt: new Date(),
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsFailed: errors.length,
      errors,
    };
  }

  /**
   * Get account list from QuickBooks
   */
  static async getAccounts(tenantId: string): Promise<any[]> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No QuickBooks connection found");

    // In production, GET from QuickBooks API
    return [
      { id: "1", name: "Inventory Asset", type: "Asset" },
      { id: "2", name: "Cost of Goods Sold", type: "Expense" },
      { id: "3", name: "Sales Revenue", type: "Income" },
      { id: "4", name: "Accounts Payable", type: "Liability" },
      { id: "5", name: "Accounts Receivable", type: "Asset" },
    ];
  }

  /**
   * Run full sync
   */
  static async runFullSync(tenantId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    results.push(await this.syncCustomers(tenantId));
    results.push(await this.syncVendors(tenantId));
    results.push(await this.syncItems(tenantId));

    // Update last sync time
    const connection = this.connections.get(tenantId);
    if (connection) {
      connection.lastSyncAt = new Date();
    }

    return results;
  }
}

// ============================================================
// XERO SERVICE
// ============================================================

export class XeroService {
  private static connections: Map<string, AccountingConnection> = new Map();

  /**
   * Initialize OAuth connection
   */
  static getAuthUrl(tenantId: string, redirectUri: string): string {
    const clientId = process.env.XERO_CLIENT_ID;
    const scope = "openid profile email accounting.transactions accounting.contacts accounting.settings";

    return `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${tenantId}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
  }): Promise<AccountingConnection> {
    const connection: AccountingConnection = {
      id: `XERO-${params.tenantId}`,
      tenantId: params.tenantId,
      provider: "XERO",
      accessToken: `mock_xero_token_${Date.now()}`,
      refreshToken: `mock_xero_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 1800000),
      companyId: `XERO-TENANT-${Date.now()}`,
      companyName: "Xero Organization",
      isActive: true,
      syncSettings: {
        syncInventory: true,
        syncPurchases: true,
        syncSales: true,
        syncPayments: true,
        syncFrequency: "REALTIME",
      },
    };

    this.connections.set(params.tenantId, connection);
    return connection;
  }

  /**
   * Create invoice in Xero
   */
  static async createInvoice(
    tenantId: string,
    salesOrderId: string
  ): Promise<{ xeroInvoiceId: string; invoiceNumber: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Xero connection found");

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        lines: { include: { item: true } },
      },
    });

    if (!salesOrder) throw new Error("Sales order not found");

    // In production, POST to Xero API
    return {
      xeroInvoiceId: `XERO-INV-${Date.now()}`,
      invoiceNumber: salesOrder.orderNumber,
    };
  }

  /**
   * Create bill in Xero
   */
  static async createBill(
    tenantId: string,
    purchaseOrderId: string
  ): Promise<{ xeroBillId: string; billNumber: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Xero connection found");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
    });

    if (!po) throw new Error("Purchase order not found");

    return {
      xeroBillId: `XERO-BILL-${Date.now()}`,
      billNumber: po.poNumber,
    };
  }

  /**
   * Sync contacts (customers and suppliers)
   */
  static async syncContacts(tenantId: string): Promise<SyncResult> {
    const connection = this.connections.get(tenantId);
    if (!connection) throw new Error("No Xero connection found");

    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;

    // Sync customers
    const customers = await prisma.customer.findMany({ where: { tenantId } });
    recordsProcessed += customers.length;
    recordsCreated += customers.length;

    // Sync suppliers
    const suppliers = await prisma.supplier.findMany({ where: { tenantId } });
    recordsProcessed += suppliers.length;
    recordsCreated += suppliers.length;

    return {
      provider: "XERO",
      direction: "TO_ACCOUNTING",
      status: "COMPLETED",
      startedAt,
      completedAt: new Date(),
      recordsProcessed,
      recordsCreated,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
    };
  }
}

// ============================================================
// ACCOUNTING SYNC SERVICE (Unified)
// ============================================================

export class AccountingSyncService {
  /**
   * Get connection for tenant
   */
  static async getConnection(tenantId: string): Promise<AccountingConnection | null> {
    // Check QuickBooks
    const qbConn = (QuickBooksService as any).connections?.get(tenantId);
    if (qbConn) return qbConn;

    // Check Xero
    const xeroConn = (XeroService as any).connections?.get(tenantId);
    if (xeroConn) return xeroConn;

    return null;
  }

  /**
   * Sync sales order to accounting
   */
  static async syncSalesOrder(tenantId: string, salesOrderId: string): Promise<any> {
    const connection = await this.getConnection(tenantId);
    if (!connection) throw new Error("No accounting connection found");

    if (connection.provider === "QUICKBOOKS") {
      return QuickBooksService.createInvoice(tenantId, salesOrderId);
    } else if (connection.provider === "XERO") {
      return XeroService.createInvoice(tenantId, salesOrderId);
    }

    throw new Error(`Unsupported provider: ${connection.provider}`);
  }

  /**
   * Sync purchase order to accounting
   */
  static async syncPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<any> {
    const connection = await this.getConnection(tenantId);
    if (!connection) throw new Error("No accounting connection found");

    if (connection.provider === "QUICKBOOKS") {
      return QuickBooksService.createBill(tenantId, purchaseOrderId);
    } else if (connection.provider === "XERO") {
      return XeroService.createBill(tenantId, purchaseOrderId);
    }

    throw new Error(`Unsupported provider: ${connection.provider}`);
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(tenantId: string): Promise<{
    connected: boolean;
    provider?: AccountingProvider;
    lastSync?: Date;
    nextSync?: Date;
  }> {
    const connection = await this.getConnection(tenantId);

    if (!connection) {
      return { connected: false };
    }

    const nextSync = new Date(connection.lastSyncAt || new Date());
    switch (connection.syncSettings.syncFrequency) {
      case "REALTIME":
        // No scheduled sync
        break;
      case "HOURLY":
        nextSync.setHours(nextSync.getHours() + 1);
        break;
      case "DAILY":
        nextSync.setDate(nextSync.getDate() + 1);
        break;
    }

    return {
      connected: true,
      provider: connection.provider,
      lastSync: connection.lastSyncAt,
      nextSync,
    };
  }
}
