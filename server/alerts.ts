/**
 * Automated Alert & Threshold Monitoring System
 *
 * Monitors inventory levels, quality metrics, and operational thresholds
 * Sends real-time notifications via email, SMS, and in-app channels
 */

import { prisma } from "./prisma";
import { EmailService } from "./email";
import { logger } from "./logger";

export type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "OVERSTOCK"
  | "EXPIRING_INVENTORY"
  | "QUALITY_ISSUE"
  | "CYCLE_COUNT_VARIANCE"
  | "SLOW_MOVING"
  | "PRODUCTION_DELAY"
  | "PURCHASE_ORDER_DUE"
  | "REORDER_POINT_REACHED"
  | "SAFETY_STOCK_BREACH"
  | "HIGH_SCRAP_RATE";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertChannel = "email" | "sms" | "in_app" | "webhook";

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: {
    field: string;
    operator: "lt" | "lte" | "gt" | "gte" | "eq" | "ne";
    value: any;
  }[];
  channels: AlertChannel[];
  recipients: string[]; // User IDs or email addresses
  cooldownMinutes: number; // Prevent alert spam
  tenantId: string;
  siteId?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  tenantId: string;
}

export class AlertService {
  /**
   * Check all alert rules and trigger alerts if conditions are met
   */
  static async checkAlerts(tenantId: string, siteId?: string): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    // Check low stock alerts
    const lowStockAlerts = await this.checkLowStock(tenantId, siteId);
    triggeredAlerts.push(...lowStockAlerts);

    // Check out of stock alerts
    const outOfStockAlerts = await this.checkOutOfStock(tenantId, siteId);
    triggeredAlerts.push(...outOfStockAlerts);

    // Check expiring inventory
    const expiringAlerts = await this.checkExpiringInventory(tenantId, siteId);
    triggeredAlerts.push(...expiringAlerts);

    // Check slow moving inventory
    const slowMovingAlerts = await this.checkSlowMoving(tenantId, siteId);
    triggeredAlerts.push(...slowMovingAlerts);

    // Check production delays
    const productionAlerts = await this.checkProductionDelays(tenantId, siteId);
    triggeredAlerts.push(...productionAlerts);

    // Check purchase order due dates
    const poAlerts = await this.checkPurchaseOrdersDue(tenantId, siteId);
    triggeredAlerts.push(...poAlerts);

    // Send notifications for all triggered alerts
    for (const alert of triggeredAlerts) {
      await this.sendAlertNotifications(alert);
    }

    return triggeredAlerts;
  }

  /**
   * Check for low stock conditions
   */
  private static async checkLowStock(tenantId: string, siteId?: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const items = await prisma.item.findMany({
      where: {
        tenantId,
        reorderPointBase: { gt: 0 },
      },
      include: {
        balances: siteId
          ? {
              where: { siteId },
            }
          : true,
      },
    });

    for (const item of items) {
      const currentStock = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);
      const reorderPoint = item.reorderPointBase || 0;

      // Check if stock is below reorder point but not zero
      if (currentStock > 0 && currentStock <= reorderPoint) {
        const daysUntilStockout = await this.calculateDaysUntilStockout(item.id, currentStock);

        alerts.push({
          id: `alert-${Date.now()}-${item.id}`,
          ruleId: "low-stock-default",
          type: "LOW_STOCK",
          severity: currentStock <= reorderPoint * 0.5 ? "critical" : "warning",
          title: `Low Stock Alert: ${item.name}`,
          message: `Item "${item.name}" (SKU: ${item.sku}) is running low. Current stock: ${currentStock}, Reorder point: ${reorderPoint}. Estimated ${daysUntilStockout} days until stockout.`,
          entityType: "Item",
          entityId: item.id,
          metadata: {
            sku: item.sku,
            currentStock,
            reorderPoint,
            daysUntilStockout,
          },
          triggeredAt: new Date(),
          resolved: false,
          tenantId,
        });
      }
    }

    return alerts;
  }

  /**
   * Check for out of stock conditions
   */
  private static async checkOutOfStock(tenantId: string, siteId?: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const items = await prisma.item.findMany({
      where: {
        tenantId,
      },
      include: {
        balances: siteId
          ? {
              where: { siteId },
            }
          : true,
      },
    });

    for (const item of items) {
      const currentStock = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);

      if (currentStock <= 0) {
        alerts.push({
          id: `alert-${Date.now()}-${item.id}`,
          ruleId: "out-of-stock-default",
          type: "OUT_OF_STOCK",
          severity: "critical",
          title: `OUT OF STOCK: ${item.name}`,
          message: `CRITICAL: Item "${item.name}" (SKU: ${item.sku}) is completely out of stock. Immediate action required.`,
          entityType: "Item",
          entityId: item.id,
          metadata: {
            sku: item.sku,
            reorderPoint: item.reorderPointBase || 0,
          },
          triggeredAt: new Date(),
          resolved: false,
          tenantId,
        });
      }
    }

    return alerts;
  }

  /**
   * Check for expiring inventory (items with expiration dates)
   * Uses ProductionOutput records that have expirationDate set
   */
  private static async checkExpiringInventory(
    tenantId: string,
    siteId?: string
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Check for items expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const now = new Date();

    // Find production outputs with expiration dates that haven't passed yet
    // but are within the warning window
    const expiringOutputs = await prisma.productionOutput.findMany({
      where: {
        productionOrder: {
          tenantId,
          ...(siteId && {
            site: { id: siteId }
          })
        },
        expirationDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        qtyProduced: { gt: 0 },
      },
      include: {
        item: true,
        toLocation: true,
        productionOrder: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    for (const output of expiringOutputs) {
      const daysUntilExpiration = Math.ceil(
        (output.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine severity based on days until expiration
      let severity: AlertSeverity = "info";
      if (daysUntilExpiration <= 7) {
        severity = "critical";
      } else if (daysUntilExpiration <= 14) {
        severity = "warning";
      }

      const lotInfo = output.lotNumber ? ` (Lot: ${output.lotNumber})` : "";
      const batchInfo = output.batchNumber ? ` (Batch: ${output.batchNumber})` : "";

      alerts.push({
        id: `alert-${Date.now()}-${output.id}`,
        ruleId: "expiring-inventory-default",
        type: "EXPIRING_INVENTORY",
        severity,
        title: `EXPIRING: ${output.item.name}${lotInfo}${batchInfo}`,
        message: `${severity === "critical" ? "URGENT: " : ""}Item "${output.item.name}" (SKU: ${output.item.sku}) expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? "s" : ""} on ${output.expirationDate!.toLocaleDateString()}. Qty: ${output.qtyProduced} at ${output.toLocation.label}.`,
        entityType: "ProductionOutput",
        entityId: output.id,
        metadata: {
          sku: output.item.sku,
          itemId: output.itemId,
          lotNumber: output.lotNumber,
          batchNumber: output.batchNumber,
          expirationDate: output.expirationDate,
          daysUntilExpiration,
          quantity: output.qtyProduced,
          locationId: output.toLocationId,
          locationLabel: output.toLocation.label,
          productionOrderNumber: output.productionOrder.orderNumber,
        },
        triggeredAt: new Date(),
        resolved: false,
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Check for slow-moving inventory
   */
  private static async checkSlowMoving(tenantId: string, siteId?: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Items with no movement in 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const items = await prisma.item.findMany({
      where: { tenantId },
      include: {
        balances: siteId
          ? {
              where: { siteId },
            }
          : true,
        inventoryEvents: {
          where: {
            createdAt: { gte: ninetyDaysAgo },
          },
          take: 1,
        },
      },
    });

    for (const item of items) {
      const currentStock = item.balances.reduce((sum, b) => sum + b.qtyBase, 0);

      // Has stock but no movement
      if (currentStock > 0 && item.inventoryEvents.length === 0) {
        const value = currentStock * (item.costBase || 0);

        alerts.push({
          id: `alert-${Date.now()}-${item.id}`,
          ruleId: "slow-moving-default",
          type: "SLOW_MOVING",
          severity: "info",
          title: `Slow-Moving Inventory: ${item.name}`,
          message: `Item "${item.name}" (SKU: ${item.sku}) has not moved in 90+ days. Current stock: ${currentStock}, Value: $${value.toFixed(2)}. Consider markdown or disposal.`,
          entityType: "Item",
          entityId: item.id,
          metadata: {
            sku: item.sku,
            currentStock,
            value,
            daysWithoutMovement: 90,
          },
          triggeredAt: new Date(),
          resolved: false,
          tenantId,
        });
      }
    }

    return alerts;
  }

  /**
   * Check for production delays
   */
  private static async checkProductionDelays(
    tenantId: string,
    siteId?: string
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const today = new Date();

    const delayedOrders = await prisma.productionOrder.findMany({
      where: {
        tenantId,
        ...(siteId && { siteId }),
        status: { in: ["PLANNED", "RELEASED", "IN_PROGRESS"] },
        scheduledEnd: { lt: today },
      },
      include: {
        item: true,
      },
    });

    for (const order of delayedOrders) {
      if (!order.scheduledEnd) continue;
      
      const daysDelayed = Math.floor(
        (today.getTime() - order.scheduledEnd.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `alert-${Date.now()}-${order.id}`,
        ruleId: "production-delay-default",
        type: "PRODUCTION_DELAY",
        severity: daysDelayed > 7 ? "critical" : "warning",
        title: `Production Order Delayed: ${order.orderNumber || order.id}`,
        message: `Production order for "${order.item.name}" is ${daysDelayed} days overdue. Scheduled completion: ${order.scheduledEnd.toLocaleDateString()}. Current status: ${order.status}.`,
        entityType: "ProductionOrder",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          itemSku: order.item.sku,
          daysDelayed,
          scheduledEnd: order.scheduledEnd,
          status: order.status,
        },
        triggeredAt: new Date(),
        resolved: false,
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Check for purchase orders due soon
   */
  private static async checkPurchaseOrdersDue(
    tenantId: string,
    siteId?: string
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingOrders = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(siteId && { siteId }),
        status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] },
        expectedDelivery: {
          lte: sevenDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        supplier: true,
      },
    });

    for (const order of upcomingOrders) {
      if (!order.expectedDelivery) continue;
      
      const daysUntilDue = Math.floor(
        (order.expectedDelivery.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `alert-${Date.now()}-${order.id}`,
        ruleId: "po-due-default",
        type: "PURCHASE_ORDER_DUE",
        severity: daysUntilDue <= 2 ? "warning" : "info",
        title: `Purchase Order Due Soon: ${order.poNumber || order.id}`,
        message: `PO from "${order.supplier.name}" is due in ${daysUntilDue} days on ${order.expectedDelivery.toLocaleDateString()}. Ensure receiving area is prepared.`,
        entityType: "PurchaseOrder",
        entityId: order.id,
        metadata: {
          orderNumber: order.poNumber,
          supplier: order.supplier.name,
          daysUntilDue,
          expectedDelivery: order.expectedDelivery,
        },
        triggeredAt: new Date(),
        resolved: false,
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Send alert notifications via configured channels
   */
  private static async sendAlertNotifications(alert: Alert): Promise<void> {
    // Get notification preferences for the tenant
    // In production, this would fetch from user preferences table

    const channels: AlertChannel[] = ["email", "in_app"];

    // Send email notification
    if (channels.includes("email")) {
      await this.sendEmailNotification(alert);
    }

    // Store in-app notification
    if (channels.includes("in_app")) {
      await this.storeInAppNotification(alert);
    }

    // SMS notifications (future implementation)
    if (channels.includes("sms")) {
      // await this.sendSMSNotification(alert);
    }

    // Webhook notifications (future implementation)
    if (channels.includes("webhook")) {
      // await this.sendWebhookNotification(alert);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(alert: Alert): Promise<void> {
    try {
      // Get admin users for the tenant with their email preferences
      const users = await prisma.user.findMany({
        where: {
          tenantId: alert.tenantId,
          role: { in: ["Admin", "Supervisor"] },
        },
        select: {
          email: true,
          preferences: true,
        },
      });

      // Filter users based on their email notification preferences
      const recipients = users
        .filter((u) => {
          const prefs = (u.preferences as Record<string, any>) || {};
          const emailPrefs = prefs.emailNotifications || {};

          // Check if email notifications are enabled (default: true)
          if (emailPrefs.emailNotifications === false) return false;

          // Check specific alert type preferences
          switch (alert.type) {
            case "LOW_STOCK":
            case "REORDER_POINT_REACHED":
            case "SAFETY_STOCK_BREACH":
              return emailPrefs.lowStockAlerts !== false;
            case "OUT_OF_STOCK":
              return emailPrefs.outOfStockAlerts !== false;
            case "QUALITY_ISSUE":
            case "HIGH_SCRAP_RATE":
              return emailPrefs.qualityIssueNotifications !== false;
            case "CYCLE_COUNT_VARIANCE":
              return emailPrefs.cycleCountNotifications !== false;
            default:
              return true; // Allow by default for other alert types
          }
        })
        .map((u) => u.email);

      if (recipients.length === 0) return;

      const severityColor =
        alert.severity === "critical" ? "red" : alert.severity === "warning" ? "orange" : "blue";

      const html = `
        <div style="font-family: Arial, sans-serif;">
          <div style="background-color: ${severityColor === "red" ? "#fee" : severityColor === "orange" ? "#ffe" : "#eef"}; padding: 20px; border-left: 4px solid ${severityColor === "red" ? "#c00" : severityColor === "orange" ? "#f80" : "#08f"};">
            <h2 style="margin: 0 0 10px 0; color: #333;">${alert.title}</h2>
            <p style="margin: 0; color: #666;">${alert.message}</p>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; margin-top: 10px;">
            <p><strong>Alert Type:</strong> ${alert.type}</p>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Triggered:</strong> ${alert.triggeredAt.toLocaleString()}</p>
            ${alert.metadata ? `<p><strong>Details:</strong> ${JSON.stringify(alert.metadata, null, 2)}</p>` : ""}
          </div>
          <div style="padding: 20px; text-align: center;">
            <a href="${process.env.APP_URL}/alerts/${alert.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Alert</a>
          </div>
        </div>
      `;

      for (const recipient of recipients) {
        await EmailService.sendEmail({
          to: recipient,
          subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          html,
        });
      }
    } catch (error) {
      logger.error("Failed to send email notification", error as Error);
    }
  }

  /**
   * Store in-app notification
   */
  private static async storeInAppNotification(alert: Alert): Promise<void> {
    await prisma.notification.create({
      data: {
        tenantId: alert.tenantId,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        priority: alert.severity === "critical" ? "URGENT" : alert.severity === "warning" ? "HIGH" : "MEDIUM",
        metadata: {
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
          ...alert.metadata,
        },
      },
    });

    logger.debug("Stored in-app notification", { alertId: alert.id, alertType: alert.type });
  }

  /**
   * Calculate days until stockout based on historical usage
   */
  private static async calculateDaysUntilStockout(itemId: string, currentStock: number): Promise<number> {
    // Calculate average daily usage from recent inventory events
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageEvents = await prisma.inventoryEvent.findMany({
      where: {
        itemId,
        eventType: { in: ["ISSUE", "SALE", "CONSUMPTION"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { qtyBase: true },
    });

    if (usageEvents.length === 0) {
      return 999; // No usage data, assume no stockout risk
    }

    const totalUsage = usageEvents.reduce((sum, e) => sum + Math.abs(e.qtyBase), 0);
    const avgDailyUsage = totalUsage / 30;

    if (avgDailyUsage <= 0) {
      return 999;
    }

    return Math.floor(currentStock / avgDailyUsage);
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    // Mark the related notification as read
    await prisma.notification.updateMany({
      where: {
        metadata: {
          path: ["alertId"],
          equals: alertId,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info("Alert acknowledged", { alertId, userId });
    return { success: true };
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<{ success: boolean }> {
    // Delete the notification for this alert
    await prisma.notification.deleteMany({
      where: {
        metadata: {
          path: ["alertId"],
          equals: alertId,
        },
      },
    });

    logger.info("Alert resolved", { alertId });
    return { success: true };
  }
}
