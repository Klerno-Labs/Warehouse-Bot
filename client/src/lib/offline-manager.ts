/**
 * Offline Manager
 *
 * Manages service worker registration, offline storage, and sync
 */

export interface PendingTransaction {
  id?: number;
  timestamp: Date;
  data: any;
  synced: boolean;
  retryCount: number;
}

export class OfflineManager {
  private static db: IDBDatabase | null = null;
  private static readonly DB_NAME = "WMSOfflineDB";
  private static readonly DB_VERSION = 1;

  /**
   * Register service worker
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });

        console.log("[Offline Manager] Service worker registered:", registration.scope);

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[Offline Manager] New version available");
                this.notifyUpdate();
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error("[Offline Manager] Service worker registration failed:", error);
        return null;
      }
    }

    console.warn("[Offline Manager] Service workers not supported");
    return null;
  }

  /**
   * Unregister service worker
   */
  static async unregisterServiceWorker(): Promise<boolean> {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return await registration.unregister();
    }
    return false;
  }

  /**
   * Initialize IndexedDB
   */
  static async initDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Pending transactions store
        if (!db.objectStoreNames.contains("pendingTransactions")) {
          const store = db.createObjectStore("pendingTransactions", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("timestamp", "timestamp");
          store.createIndex("synced", "synced");
        }

        // Cached data store
        if (!db.objectStoreNames.contains("cachedData")) {
          db.createObjectStore("cachedData", { keyPath: "key" });
        }

        // Offline queue store
        if (!db.objectStoreNames.contains("offlineQueue")) {
          const store = db.createObjectStore("offlineQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("type", "type");
          store.createIndex("timestamp", "timestamp");
        }
      };
    });
  }

  /**
   * Save transaction for offline sync
   */
  static async savePendingTransaction(data: any): Promise<number> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pendingTransactions", "readwrite");
      const store = transaction.objectStore("pendingTransactions");

      const record: PendingTransaction = {
        timestamp: new Date(),
        data,
        synced: false,
        retryCount: 0,
      };

      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending transactions
   */
  static async getPendingTransactions(): Promise<PendingTransaction[]> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pendingTransactions", "readonly");
      const store = transaction.objectStore("pendingTransactions");
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter for unsynced transactions
        const pending = (request.result as PendingTransaction[]).filter(tx => !tx.synced);
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark transaction as synced
   */
  static async markTransactionSynced(id: number): Promise<void> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pendingTransactions", "readwrite");
      const store = transaction.objectStore("pendingTransactions");
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.synced = true;
          store.put(data);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete synced transactions
   */
  static async deleteSyncedTransactions(): Promise<void> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("pendingTransactions", "readwrite");
      const store = transaction.objectStore("pendingTransactions");
      const request = store.openCursor();

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value as PendingTransaction;
          if (record.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache data for offline access
   */
  static async cacheData(key: string, data: any): Promise<void> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("cachedData", "readwrite");
      const store = transaction.objectStore("cachedData");

      const record = {
        key,
        data,
        timestamp: new Date(),
      };

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached data
   */
  static async getCachedData(key: string): Promise<any | null> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("cachedData", "readonly");
      const store = transaction.objectStore("cachedData");
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Request background sync
   */
  static async requestSync(tag: string): Promise<void> {
    if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Cast to extended interface that includes sync
        const syncManager = (registration as unknown as { sync?: { register: (tag: string) => Promise<void> } }).sync;
        if (syncManager) {
          await syncManager.register(tag);
          console.log(`[Offline Manager] Background sync registered: ${tag}`);
        }
      } catch (error) {
        console.error("[Offline Manager] Background sync failed:", error);
      }
    }
  }

  /**
   * Notify user of update
   */
  private static notifyUpdate(): void {
    if (confirm("A new version is available. Reload to update?")) {
      window.location.reload();
    }
  }

  /**
   * Listen for online/offline events
   */
  static setupConnectivityListeners(
    onOnline?: () => void,
    onOffline?: () => void
  ): void {
    window.addEventListener("online", () => {
      console.log("[Offline Manager] Connection restored");
      if (onOnline) onOnline();
      this.syncPendingData();
    });

    window.addEventListener("offline", () => {
      console.log("[Offline Manager] Connection lost");
      if (onOffline) onOffline();
    });
  }

  /**
   * Sync pending data when connection is restored
   */
  static async syncPendingData(): Promise<void> {
    if (!this.isOnline()) return;

    const pending = await this.getPendingTransactions();

    console.log(`[Offline Manager] Syncing ${pending.length} pending transactions`);

    for (const transaction of pending) {
      try {
        // Attempt to sync transaction
        const response = await fetch("/api/inventory/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transaction.data),
        });

        if (response.ok) {
          await this.markTransactionSynced(transaction.id!);
          console.log("[Offline Manager] Transaction synced:", transaction.id);
        } else {
          console.error("[Offline Manager] Sync failed:", response.statusText);
        }
      } catch (error) {
        console.error("[Offline Manager] Sync error:", error);
      }
    }

    // Clean up synced transactions
    await this.deleteSyncedTransactions();
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData(): Promise<void> {
    const db = await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["pendingTransactions", "cachedData", "offlineQueue"],
        "readwrite"
      );

      transaction.objectStore("pendingTransactions").clear();
      transaction.objectStore("cachedData").clear();
      transaction.objectStore("offlineQueue").clear();

      transaction.oncomplete = () => {
        console.log("[Offline Manager] All offline data cleared");
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get offline storage usage
   */
  static async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
  }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
      };
    }

    return {
      usage: 0,
      quota: 0,
      percentUsed: 0,
    };
  }
}

// Auto-initialize on load
if (typeof window !== "undefined") {
  OfflineManager.registerServiceWorker();
  OfflineManager.initDatabase();
}
