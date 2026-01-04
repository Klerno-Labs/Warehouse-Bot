/**
 * Automated Task Scheduler
 *
 * Handles scheduled reports, backups, and maintenance tasks
 * Supports cron-style scheduling
 */

import { prisma } from "./prisma";
import { EmailService } from "./email";

export type ScheduleFrequency = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  type: "REPORT" | "EXPORT" | "BACKUP" | "ALERT_CHECK" | "SYNC" | "CLEANUP";
  frequency: ScheduleFrequency;
  cronExpression?: string; // For CUSTOM frequency
  config: Record<string, any>;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  lastRunStatus?: "SUCCESS" | "FAILED" | "PARTIAL";
  recipients?: string[]; // Email recipients for reports
  tenantId: string;
  createdAt: Date;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  startedAt: Date;
  completedAt?: Date;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  output?: any;
  error?: string;
  duration?: number;
}

export class TaskScheduler {
  /**
   * Create a new scheduled task
   */
  static async createTask(
    tenantId: string,
    task: Omit<ScheduledTask, "id" | "createdAt" | "nextRunAt">
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const nextRunAt = this.calculateNextRun(task.frequency, task.cronExpression);

    // In production, save to database
    console.log("Creating scheduled task:", {
      id: taskId,
      ...task,
      nextRunAt,
      tenantId,
    });

    return taskId;
  }

  /**
   * Execute scheduled task
   */
  static async executeTask(taskId: string): Promise<TaskExecution> {
    const execution: TaskExecution = {
      id: `exec-${Date.now()}`,
      taskId,
      startedAt: new Date(),
      status: "RUNNING",
    };

    try {
      // Get task configuration
      const task = await this.getTask(taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Execute based on task type
      let output;
      switch (task.type) {
        case "REPORT":
          output = await this.generateScheduledReport(task);
          break;
        case "EXPORT":
          output = await this.performScheduledExport(task);
          break;
        case "BACKUP":
          output = await this.performBackup(task);
          break;
        case "ALERT_CHECK":
          output = await this.checkAlerts(task);
          break;
        case "SYNC":
          output = await this.performSync(task);
          break;
        case "CLEANUP":
          output = await this.performCleanup(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      execution.status = "SUCCESS";
      execution.output = output;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      // Update task last run
      await this.updateTaskLastRun(taskId, execution);

      // Send notification if configured
      if (task.recipients && task.recipients.length > 0) {
        await this.sendTaskNotification(task, execution);
      }
    } catch (error: any) {
      execution.status = "FAILED";
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    }

    return execution;
  }

  /**
   * Get all tasks due for execution
   */
  static async getDueTasks(): Promise<ScheduledTask[]> {
    const now = new Date();

    // In production, query database
    const tasks: ScheduledTask[] = [];

    return tasks.filter((task) => task.enabled && task.nextRunAt <= now);
  }

  /**
   * Run task scheduler loop
   */
  static async runScheduler(): Promise<void> {
    console.log("[Scheduler] Checking for due tasks...");

    const dueTasks = await this.getDueTasks();

    console.log(`[Scheduler] Found ${dueTasks.length} tasks to execute`);

    for (const task of dueTasks) {
      try {
        console.log(`[Scheduler] Executing task: ${task.name}`);
        await this.executeTask(task.id);
      } catch (error) {
        console.error(`[Scheduler] Task execution failed:`, error);
      }
    }
  }

  /**
   * Start scheduler with interval
   */
  static startScheduler(intervalMinutes: number = 5): NodeJS.Timeout {
    console.log(`[Scheduler] Starting with ${intervalMinutes} minute interval`);

    // Run immediately
    this.runScheduler();

    // Run on interval
    return setInterval(() => {
      this.runScheduler();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Calculate next run time based on frequency
   */
  private static calculateNextRun(
    frequency: ScheduleFrequency,
    cronExpression?: string
  ): Date {
    const now = new Date();

    switch (frequency) {
      case "HOURLY":
        return new Date(now.getTime() + 60 * 60 * 1000);

      case "DAILY":
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;

      case "WEEKLY":
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;

      case "MONTHLY":
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;

      case "CUSTOM":
        // In production, parse cron expression
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate scheduled report
   */
  private static async generateScheduledReport(task: ScheduledTask): Promise<any> {
    const { reportType, format, filters } = task.config;

    console.log(`Generating ${reportType} report in ${format} format`);

    // Get data based on report type
    const data = await this.getReportData(task.tenantId, reportType, filters);

    // Generate report
    let reportContent;
    switch (format) {
      case "PDF":
        reportContent = await this.generatePDFReport(data, reportType);
        break;
      case "CSV":
        reportContent = await this.generateCSVReport(data, reportType);
        break;
      case "EXCEL":
        reportContent = await this.generateExcelReport(data, reportType);
        break;
      default:
        reportContent = data;
    }

    return {
      reportType,
      format,
      recordCount: data.length,
      size: JSON.stringify(reportContent).length,
    };
  }

  /**
   * Perform scheduled export
   */
  private static async performScheduledExport(task: ScheduledTask): Promise<any> {
    const { entityType, format, destination } = task.config;

    console.log(`Exporting ${entityType} to ${format} format`);

    // Get data
    const data = await this.getExportData(task.tenantId, entityType);

    // Export to destination (S3, FTP, email, etc.)
    const exportResult = await this.exportToDestination(data, format, destination);

    return {
      entityType,
      recordCount: data.length,
      destination,
      ...exportResult,
    };
  }

  /**
   * Perform database backup
   */
  private static async performBackup(task: ScheduledTask): Promise<any> {
    const { destination, includeAttachments } = task.config;

    console.log("Performing database backup");

    // In production, trigger pg_dump or similar
    const backupFile = `backup_${Date.now()}.sql`;

    return {
      backupFile,
      destination,
      size: 0, // Would be actual file size
      includeAttachments,
    };
  }

  /**
   * Check alerts as scheduled task
   */
  private static async checkAlerts(task: ScheduledTask): Promise<any> {
    console.log("Running scheduled alert check");

    // Import and run alert service
    const { AlertService } = await import("./alerts");
    const alerts = await AlertService.checkAlerts(task.tenantId);

    return {
      alertsTriggered: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === "critical").length,
      warningCount: alerts.filter((a) => a.severity === "warning").length,
    };
  }

  /**
   * Perform data sync
   */
  private static async performSync(task: ScheduledTask): Promise<any> {
    const { integrationType, direction } = task.config;

    console.log(`Performing ${direction} sync with ${integrationType}`);

    // In production, trigger integration sync
    return {
      integrationType,
      direction,
      recordsSynced: 0,
    };
  }

  /**
   * Perform data cleanup
   */
  private static async performCleanup(task: ScheduledTask): Promise<any> {
    const { dataType, retentionDays } = task.config;

    console.log(`Cleaning up ${dataType} older than ${retentionDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // In production, delete old records
    let recordsDeleted = 0;

    switch (dataType) {
      case "logs":
        // Delete old logs
        break;
      case "temp_files":
        // Delete temporary files
        break;
      case "synced_transactions":
        // Delete synced offline transactions
        break;
    }

    return {
      dataType,
      retentionDays,
      recordsDeleted,
    };
  }

  /**
   * Send task completion notification
   */
  private static async sendTaskNotification(
    task: ScheduledTask,
    execution: TaskExecution
  ): Promise<void> {
    const statusIcon = execution.status === "SUCCESS" ? "✅" : "❌";
    const subject = `${statusIcon} Scheduled Task: ${task.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>${subject}</h2>
        <p><strong>Task:</strong> ${task.name}</p>
        <p><strong>Type:</strong> ${task.type}</p>
        <p><strong>Status:</strong> ${execution.status}</p>
        <p><strong>Started:</strong> ${execution.startedAt.toLocaleString()}</p>
        <p><strong>Completed:</strong> ${execution.completedAt?.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${execution.duration}ms</p>
        ${execution.output ? `<p><strong>Output:</strong> ${JSON.stringify(execution.output, null, 2)}</p>` : ""}
        ${execution.error ? `<p style="color: red;"><strong>Error:</strong> ${execution.error}</p>` : ""}
      </div>
    `;

    for (const recipient of task.recipients || []) {
      await EmailService.sendEmail({
        to: recipient,
        subject,
        html,
      });
    }
  }

  // Helper methods

  private static async getTask(taskId: string): Promise<ScheduledTask | null> {
    // In production, fetch from database
    return null;
  }

  private static async updateTaskLastRun(
    taskId: string,
    execution: TaskExecution
  ): Promise<void> {
    // In production, update task record
    console.log("Updated task last run:", taskId, execution.status);
  }

  private static async getReportData(
    tenantId: string,
    reportType: string,
    filters?: any
  ): Promise<any[]> {
    // In production, fetch from database
    return [];
  }

  private static async getExportData(tenantId: string, entityType: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }

  private static async generatePDFReport(data: any[], reportType: string): Promise<Buffer> {
    // In production, generate PDF
    return Buffer.from([]);
  }

  private static async generateCSVReport(data: any[], reportType: string): Promise<string> {
    // In production, generate CSV
    return "";
  }

  private static async generateExcelReport(data: any[], reportType: string): Promise<Buffer> {
    // In production, generate Excel file
    return Buffer.from([]);
  }

  private static async exportToDestination(
    data: any[],
    format: string,
    destination: string
  ): Promise<any> {
    // In production, export to S3, FTP, email, etc.
    return {
      success: true,
      url: destination,
    };
  }
}

/**
 * Pre-configured task templates
 */
export const TASK_TEMPLATES = {
  DAILY_INVENTORY_REPORT: {
    name: "Daily Inventory Report",
    description: "Automated daily inventory summary",
    type: "REPORT" as const,
    frequency: "DAILY" as const,
    config: {
      reportType: "inventory_summary",
      format: "PDF",
      filters: {},
    },
  },
  WEEKLY_VENDOR_SCORECARD: {
    name: "Weekly Vendor Performance",
    description: "Weekly supplier scorecard report",
    type: "REPORT" as const,
    frequency: "WEEKLY" as const,
    config: {
      reportType: "vendor_scorecard",
      format: "PDF",
      filters: {},
    },
  },
  MONTHLY_FORECAST: {
    name: "Monthly Demand Forecast",
    description: "Monthly inventory forecasting report",
    type: "REPORT" as const,
    frequency: "MONTHLY" as const,
    config: {
      reportType: "forecast",
      format: "EXCEL",
      filters: {
        forecastDays: 30,
        historicalDays: 90,
      },
    },
  },
  HOURLY_ALERT_CHECK: {
    name: "Hourly Alert Check",
    description: "Check for critical inventory alerts",
    type: "ALERT_CHECK" as const,
    frequency: "HOURLY" as const,
    config: {},
  },
  DAILY_BACKUP: {
    name: "Daily Database Backup",
    description: "Automated daily backup",
    type: "BACKUP" as const,
    frequency: "DAILY" as const,
    config: {
      destination: "s3://backups/",
      includeAttachments: true,
    },
  },
  WEEKLY_CLEANUP: {
    name: "Weekly Data Cleanup",
    description: "Clean up old logs and temp files",
    type: "CLEANUP" as const,
    frequency: "WEEKLY" as const,
    config: {
      dataType: "logs",
      retentionDays: 90,
    },
  },
};
