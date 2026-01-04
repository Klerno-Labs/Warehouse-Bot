/**
 * Database Transaction Utilities
 * 
 * Provides transaction wrapper for multi-step database operations
 * to ensure atomicity and data consistency.
 * 
 * USAGE:
 * ```typescript
 * import { withTransaction } from "@/server/transaction";
 * 
 * const result = await withTransaction(async (tx) => {
 *   const item = await tx.item.create({ data: { ... } });
 *   const balance = await tx.inventoryBalance.create({ data: { ... } });
 *   return { item, balance };
 * });
 * ```
 */

import { prisma } from "./prisma";
import type { PrismaClient } from "@prisma/client";

// Transaction client type
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Execute operations within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;      // Maximum time to wait for transaction
    timeout?: number;      // Maximum transaction duration
    isolationLevel?: "ReadUncommitted" | "ReadCommitted" | "RepeatableRead" | "Serializable";
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,    // 5 seconds default
    timeout: options?.timeout ?? 10000,    // 10 seconds default
    isolationLevel: options?.isolationLevel,
  });
}

/**
 * Execute multiple operations in sequence within a transaction
 * Good for batch operations
 */
export async function withBatchTransaction<T>(
  operations: ((tx: TransactionClient) => Promise<T>)[],
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T[]> {
  return prisma.$transaction(async (tx) => {
    const results: T[] = [];
    for (const operation of operations) {
      results.push(await operation(tx));
    }
    return results;
  }, {
    maxWait: options?.maxWait ?? 10000,
    timeout: options?.timeout ?? 30000,
  });
}

/**
 * Retry a transaction on conflict (optimistic locking)
 */
export async function withRetryTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  maxRetries: number = 3,
  retryDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retriable error (conflict, deadlock)
      const isRetriable =
        error.code === "P2034" || // Transaction conflict
        error.code === "40001" ||  // Serialization failure
        error.message?.includes("deadlock");
      
      if (!isRetriable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelayMs * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError;
}

/**
 * Common transaction patterns
 */
export const transactionPatterns = {
  /**
   * Transfer inventory between locations
   */
  async transferInventory(
    tx: TransactionClient,
    params: {
      tenantId: string;
      siteId: string;
      itemId: string;
      fromLocationId: string;
      toLocationId: string;
      qty: number;
      userId?: string;
    }
  ) {
    const { tenantId, siteId, itemId, fromLocationId, toLocationId, qty, userId } = params;

    // Decrement source balance
    await tx.inventoryBalance.updateMany({
      where: {
        tenantId,
        itemId,
        locationId: fromLocationId,
      },
      data: {
        qtyBase: { decrement: qty },
      },
    });

    // Increment destination balance (upsert)
    await tx.inventoryBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId,
          itemId,
          locationId: toLocationId,
        },
      },
      create: {
        tenantId,
        siteId,
        itemId,
        locationId: toLocationId,
        qtyBase: qty,
      },
      update: {
        qtyBase: { increment: qty },
      },
    });

    // Create event record
    await tx.inventoryEvent.create({
      data: {
        tenantId,
        siteId,
        itemId,
        eventType: "MOVE",
        qtyEntered: qty,
        uomEntered: "EA",
        qtyBase: qty,
        fromLocationId,
        toLocationId,
        createdByUserId: userId,
      },
    });
  },

  /**
   * Receive inventory with PO update
   */
  async receiveInventory(
    tx: TransactionClient,
    params: {
      tenantId: string;
      siteId: string;
      itemId: string;
      locationId: string;
      qty: number;
      poLineId?: string;
      userId?: string;
      unitCost?: number;
    }
  ) {
    const { tenantId, siteId, itemId, locationId, qty, poLineId, userId, unitCost } = params;

    // Update or create balance
    await tx.inventoryBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId,
          itemId,
          locationId,
        },
      },
      create: {
        tenantId,
        siteId,
        itemId,
        locationId,
        qtyBase: qty,
      },
      update: {
        qtyBase: { increment: qty },
      },
    });

    // Update item's last cost if provided
    if (unitCost !== undefined) {
      await tx.item.update({
        where: { id: itemId },
        data: { lastCostBase: unitCost },
      });
    }

    // Update PO line if linked
    if (poLineId) {
      await tx.purchaseOrderLine.update({
        where: { id: poLineId },
        data: {
          qtyReceived: { increment: qty },
        },
      });
    }

    // Create event
    await tx.inventoryEvent.create({
      data: {
        tenantId,
        siteId,
        itemId,
        eventType: "RECEIVE",
        qtyEntered: qty,
        uomEntered: "EA",
        qtyBase: qty,
        toLocationId: locationId,
        referenceId: poLineId,
        createdByUserId: userId,
      },
    });
  },
};
