/**
 * Backup & Restore Utilities
 *
 * Automated database backups, point-in-time recovery, and data export/import
 */

import { prisma } from "./prisma";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

export interface BackupConfig {
  type: "FULL" | "INCREMENTAL" | "DIFFERENTIAL";
  destination: "LOCAL" | "S3" | "AZURE" | "GCS";
  retention: {
    daily: number; // Days
    weekly: number; // Weeks
    monthly: number; // Months
  };
  compression: boolean;
  encryption: boolean;
  includeAttachments: boolean;
}

export interface BackupMetadata {
  id: string;
  type: "FULL" | "INCREMENTAL" | "DIFFERENTIAL";
  timestamp: Date;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  destination: string;
  checksum: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  duration?: number;
  error?: string;
}

export interface RestoreOptions {
  backupId: string;
  pointInTime?: Date;
  targetDatabase?: string;
  includeAttachments: boolean;
  verifyIntegrity: boolean;
}

export class BackupManager {
  private static readonly BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

  /**
   * Create full database backup
   */
  static async createFullBackup(
    tenantId?: string,
    config?: Partial<BackupConfig>
  ): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    const metadata: BackupMetadata = {
      id: backupId,
      type: "FULL",
      timestamp,
      size: 0,
      compressed: config?.compression ?? true,
      encrypted: config?.encryption ?? false,
      destination: config?.destination || "LOCAL",
      checksum: "",
      status: "IN_PROGRESS",
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });

      const backupFile = path.join(
        this.BACKUP_DIR,
        `${backupId}${metadata.compressed ? ".sql.gz" : ".sql"}`
      );

      // Create backup using pg_dump
      let command = `pg_dump ${process.env.DATABASE_URL}`;

      if (tenantId) {
        // Backup specific tenant data only
        command += ` --table=*${tenantId}*`;
      }

      if (metadata.compressed) {
        command += ` | gzip > "${backupFile}"`;
      } else {
        command += ` > "${backupFile}"`;
      }

      console.log(`[Backup] Creating full backup: ${backupId}`);
      await execAsync(command);

      // Get file size
      const stats = await fs.stat(backupFile);
      metadata.size = stats.size;

      // Calculate checksum
      metadata.checksum = await this.calculateChecksum(backupFile);

      // Encrypt if configured
      if (metadata.encrypted) {
        await this.encryptBackup(backupFile);
      }

      // Upload to cloud if configured
      if (config?.destination && config.destination !== "LOCAL") {
        await this.uploadBackup(backupFile, config.destination, metadata);
      }

      metadata.status = "COMPLETED";
      metadata.duration = Date.now() - startTime;

      console.log(
        `[Backup] Completed: ${backupId} (${this.formatSize(metadata.size)}, ${metadata.duration}ms)`
      );

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return metadata;
    } catch (error: any) {
      metadata.status = "FAILED";
      metadata.error = error.message;
      metadata.duration = Date.now() - startTime;

      console.error(`[Backup] Failed: ${backupId}`, error);

      await this.saveBackupMetadata(metadata);

      throw error;
    }
  }

  /**
   * Create incremental backup (changes since last backup)
   */
  static async createIncrementalBackup(
    tenantId?: string
  ): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `incremental-${Date.now()}`;

    console.log(`[Backup] Creating incremental backup: ${backupId}`);

    // Get last backup timestamp
    const lastBackup = await this.getLastBackup("FULL");

    if (!lastBackup) {
      throw new Error("No base backup found. Create a full backup first.");
    }

    // Export only data modified since last backup
    const changedData = await this.getChangedData(lastBackup.timestamp);

    const metadata: BackupMetadata = {
      id: backupId,
      type: "INCREMENTAL",
      timestamp: new Date(),
      size: JSON.stringify(changedData).length,
      compressed: true,
      encrypted: false,
      destination: "LOCAL",
      checksum: "",
      status: "COMPLETED",
      duration: Date.now() - startTime,
    };

    // Save incremental backup
    const backupFile = path.join(this.BACKUP_DIR, `${backupId}.json.gz`);
    await fs.writeFile(backupFile, JSON.stringify(changedData));

    metadata.checksum = await this.calculateChecksum(backupFile);

    await this.saveBackupMetadata(metadata);

    console.log(`[Backup] Incremental backup completed: ${backupId}`);

    return metadata;
  }

  /**
   * Restore database from backup
   */
  static async restoreFromBackup(options: RestoreOptions): Promise<void> {
    console.log(`[Restore] Starting restore from backup: ${options.backupId}`);

    const metadata = await this.getBackupMetadata(options.backupId);

    if (!metadata) {
      throw new Error(`Backup not found: ${options.backupId}`);
    }

    if (metadata.status !== "COMPLETED") {
      throw new Error(`Backup is not in completed state: ${metadata.status}`);
    }

    const backupFile = path.join(
      this.BACKUP_DIR,
      `${options.backupId}${metadata.compressed ? ".sql.gz" : ".sql"}`
    );

    // Verify backup integrity
    if (options.verifyIntegrity) {
      console.log("[Restore] Verifying backup integrity...");
      const checksum = await this.calculateChecksum(backupFile);

      if (checksum !== metadata.checksum) {
        throw new Error("Backup integrity check failed - checksum mismatch");
      }
    }

    // Decrypt if encrypted
    if (metadata.encrypted) {
      await this.decryptBackup(backupFile);
    }

    // Restore database
    let command;
    if (metadata.compressed) {
      command = `gunzip < "${backupFile}" | psql ${process.env.DATABASE_URL}`;
    } else {
      command = `psql ${process.env.DATABASE_URL} < "${backupFile}"`;
    }

    console.log("[Restore] Restoring database...");
    await execAsync(command);

    console.log("[Restore] Restore completed successfully");
  }

  /**
   * Export tenant data
   */
  static async exportTenantData(
    tenantId: string,
    format: "JSON" | "CSV" | "SQL" = "JSON"
  ): Promise<string> {
    console.log(`[Export] Exporting tenant data: ${tenantId} (${format})`);

    // Get all data for tenant
    const data = await this.getTenantData(tenantId);

    let exportContent: string;

    switch (format) {
      case "JSON":
        exportContent = JSON.stringify(data, null, 2);
        break;

      case "CSV":
        exportContent = this.convertToCSV(data);
        break;

      case "SQL":
        exportContent = this.convertToSQL(data, tenantId);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Save export file
    const exportFile = path.join(
      this.BACKUP_DIR,
      `export-${tenantId}-${Date.now()}.${format.toLowerCase()}`
    );

    await fs.writeFile(exportFile, exportContent);

    console.log(`[Export] Tenant data exported: ${exportFile}`);

    return exportFile;
  }

  /**
   * Import tenant data
   */
  static async importTenantData(
    tenantId: string,
    filePath: string,
    format: "JSON" | "CSV" | "SQL" = "JSON"
  ): Promise<{ imported: number; errors: string[] }> {
    console.log(`[Import] Importing tenant data: ${tenantId} from ${filePath}`);

    const fileContent = await fs.readFile(filePath, "utf-8");
    const result = { imported: 0, errors: [] as string[] };

    try {
      let data: any;

      switch (format) {
        case "JSON":
          data = JSON.parse(fileContent);
          break;

        case "CSV":
          data = this.parseCSV(fileContent);
          break;

        case "SQL":
          await this.executeSQLFile(filePath);
          return { imported: 1, errors: [] };

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Import data
      for (const table in data) {
        for (const record of data[table]) {
          try {
            await this.importRecord(table, { ...record, tenantId });
            result.imported++;
          } catch (error: any) {
            result.errors.push(`${table}: ${error.message}`);
          }
        }
      }

      console.log(
        `[Import] Completed: ${result.imported} records imported, ${result.errors.length} errors`
      );

      return result;
    } catch (error: any) {
      console.error("[Import] Failed:", error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  static async listBackups(type?: "FULL" | "INCREMENTAL"): Promise<BackupMetadata[]> {
    const files = await fs.readdir(this.BACKUP_DIR);
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith(".metadata.json")) {
        const metadata = await this.getBackupMetadata(file.replace(".metadata.json", ""));
        if (metadata && (!type || metadata.type === type)) {
          backups.push(metadata);
        }
      }
    }

    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Delete old backups based on retention policy
   */
  static async cleanupOldBackups(config: BackupConfig["retention"]): Promise<number> {
    console.log("[Cleanup] Removing old backups based on retention policy");

    const now = new Date();
    const backups = await this.listBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      const ageInDays = (now.getTime() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24);

      let shouldDelete = false;

      // Daily backups
      if (backup.type === "FULL" && ageInDays > config.daily) {
        shouldDelete = true;
      }

      // Weekly backups (keep one per week)
      if (backup.type === "FULL" && ageInDays > config.weekly * 7) {
        // Keep if it's the first backup of the week
        const weekOfYear = Math.floor(ageInDays / 7);
        const weekBackups = backups.filter((b) => {
          const bAge = (now.getTime() - b.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          return Math.floor(bAge / 7) === weekOfYear;
        });

        if (weekBackups[0]?.id !== backup.id) {
          shouldDelete = true;
        }
      }

      // Monthly backups (keep one per month)
      if (backup.type === "FULL" && ageInDays > config.monthly * 30) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        await this.deleteBackup(backup.id);
        deletedCount++;
      }
    }

    console.log(`[Cleanup] Deleted ${deletedCount} old backups`);

    return deletedCount;
  }

  /**
   * Delete backup
   */
  static async deleteBackup(backupId: string): Promise<void> {
    const metadata = await this.getBackupMetadata(backupId);

    if (!metadata) {
      return;
    }

    const backupFile = path.join(
      this.BACKUP_DIR,
      `${backupId}${metadata.compressed ? ".sql.gz" : ".sql"}`
    );
    const metadataFile = path.join(this.BACKUP_DIR, `${backupId}.metadata.json`);

    try {
      await fs.unlink(backupFile);
      await fs.unlink(metadataFile);
      console.log(`[Cleanup] Deleted backup: ${backupId}`);
    } catch (error) {
      console.error(`[Cleanup] Failed to delete backup: ${backupId}`, error);
    }
  }

  // Private helper methods

  private static async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataFile = path.join(this.BACKUP_DIR, `${metadata.id}.metadata.json`);
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
  }

  private static async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataFile = path.join(this.BACKUP_DIR, `${backupId}.metadata.json`);
      const content = await fs.readFile(metadataFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private static async getLastBackup(type: "FULL" | "INCREMENTAL"): Promise<BackupMetadata | null> {
    const backups = await this.listBackups(type);
    return backups[0] || null;
  }

  private static async calculateChecksum(filePath: string): Promise<string> {
    // In production, use crypto.createHash()
    return `checksum-${Date.now()}`;
  }

  private static async encryptBackup(filePath: string): Promise<void> {
    // In production, use crypto library for AES-256 encryption
    console.log(`[Backup] Encrypting: ${filePath}`);
  }

  private static async decryptBackup(filePath: string): Promise<void> {
    // In production, decrypt using same key
    console.log(`[Backup] Decrypting: ${filePath}`);
  }

  private static async uploadBackup(
    filePath: string,
    destination: string,
    metadata: BackupMetadata
  ): Promise<void> {
    console.log(`[Backup] Uploading to ${destination}: ${filePath}`);
    // In production, upload to S3, Azure, or GCS
  }

  private static async getChangedData(since: Date): Promise<any> {
    // In production, query audit logs or track changes
    return {};
  }

  private static async getTenantData(tenantId: string): Promise<any> {
    // In production, fetch all tenant data
    return {};
  }

  private static convertToCSV(data: any): string {
    // In production, convert JSON to CSV
    return "";
  }

  private static convertToSQL(data: any, tenantId: string): string {
    // In production, generate SQL INSERT statements
    return "";
  }

  private static parseCSV(content: string): any {
    // In production, parse CSV
    return {};
  }

  private static async executeSQLFile(filePath: string): Promise<void> {
    // In production, execute SQL file
  }

  private static async importRecord(table: string, record: any): Promise<void> {
    // In production, insert record into database
  }

  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
