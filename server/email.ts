import { Resend } from "resend";

// Initialize Resend client (requires RESEND_API_KEY environment variable)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export type EmailTemplate =
  | "low-stock-alert"
  | "out-of-stock-alert"
  | "job-ready"
  | "job-completed"
  | "cycle-count-ready"
  | "production-order-ready"
  | "quality-issue"
  | "variance-requires-approval";

interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Email Service for sending notifications
 *
 * Features:
 * - Low stock alerts
 * - Out of stock alerts
 * - Job notifications
 * - Production order notifications
 * - Cycle count notifications
 * - Quality issues
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: API key from resend.com
 * - EMAIL_FROM: Default sender email (e.g., notifications@yourdomain.com)
 */
export class EmailService {
  private static fromEmail = process.env.EMAIL_FROM || "noreply@warehouse-core.com";

  /**
   * Send an email using Resend
   */
  static async sendEmail(data: EmailData): Promise<boolean> {
    if (!resend) {
      console.warn("Email service not configured. Set RESEND_API_KEY environment variable.");
      return false;
    }

    try {
      await resend.emails.send({
        from: data.from || this.fromEmail,
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
        html: data.html,
      });

      console.log(`Email sent successfully to ${data.to}`);
      return true;
    } catch (error: any) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(
    to: string,
    items: Array<{ sku: string; name: string; currentStock: number; reorderPoint: number }>
  ): Promise<boolean> {
    const itemsList = items
      .map(
        (item) =>
          `<li><strong>${item.name}</strong> (${item.sku}) - ${item.currentStock} units (reorder at ${item.reorderPoint})</li>`
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Low Stock Alert</h2>
        <p>The following items are running low on stock and need to be reordered:</p>
        <ul style="line-height: 1.8;">
          ${itemsList}
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/modules/inventory"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Inventory
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `🚨 Low Stock Alert - ${items.length} Item${items.length > 1 ? "s" : ""}`,
      html,
    });
  }

  /**
   * Send out of stock alert
   */
  static async sendOutOfStockAlert(
    to: string,
    items: Array<{ sku: string; name: string }>
  ): Promise<boolean> {
    const itemsList = items
      .map((item) => `<li><strong>${item.name}</strong> (${item.sku})</li>`)
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Out of Stock Alert</h2>
        <p>The following items are completely out of stock:</p>
        <ul style="line-height: 1.8;">
          ${itemsList}
        </ul>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/modules/inventory"
             style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Inventory
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `🚨 OUT OF STOCK - ${items.length} Item${items.length > 1 ? "s" : ""}`,
      html,
    });
  }

  /**
   * Send job ready notification
   */
  static async sendJobReadyNotification(
    to: string,
    jobNumber: string,
    department: string,
    itemCount: number
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Job Ready</h2>
        <p>Job <strong>${jobNumber}</strong> is ready for processing in the <strong>${department}</strong> department.</p>
        <p><strong>Items to process:</strong> ${itemCount}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/mobile/job-scanner"
             style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Start Job
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Job Ready: ${jobNumber} - ${department}`,
      html,
    });
  }

  /**
   * Send job completed notification
   */
  static async sendJobCompletedNotification(
    to: string,
    jobNumber: string,
    completedBy: string,
    itemsProcessed: number
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Job Completed</h2>
        <p>Job <strong>${jobNumber}</strong> has been completed.</p>
        <p><strong>Completed by:</strong> ${completedBy}</p>
        <p><strong>Items processed:</strong> ${itemsProcessed}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/modules/jobs"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Jobs
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `✅ Job Completed: ${jobNumber}`,
      html,
    });
  }

  /**
   * Send cycle count ready notification
   */
  static async sendCycleCountReadyNotification(
    to: string,
    countName: string,
    itemCount: number,
    scheduledDate: Date
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Cycle Count Scheduled</h2>
        <p>A new cycle count <strong>${countName}</strong> has been scheduled.</p>
        <p><strong>Scheduled for:</strong> ${scheduledDate.toLocaleDateString()}</p>
        <p><strong>Items to count:</strong> ${itemCount}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/modules/cycle-counts"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Cycle Counts
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `📋 Cycle Count Scheduled: ${countName}`,
      html,
    });
  }

  /**
   * Send variance approval required notification
   */
  static async sendVarianceApprovalNotification(
    to: string,
    countName: string,
    varianceCount: number,
    totalValue: number
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">⚠️ Variance Approval Required</h2>
        <p>Cycle count <strong>${countName}</strong> has variances that require approval.</p>
        <p><strong>Items with variance:</strong> ${varianceCount}</p>
        <p><strong>Total variance value:</strong> $${totalValue.toLocaleString()}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/modules/cycle-counts"
             style="background-color: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Review Variances
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `⚠️ Variance Approval Required: ${countName}`,
      html,
    });
  }

  /**
   * Send quality issue notification
   */
  static async sendQualityIssueNotification(
    to: string,
    orderNumber: string,
    issue: string,
    reportedBy: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Quality Issue Reported</h2>
        <p>A quality issue has been reported for production order <strong>${orderNumber}</strong>.</p>
        <p><strong>Issue:</strong> ${issue}</p>
        <p><strong>Reported by:</strong> ${reportedBy}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/manufacturing/production-orders"
             style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Production Orders
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `🚨 Quality Issue: ${orderNumber}`,
      html,
    });
  }

  /**
   * Send daily summary report
   */
  static async sendDailySummary(
    to: string,
    summary: {
      date: Date;
      totalTransactions: number;
      lowStockCount: number;
      jobsCompleted: number;
      productionOrdersCompleted: number;
      inventoryValue: number;
    }
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">📊 Daily Summary Report</h2>
        <p>${summary.date.toLocaleDateString()}</p>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0;"><strong>Total Transactions</strong></td>
              <td style="padding: 10px 0; text-align: right;">${summary.totalTransactions}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0;"><strong>Low Stock Items</strong></td>
              <td style="padding: 10px 0; text-align: right; color: ${summary.lowStockCount > 0 ? "#ea580c" : "#16a34a"};">${summary.lowStockCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0;"><strong>Jobs Completed</strong></td>
              <td style="padding: 10px 0; text-align: right;">${summary.jobsCompleted}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0;"><strong>Production Orders Completed</strong></td>
              <td style="padding: 10px 0; text-align: right;">${summary.productionOrdersCompleted}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Total Inventory Value</strong></td>
              <td style="padding: 10px 0; text-align: right;"><strong>$${summary.inventoryValue.toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>

        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Dashboard
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated daily summary from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `📊 Daily Summary - ${summary.date.toLocaleDateString()}`,
      html,
    });
  }

  // ==========================================================================
  // SALES EMAIL TEMPLATES
  // ==========================================================================

  /**
   * Send order confirmation to customer
   */
  static async sendOrderConfirmation(
    to: string,
    order: {
      orderNumber: string;
      customerName: string;
      orderDate: Date;
      total: number;
      items: Array<{ name: string; qty: number; unitPrice: number }>;
      shippingAddress: string;
    }
  ): Promise<boolean> {
    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.qty * item.unitPrice).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Order Confirmed</h2>
        <p>Thank you for your order, ${order.customerName}!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin: 5px 0 0;"><strong>Order Date:</strong> ${order.orderDate.toLocaleDateString()}</p>
        </div>

        <h3 style="color: #0f172a;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #0f172a; color: white;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
          ${itemsHtml}
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td colspan="3" style="padding: 10px; text-align: right;">Order Total:</td>
            <td style="padding: 10px; text-align: right;">$${order.total.toFixed(2)}</td>
          </tr>
        </table>

        <h3 style="color: #0f172a; margin-top: 20px;">Shipping Address</h3>
        <p style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
          ${order.shippingAddress.replace(/\n/g, '<br>')}
        </p>

        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/portal/orders/${order.orderNumber}"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Track Your Order
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          If you have any questions, please contact us at ${process.env.EMAIL_FROM || "support@warehouse-core.com"}.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
    });
  }

  /**
   * Send shipment notification to customer
   */
  static async sendShipmentNotification(
    to: string,
    shipment: {
      orderNumber: string;
      shipmentNumber: string;
      customerName: string;
      carrier: string;
      trackingNumber?: string;
      estimatedDelivery?: Date;
      items: Array<{ name: string; qty: number }>;
    }
  ): Promise<boolean> {
    const itemsHtml = shipment.items
      .map((item) => `<li>${item.name} × ${item.qty}</li>`)
      .join("");

    const trackingHtml = shipment.trackingNumber
      ? `<p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
         <p style="margin-top: 10px;">
           <a href="https://www.google.com/search?q=${shipment.carrier}+tracking+${shipment.trackingNumber}"
              style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             Track Package
           </a>
         </p>`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📦 Your Order Has Shipped!</h2>
        <p>Great news, ${shipment.customerName}! Your order is on its way.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${shipment.orderNumber}</p>
          <p style="margin: 5px 0 0;"><strong>Shipment Number:</strong> ${shipment.shipmentNumber}</p>
          <p style="margin: 5px 0 0;"><strong>Carrier:</strong> ${shipment.carrier}</p>
          ${shipment.estimatedDelivery ? `<p style="margin: 5px 0 0;"><strong>Estimated Delivery:</strong> ${shipment.estimatedDelivery.toLocaleDateString()}</p>` : ""}
        </div>

        ${trackingHtml}

        <h3 style="color: #0f172a; margin-top: 20px;">Items Shipped</h3>
        <ul style="line-height: 1.8;">
          ${itemsHtml}
        </ul>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Thank you for your business!
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `📦 Shipped: Order ${shipment.orderNumber}`,
      html,
    });
  }

  /**
   * Send delivery confirmation to customer
   */
  static async sendDeliveryConfirmation(
    to: string,
    delivery: {
      orderNumber: string;
      customerName: string;
      deliveredAt: Date;
      signedBy?: string;
    }
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Order Delivered</h2>
        <p>Hello ${delivery.customerName},</p>
        <p>Your order <strong>${delivery.orderNumber}</strong> has been delivered!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Delivered:</strong> ${delivery.deliveredAt.toLocaleString()}</p>
          ${delivery.signedBy ? `<p style="margin: 5px 0 0;"><strong>Signed by:</strong> ${delivery.signedBy}</p>` : ""}
        </div>

        <p>We hope you're happy with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Thank you for choosing us!
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `✅ Delivered: Order ${delivery.orderNumber}`,
      html,
    });
  }

  /**
   * Send internal notification for new sales order
   */
  static async sendNewOrderNotification(
    to: string,
    order: {
      orderNumber: string;
      customerName: string;
      total: number;
      itemCount: number;
      requestedDate?: Date;
      priority?: string;
    }
  ): Promise<boolean> {
    const priorityColor = order.priority === "HIGH" ? "#dc2626" : order.priority === "MEDIUM" ? "#ea580c" : "#6b7280";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">📥 New Sales Order</h2>
        <p>A new sales order has been received and needs processing.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin: 5px 0 0;"><strong>Customer:</strong> ${order.customerName}</p>
          <p style="margin: 5px 0 0;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          <p style="margin: 5px 0 0;"><strong>Items:</strong> ${order.itemCount}</p>
          ${order.requestedDate ? `<p style="margin: 5px 0 0;"><strong>Requested Date:</strong> ${order.requestedDate.toLocaleDateString()}</p>` : ""}
          ${order.priority ? `<p style="margin: 5px 0 0;"><strong>Priority:</strong> <span style="color: ${priorityColor};">${order.priority}</span></p>` : ""}
        </div>

        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/sales/orders"
             style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Order
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Warehouse Core.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `📥 New Order: ${order.orderNumber} - ${order.customerName}`,
      html,
    });
  }

  /**
   * Send PO confirmation to supplier
   */
  static async sendPurchaseOrderToSupplier(
    to: string,
    po: {
      poNumber: string;
      supplierName: string;
      items: Array<{ name: string; qty: number; unitPrice: number }>;
      total: number;
      deliveryDate?: Date;
      shippingAddress: string;
      notes?: string;
    },
    pdfAttachment?: Buffer
  ): Promise<boolean> {
    const itemsHtml = po.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.qty * item.unitPrice).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Purchase Order: ${po.poNumber}</h2>
        <p>Dear ${po.supplierName},</p>
        <p>Please find our purchase order details below. A PDF copy is attached for your records.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #0f172a; color: white;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Unit Price</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
          ${itemsHtml}
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td colspan="3" style="padding: 10px; text-align: right;">Total:</td>
            <td style="padding: 10px; text-align: right;">$${po.total.toFixed(2)}</td>
          </tr>
        </table>

        ${po.deliveryDate ? `<p><strong>Required Delivery Date:</strong> ${po.deliveryDate.toLocaleDateString()}</p>` : ""}
        
        <h3 style="color: #0f172a;">Ship To</h3>
        <p style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
          ${po.shippingAddress.replace(/\n/g, '<br>')}
        </p>

        ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ""}

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Please confirm receipt of this order by replying to this email.
        </p>
      </div>
    `;

    // TODO: Add PDF attachment support when Resend supports it
    return this.sendEmail({
      to,
      subject: `Purchase Order: ${po.poNumber}`,
      html,
    });
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation(data: {
    recipientName: string;
    recipientEmail: string;
    inviterName: string;
    companyName: string;
    role: string;
    invitationLink: string;
  }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2563eb; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
        </div>

        <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 16px 0;">
            Hi <strong>${data.recipientName}</strong>,
          </p>

          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 16px 0;">
            <strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> as a <strong>${data.role}</strong>.
          </p>

          <p style="font-size: 16px; line-height: 24px; color: #374151; margin: 0 0 24px 0;">
            Click the button below to accept your invitation and set up your account.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.invitationLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>

          <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0 0 8px 0;">
            Or copy and paste this link into your browser:
          </p>

          <p style="font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all; margin: 0 0 24px 0;">
            ${data.invitationLink}
          </p>

          <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0;">
            This invitation will expire in 7 days.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          This invitation was sent by ${data.companyName}. If you weren't expecting this, you can safely ignore this email.
        </div>
      </div>
    `;

    return EmailService.sendEmail({
      to: data.recipientEmail,
      subject: `You've been invited to join ${data.companyName}`,
      html,
    });
  }
}

// Export singleton instance
export const emailService = EmailService;
