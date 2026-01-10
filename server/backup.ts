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
import * as crypto from "crypto";
import { logger } from "./logger";

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

      logger.info("Creating full backup", { backupId });
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

      logger.info("Backup completed", { backupId, size: this.formatSize(metadata.size), duration: metadata.duration });

      // Save metadata
      await this.saveBackupMetadata(metadata);

      return metadata;
    } catch (error: any) {
      metadata.status = "FAILED";
      metadata.error = error.message;
      metadata.duration = Date.now() - startTime;

      logger.error("Backup failed", error, { backupId });

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

    logger.info("Creating incremental backup", { backupId });

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

    logger.info("Incremental backup completed", { backupId });

    return metadata;
  }

  /**
   * Restore database from backup
   */
  static async restoreFromBackup(options: RestoreOptions): Promise<void> {
    logger.info("Starting restore from backup", { backupId: options.backupId });

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
      logger.info("Verifying backup integrity");
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

    logger.info("Restoring database");
    await execAsync(command);

    logger.info("Restore completed successfully");
  }

  /**
   * Export tenant data
   */
  static async exportTenantData(
    tenantId: string,
    format: "JSON" | "CSV" | "SQL" = "JSON"
  ): Promise<string> {
    logger.info("Exporting tenant data", { tenantId, format });

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

    logger.info("Tenant data exported", { exportFile });

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
    logger.info("Importing tenant data", { tenantId, filePath });

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

      logger.info("Import completed", { imported: result.imported, errorCount: result.errors.length });

      return result;
    } catch (error: any) {
      logger.error("Import failed", error);
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
    logger.info("Removing old backups based on retention policy");

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

    logger.info("Cleanup completed", { deletedCount });

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
      logger.debug("Deleted backup", { backupId });
    } catch (error) {
      logger.error("Failed to delete backup", error as Error, { backupId });
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
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  }

  private static async encryptBackup(filePath: string): Promise<void> {
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("BACKUP_ENCRYPTION_KEY environment variable not set");
    }

    logger.debug("Encrypting backup", { filePath });

    const fileContent = await fs.readFile(filePath);
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(encryptionKey, "salt", 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([cipher.update(fileContent), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Write IV + authTag + encrypted data
    const encryptedFile = `${filePath}.enc`;
    await fs.writeFile(encryptedFile, Buffer.concat([iv, authTag, encrypted]));

    // Replace original with encrypted version
    await fs.unlink(filePath);
    await fs.rename(encryptedFile, filePath);

    logger.debug("Backup encrypted successfully", { filePath });
  }

  private static async decryptBackup(filePath: string): Promise<void> {
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("BACKUP_ENCRYPTION_KEY environment variable not set");
    }

    logger.debug("Decrypting backup", { filePath });

    const fileContent = await fs.readFile(filePath);

    // Extract IV, authTag, and encrypted data
    const iv = fileContent.subarray(0, 16);
    const authTag = fileContent.subarray(16, 32);
    const encrypted = fileContent.subarray(32);

    const key = crypto.scryptSync(encryptionKey, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // Write decrypted content
    const decryptedFile = `${filePath}.dec`;
    await fs.writeFile(decryptedFile, decrypted);

    // Replace encrypted with decrypted version
    await fs.unlink(filePath);
    await fs.rename(decryptedFile, filePath);

    logger.debug("Backup decrypted successfully", { filePath });
  }

  private static async uploadBackup(
    filePath: string,
    destination: string,
    metadata: BackupMetadata
  ): Promise<void> {
    logger.info("Uploading backup", { destination, filePath, backupId: metadata.id });
    // In production, upload to S3, Azure, or GCS
  }

  private static async getChangedData(since: Date): Promise<Record<string, unknown[]>> {
    // Query audit events for changes since the last backup
    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        timestamp: { gte: since },
        action: { in: ["CREATE", "UPDATE", "DELETE"] },
      },
      orderBy: { timestamp: "asc" },
    });

    // Group changes by entity type
    const changes: Record<string, unknown[]> = {};
    for (const event of auditEvents) {
      const key = event.entityType;
      if (!changes[key]) {
        changes[key] = [];
      }
      changes[key].push({
        entityId: event.entityId,
        action: event.action,
        changes: event.changes,
        timestamp: event.timestamp,
      });
    }

    return changes;
  }

  private static async getTenantData(tenantId: string): Promise<Record<string, unknown[]>> {
    // Fetch all tenant data for export
    const [items, locations, suppliers, inventoryBalances] = await Promise.all([
      prisma.item.findMany({ where: { tenantId } }),
      prisma.location.findMany({ where: { site: { tenantId } } }),
      prisma.supplier.findMany({ where: { tenantId } }),
      prisma.inventoryBalance.findMany({ where: { tenantId } }),
    ]);

    return {
      items,
      locations,
      suppliers,
      inventoryBalances,
    };
  }

  private static convertToCSV(data: Record<string, unknown[]>): string {
    const lines: string[] = [];

    for (const [tableName, records] of Object.entries(data)) {
      if (records.length === 0) continue;

      // Add table header
      lines.push(`# Table: ${tableName}`);

      // Get headers from first record
      const headers = Object.keys(records[0] as Record<string, unknown>);
      lines.push(headers.join(","));

      // Add data rows
      for (const record of records) {
        const row = headers.map((h) => {
          const value = (record as Record<string, unknown>)[h];
          if (value === null || value === undefined) return "";
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        });
        lines.push(row.join(","));
      }

      lines.push(""); // Empty line between tables
    }

    return lines.join("\n");
  }

  private static convertToSQL(data: Record<string, unknown[]>, tenantId: string): string {
    const statements: string[] = [];
    statements.push(`-- Export for tenant: ${tenantId}`);
    statements.push(`-- Generated at: ${new Date().toISOString()}`);
    statements.push("");

    for (const [tableName, records] of Object.entries(data)) {
      if (records.length === 0) continue;

      statements.push(`-- Table: ${tableName}`);

      for (const record of records) {
        const columns = Object.keys(record as Record<string, unknown>);
        const values = columns.map((col) => {
          const value = (record as Record<string, unknown>)[col];
          if (value === null || value === undefined) return "NULL";
          if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
          if (value instanceof Date) return `'${value.toISOString()}'`;
          return String(value);
        });

        statements.push(`INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`);
      }

      statements.push("");
    }

    return statements.join("\n");
  }

  private static parseCSV(content: string): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {};
    const lines = content.split("\n");

    let currentTable = "";
    let headers: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("# Table:")) {
        currentTable = trimmed.replace("# Table:", "").trim();
        result[currentTable] = [];
        headers = [];
        continue;
      }

      if (!currentTable) continue;

      if (headers.length === 0) {
        headers = trimmed.split(",");
        continue;
      }

      // Parse CSV row (simple parser, handles quoted strings)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (char === '"') {
          if (inQuotes && trimmed[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          values.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current);

      // Create record object
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      result[currentTable].push(record);
    }

    return result;
  }

  private static async executeSQLFile(filePath: string): Promise<void> {
    const sqlContent = await fs.readFile(filePath, "utf-8");
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  private static async importRecord(table: string, record: Record<string, unknown>): Promise<void> {
    // Use Prisma's dynamic model access
    const model = (prisma as Record<string, unknown>)[table];
    if (model && typeof model === "object" && "create" in model) {
      await (model as { create: (args: { data: Record<string, unknown> }) => Promise<unknown> }).create({ data: record });
    }
  }

  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
