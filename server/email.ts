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
}
