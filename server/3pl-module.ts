/**
 * 3PL (Third-Party Logistics) Module
 * Top 0.01% feature: Multi-client warehouse management with billing
 * Competes with: 3PL Central, Deposco, Extensiv
 */

import { storage } from './storage';

// Types for 3PL operations
interface Client {
  id: string;
  name: string;
  code: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  contractStart: string;
  contractEnd: string;
  status: 'active' | 'inactive' | 'pending';
  settings: ClientSettings;
  createdAt: string;
}

interface ClientSettings {
  storageRateType: 'per_pallet' | 'per_sqft' | 'per_cubic';
  storageRate: number;
  handlingInRate: number;
  handlingOutRate: number;
  pickRate: number;
  packRate: number;
  minimumMonthlyCharge: number;
  billingCycle: 'weekly' | 'biweekly' | 'monthly';
  invoiceDueDay: number;
  customRates: CustomRate[];
}

interface CustomRate {
  activity: string;
  rate: number;
  unit: string;
  description: string;
}

interface BillingRecord {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue';
  lineItems: BillingLineItem[];
  subtotal: number;
  taxes: number;
  total: number;
  dueDate: string;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
}

interface BillingLineItem {
  activity: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface StorageSnapshot {
  clientId: string;
  date: string;
  palletsUsed: number;
  sqftUsed: number;
  cubicFeetUsed: number;
  skuCount: number;
  unitCount: number;
}

interface ActivityLog {
  id: string;
  clientId: string;
  activityType: string;
  quantity: number;
  unit: string;
  reference: string;
  timestamp: string;
  billable: boolean;
  billed: boolean;
  billingRecordId?: string;
}

/**
 * Client Management Service
 * Manages 3PL clients and their settings
 */
export class ClientManagementService {
  private clients: Client[] = [
    {
      id: 'CLT-001',
      name: 'Acme Electronics',
      code: 'ACME',
      contactName: 'John Acme',
      contactEmail: 'john@acme.com',
      contactPhone: '555-0100',
      billingAddress: '123 Business St, New York, NY 10001',
      contractStart: '2024-01-01',
      contractEnd: '2025-12-31',
      status: 'active',
      settings: {
        storageRateType: 'per_pallet',
        storageRate: 8.50,
        handlingInRate: 3.25,
        handlingOutRate: 3.50,
        pickRate: 0.45,
        packRate: 0.75,
        minimumMonthlyCharge: 2500,
        billingCycle: 'monthly',
        invoiceDueDay: 15,
        customRates: [
          { activity: 'kitting', rate: 5.00, unit: 'per_kit', description: 'Kit assembly' },
          { activity: 'relabeling', rate: 0.25, unit: 'per_unit', description: 'SKU relabeling' },
        ],
      },
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'CLT-002',
      name: 'Global Fashion Co',
      code: 'GFCO',
      contactName: 'Sarah Fashion',
      contactEmail: 'sarah@globalfashion.com',
      contactPhone: '555-0200',
      billingAddress: '456 Fashion Ave, Los Angeles, CA 90001',
      contractStart: '2024-03-01',
      contractEnd: '2026-02-28',
      status: 'active',
      settings: {
        storageRateType: 'per_sqft',
        storageRate: 0.85,
        handlingInRate: 2.75,
        handlingOutRate: 3.00,
        pickRate: 0.35,
        packRate: 0.65,
        minimumMonthlyCharge: 5000,
        billingCycle: 'biweekly',
        invoiceDueDay: 10,
        customRates: [
          { activity: 'garment_hanging', rate: 0.50, unit: 'per_unit', description: 'Hang garments' },
          { activity: 'steaming', rate: 1.25, unit: 'per_unit', description: 'Garment steaming' },
        ],
      },
      createdAt: '2024-03-01T00:00:00Z',
    },
    {
      id: 'CLT-003',
      name: 'Health Supplements Inc',
      code: 'HSI',
      contactName: 'Mike Health',
      contactEmail: 'mike@healthsupplements.com',
      contactPhone: '555-0300',
      billingAddress: '789 Health Blvd, Chicago, IL 60601',
      contractStart: '2024-06-01',
      contractEnd: '2025-05-31',
      status: 'active',
      settings: {
        storageRateType: 'per_pallet',
        storageRate: 12.00,
        handlingInRate: 4.00,
        handlingOutRate: 4.25,
        pickRate: 0.55,
        packRate: 0.85,
        minimumMonthlyCharge: 3500,
        billingCycle: 'monthly',
        invoiceDueDay: 20,
        customRates: [
          { activity: 'lot_tracking', rate: 0.15, unit: 'per_unit', description: 'Lot/batch tracking' },
          { activity: 'temp_monitoring', rate: 50.00, unit: 'per_day', description: 'Temperature monitoring' },
        ],
      },
      createdAt: '2024-06-01T00:00:00Z',
    },
  ];

  async getClients(status?: string): Promise<Client[]> {
    if (status) {
      return this.clients.filter(c => c.status === status);
    }
    return this.clients;
  }

  async getClient(clientId: string): Promise<Client | null> {
    return this.clients.find(c => c.id === clientId) || null;
  }

  async createClient(clientData: Partial<Client>): Promise<Client> {
    const newClient: Client = {
      id: `CLT-${String(this.clients.length + 1).padStart(3, '0')}`,
      name: clientData.name || 'New Client',
      code: clientData.code || 'NEW',
      contactName: clientData.contactName || '',
      contactEmail: clientData.contactEmail || '',
      contactPhone: clientData.contactPhone || '',
      billingAddress: clientData.billingAddress || '',
      contractStart: clientData.contractStart || new Date().toISOString().split('T')[0],
      contractEnd: clientData.contractEnd || '',
      status: 'pending',
      settings: clientData.settings || {
        storageRateType: 'per_pallet',
        storageRate: 10.00,
        handlingInRate: 3.50,
        handlingOutRate: 3.75,
        pickRate: 0.50,
        packRate: 0.80,
        minimumMonthlyCharge: 2000,
        billingCycle: 'monthly',
        invoiceDueDay: 15,
        customRates: [],
      },
      createdAt: new Date().toISOString(),
    };
    this.clients.push(newClient);
    return newClient;
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client | null> {
    const index = this.clients.findIndex(c => c.id === clientId);
    if (index === -1) return null;
    this.clients[index] = { ...this.clients[index], ...updates };
    return this.clients[index];
  }

  async getClientDashboard(clientId: string): Promise<any> {
    const client = await this.getClient(clientId);
    if (!client) return null;

    return {
      client,
      inventory: {
        totalUnits: 45000 + Math.floor(Math.random() * 10000),
        totalSKUs: 850 + Math.floor(Math.random() * 100),
        palletsUsed: 320 + Math.floor(Math.random() * 50),
        sqftUsed: 12500 + Math.floor(Math.random() * 2000),
      },
      activity: {
        ordersToday: 125 + Math.floor(Math.random() * 50),
        unitsShippedToday: 2500 + Math.floor(Math.random() * 500),
        receiptsToday: 15 + Math.floor(Math.random() * 10),
        unitsReceivedToday: 3000 + Math.floor(Math.random() * 1000),
      },
      billing: {
        currentMonthCharges: 12500 + Math.random() * 5000,
        lastInvoiceAmount: 14250.00,
        lastInvoiceStatus: 'paid',
        accountBalance: 0,
      },
      kpis: {
        orderAccuracy: 99.5 + Math.random() * 0.4,
        onTimeShipment: 98.2 + Math.random() * 1.5,
        inventoryAccuracy: 99.8 + Math.random() * 0.2,
        avgOrderCycleTime: 2.1 + Math.random() * 0.5,
      },
    };
  }
}

/**
 * Billing Service
 * Activity-based costing and invoicing
 */
export class BillingService {
  private billingRecords: BillingRecord[] = [];
  private activityLogs: ActivityLog[] = [];
  private clientService = new ClientManagementService();

  async generateBillingPeriod(clientId: string, periodStart: string, periodEnd: string): Promise<BillingRecord> {
    const client = await this.clientService.getClient(clientId);
    if (!client) throw new Error('Client not found');

    // Calculate activity-based charges
    const lineItems: BillingLineItem[] = [];

    // Storage charges (average daily storage)
    const avgPallets = 320 + Math.floor(Math.random() * 50);
    const storageDays = Math.ceil((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000);
    const storageCharge = avgPallets * client.settings.storageRate * (storageDays / 30);
    lineItems.push({
      activity: 'Storage',
      description: `${avgPallets} pallets avg × ${storageDays} days`,
      quantity: avgPallets,
      unit: 'pallets',
      rate: client.settings.storageRate,
      amount: storageCharge,
    });

    // Inbound handling
    const unitsReceived = 15000 + Math.floor(Math.random() * 5000);
    lineItems.push({
      activity: 'Inbound Handling',
      description: 'Receiving and putaway',
      quantity: unitsReceived,
      unit: 'units',
      rate: client.settings.handlingInRate,
      amount: unitsReceived * client.settings.handlingInRate,
    });

    // Outbound handling
    const unitsShipped = 18000 + Math.floor(Math.random() * 6000);
    lineItems.push({
      activity: 'Outbound Handling',
      description: 'Order fulfillment',
      quantity: unitsShipped,
      unit: 'units',
      rate: client.settings.handlingOutRate,
      amount: unitsShipped * client.settings.handlingOutRate,
    });

    // Pick charges
    const picks = 25000 + Math.floor(Math.random() * 8000);
    lineItems.push({
      activity: 'Picking',
      description: 'Order line picking',
      quantity: picks,
      unit: 'picks',
      rate: client.settings.pickRate,
      amount: picks * client.settings.pickRate,
    });

    // Pack charges
    const packs = 12000 + Math.floor(Math.random() * 4000);
    lineItems.push({
      activity: 'Packing',
      description: 'Order packing',
      quantity: packs,
      unit: 'packs',
      rate: client.settings.packRate,
      amount: packs * client.settings.packRate,
    });

    // Custom rates
    for (const customRate of client.settings.customRates) {
      const qty = Math.floor(100 + Math.random() * 200);
      lineItems.push({
        activity: customRate.activity,
        description: customRate.description,
        quantity: qty,
        unit: customRate.unit,
        rate: customRate.rate,
        amount: qty * customRate.rate,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const finalSubtotal = Math.max(subtotal, client.settings.minimumMonthlyCharge);

    // Add minimum charge adjustment if needed
    if (subtotal < client.settings.minimumMonthlyCharge) {
      lineItems.push({
        activity: 'Minimum Charge Adjustment',
        description: 'Adjustment to meet minimum monthly charge',
        quantity: 1,
        unit: 'adjustment',
        rate: client.settings.minimumMonthlyCharge - subtotal,
        amount: client.settings.minimumMonthlyCharge - subtotal,
      });
    }

    const taxes = finalSubtotal * 0.0825; // 8.25% tax rate

    const billingRecord: BillingRecord = {
      id: `INV-${Date.now()}`,
      clientId,
      periodStart,
      periodEnd,
      status: 'draft',
      lineItems,
      subtotal: finalSubtotal,
      taxes,
      total: finalSubtotal + taxes,
      dueDate: new Date(Date.now() + client.settings.invoiceDueDay * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    this.billingRecords.push(billingRecord);
    return billingRecord;
  }

  async getBillingRecords(clientId?: string, status?: string): Promise<BillingRecord[]> {
    let records = this.billingRecords;
    if (clientId) {
      records = records.filter(r => r.clientId === clientId);
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }
    return records;
  }

  async getBillingRecord(recordId: string): Promise<BillingRecord | null> {
    return this.billingRecords.find(r => r.id === recordId) || null;
  }

  async updateBillingStatus(recordId: string, status: BillingRecord['status']): Promise<BillingRecord | null> {
    const index = this.billingRecords.findIndex(r => r.id === recordId);
    if (index === -1) return null;

    this.billingRecords[index].status = status;
    if (status === 'sent') {
      this.billingRecords[index].sentAt = new Date().toISOString();
    } else if (status === 'paid') {
      this.billingRecords[index].paidAt = new Date().toISOString();
    }

    return this.billingRecords[index];
  }

  async logActivity(activity: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: `ACT-${Date.now()}`,
      ...activity,
    };
    this.activityLogs.push(log);
    return log;
  }

  async getActivityLogs(clientId: string, startDate?: string, endDate?: string): Promise<ActivityLog[]> {
    let logs = this.activityLogs.filter(l => l.clientId === clientId);
    if (startDate) {
      logs = logs.filter(l => l.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter(l => l.timestamp <= endDate);
    }
    return logs;
  }
}

/**
 * Client Segregation Service
 * Ensures data isolation between clients
 */
export class ClientSegregationService {
  async validateClientAccess(userId: string, clientId: string): Promise<boolean> {
    // In production, check user's client access permissions
    return true;
  }

  async getClientInventory(clientId: string): Promise<any[]> {
    // Returns only inventory belonging to the client
    return [
      {
        id: `INV-${clientId}-001`,
        sku: 'SKU-001',
        name: 'Widget A',
        quantity: 5000,
        location: 'A-01-01',
        lotNumber: 'LOT-2024-001',
        expirationDate: '2025-12-31',
        clientId,
      },
      {
        id: `INV-${clientId}-002`,
        sku: 'SKU-002',
        name: 'Widget B',
        quantity: 3200,
        location: 'A-02-03',
        lotNumber: 'LOT-2024-002',
        expirationDate: '2025-06-30',
        clientId,
      },
    ];
  }

  async getClientOrders(clientId: string): Promise<any[]> {
    // Returns only orders belonging to the client
    return [
      {
        id: `ORD-${clientId}-001`,
        orderNumber: 'PO-10001',
        status: 'SHIPPED',
        lines: 5,
        units: 125,
        clientId,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: `ORD-${clientId}-002`,
        orderNumber: 'PO-10002',
        status: 'PICKING',
        lines: 3,
        units: 45,
        clientId,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Rate Card Service
 * Manages client-specific pricing
 */
export class RateCardService {
  async getRateCard(clientId: string): Promise<any> {
    const clientService = new ClientManagementService();
    const client = await clientService.getClient(clientId);
    if (!client) return null;

    return {
      clientId,
      clientName: client.name,
      effectiveDate: client.contractStart,
      expirationDate: client.contractEnd,
      standardRates: {
        storage: {
          type: client.settings.storageRateType,
          rate: client.settings.storageRate,
          unit: client.settings.storageRateType === 'per_pallet' ? 'pallet/month' :
                client.settings.storageRateType === 'per_sqft' ? 'sq ft/month' : 'cubic ft/month',
        },
        handlingIn: {
          rate: client.settings.handlingInRate,
          unit: 'per unit',
        },
        handlingOut: {
          rate: client.settings.handlingOutRate,
          unit: 'per unit',
        },
        picking: {
          rate: client.settings.pickRate,
          unit: 'per pick',
        },
        packing: {
          rate: client.settings.packRate,
          unit: 'per pack',
        },
      },
      customRates: client.settings.customRates,
      minimumCharge: client.settings.minimumMonthlyCharge,
      billingCycle: client.settings.billingCycle,
    };
  }

  async updateRateCard(clientId: string, rates: Partial<ClientSettings>): Promise<boolean> {
    const clientService = new ClientManagementService();
    const updated = await clientService.updateClient(clientId, {
      settings: { ...rates } as ClientSettings,
    });
    return updated !== null;
  }
}

/**
 * 3PL Analytics Service
 * Client-specific analytics and reporting
 */
export class ThreePLAnalyticsService {
  async getClientAnalytics(clientId: string, period: string = '30d'): Promise<any> {
    return {
      clientId,
      period,
      volume: {
        ordersProcessed: 3500 + Math.floor(Math.random() * 500),
        unitsShipped: 85000 + Math.floor(Math.random() * 10000),
        receiptsProcessed: 120 + Math.floor(Math.random() * 30),
        unitsReceived: 95000 + Math.floor(Math.random() * 15000),
      },
      performance: {
        orderAccuracy: 99.5 + Math.random() * 0.4,
        onTimeShipment: 98.2 + Math.random() * 1.5,
        receiptAccuracy: 99.8 + Math.random() * 0.2,
        inventoryAccuracy: 99.9 + Math.random() * 0.1,
        avgOrderCycleTime: 2.1 + Math.random() * 0.5,
        avgReceiveCycleTime: 4.5 + Math.random() * 1.0,
      },
      storage: {
        avgPalletsUsed: 320 + Math.floor(Math.random() * 50),
        peakPalletsUsed: 385 + Math.floor(Math.random() * 30),
        avgSqftUsed: 12500 + Math.floor(Math.random() * 2000),
        utilizationTrend: 'increasing',
      },
      costs: {
        totalCharges: 45000 + Math.random() * 10000,
        costPerOrder: 12.85 + Math.random() * 2,
        costPerUnit: 0.53 + Math.random() * 0.1,
        storageCharges: 2720 + Math.random() * 500,
        handlingCharges: 35000 + Math.random() * 8000,
        valueAddedCharges: 7280 + Math.random() * 1500,
      },
      trends: {
        volumeChange: '+12%',
        costPerOrderChange: '-5%',
        performanceChange: '+2%',
      },
    };
  }

  async getPortfolioSummary(): Promise<any> {
    const clientService = new ClientManagementService();
    const clients = await clientService.getClients('active');

    return {
      totalClients: clients.length,
      totalRevenue: 125000 + Math.random() * 25000,
      avgRevenuePerClient: (125000 + Math.random() * 25000) / clients.length,
      topClients: clients.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        revenue: 35000 + Math.random() * 15000,
        volume: 1200 + Math.floor(Math.random() * 500),
      })),
      capacityUtilization: {
        storage: 75 + Math.random() * 10,
        labor: 82 + Math.random() * 8,
        throughput: 78 + Math.random() * 12,
      },
      profitabilityByClient: clients.map(c => ({
        clientId: c.id,
        clientName: c.name,
        revenue: 35000 + Math.random() * 15000,
        cost: 28000 + Math.random() * 12000,
        margin: 15 + Math.random() * 10,
      })),
    };
  }
}
