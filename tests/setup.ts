/**
 * Test Setup & Utilities
 *
 * Provides test infrastructure for unit, integration, and load testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/server/prisma";

/**
 * Global test setup
 */
beforeAll(async () => {
  // Ensure database is accessible
  await prisma.$connect();
});

/**
 * Global test teardown
 */
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});

/**
 * Test data cleanup between tests
 */
export async function cleanupTestData() {
  // Delete test data in reverse order of dependencies
  const tables = [
    "auditEvent",
    "inventoryEvent",
    "inventoryBalance",
    "receiptLine",
    "receipt",
    "purchaseOrderLine",
    "purchaseOrder",
    "productionOrderLine",
    "productionOrder",
    "bomComponent",
    "bom",
    "cycleCountLine",
    "cycleCount",
    "jobLine",
    "job",
    "item",
    "location",
    "supplier",
    "site",
    "user",
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table].deleteMany({
        where: {
          OR: [
            { tenantId: { contains: "test_" } },
            { email: { contains: "@test.local" } },
          ],
        },
      });
    } catch (error) {
      // Table might not exist or be empty
    }
  }
}

/**
 * Create test tenant
 */
export async function createTestTenant(id?: string) {
  const tenantId = id || `test_tenant_${Date.now()}`;

  return {
    id: tenantId,
    name: `Test Tenant ${tenantId}`,
  };
}

/**
 * Create test user
 */
export async function createTestUser(overrides?: any) {
  const timestamp = Date.now();

  const user = await prisma.user.create({
    data: {
      email: overrides?.email || `test_user_${timestamp}@test.local`,
      firstName: overrides?.firstName || "Test",
      lastName: overrides?.lastName || "User",
      password: overrides?.password || "$2b$12$testhashedpassword",
      tenantId: overrides?.tenantId || `test_tenant_${timestamp}`,
      siteIds: overrides?.siteIds || [`test_site_${timestamp}`],
      role: overrides?.role || "Admin",
      ...overrides,
    },
  });

  return user;
}

/**
 * Create test site
 */
export async function createTestSite(tenantId: string, overrides?: any) {
  const timestamp = Date.now();

  const site = await prisma.site.create({
    data: {
      tenantId,
      name: overrides?.name || `Test Site ${timestamp}`,
      code: overrides?.code || `TS${timestamp}`,
      address: overrides?.address || "123 Test St",
      city: overrides?.city || "Test City",
      state: overrides?.state || "TS",
      postalCode: overrides?.postalCode || "12345",
      country: overrides?.country || "Test Country",
      ...overrides,
    },
  });

  return site;
}

/**
 * Create test item
 */
export async function createTestItem(tenantId: string, overrides?: any) {
  const timestamp = Date.now();

  const item = await prisma.item.create({
    data: {
      tenantId,
      sku: overrides?.sku || `TEST-${timestamp}`,
      name: overrides?.name || `Test Item ${timestamp}`,
      description: overrides?.description || "Test item description",
      category: overrides?.category || "Test",
      unitOfMeasure: overrides?.unitOfMeasure || "EA",
      costBase: overrides?.costBase || 10.0,
      avgCostBase: overrides?.avgCostBase || 10.0,
      lastCostBase: overrides?.lastCostBase || 10.0,
      reorderPointBase: overrides?.reorderPointBase || 10,
      reorderQtyBase: overrides?.reorderQtyBase || 100,
      ...overrides,
    },
  });

  return item;
}

/**
 * Create test inventory balance
 */
export async function createTestBalance(
  itemId: string,
  siteId: string,
  locationId: string,
  tenantId: string,
  qtyBase: number = 100
) {
  const balance = await prisma.inventoryBalance.create({
    data: {
      itemId,
      siteId,
      locationId,
      tenantId,
      qtyBase,
      unitOfMeasure: "EA",
    },
  });

  return balance;
}

/**
 * Create test location
 */
export async function createTestLocation(siteId: string, tenantId: string, overrides?: any) {
  const timestamp = Date.now();

  const location = await prisma.location.create({
    data: {
      siteId,
      tenantId,
      name: overrides?.name || `Test Location ${timestamp}`,
      code: overrides?.code || `TL${timestamp}`,
      type: overrides?.type || "STORAGE",
      ...overrides,
    },
  });

  return location;
}

/**
 * Mock Request helper
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  cookies?: Record<string, string>;
}): Request {
  const {
    method = "GET",
    url = "http://localhost:3000/api/test",
    headers = {},
    body,
    cookies = {},
  } = options;

  const requestHeaders = new Headers(headers);

  // Add cookies as header
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    requestHeaders.set("cookie", cookieString);
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
    requestHeaders.set("content-type", "application/json");
  }

  return new Request(url, requestInit);
}

/**
 * Extract JSON from Response
 */
export async function getResponseJSON(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return { _raw: text };
  }
}

/**
 * Performance timing helper
 */
export class TestTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  assert(maxMs: number, message?: string): void {
    const elapsed = this.elapsed();
    if (elapsed > maxMs) {
      throw new Error(
        message || `Performance assertion failed: ${elapsed}ms > ${maxMs}ms`
      );
    }
  }
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = "Condition not met" } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${message} (timeout after ${timeout}ms)`);
}

/**
 * Generate random test data
 */
export const TestDataGenerators = {
  randomString(length: number = 10): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  },

  randomNumber(min: number = 0, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomEmail(): string {
    return `test_${this.randomString()}@test.local`;
  },

  randomSKU(): string {
    return `TEST-${this.randomString(8).toUpperCase()}`;
  },

  randomIPAddress(): string {
    return `192.168.${this.randomNumber(1, 255)}.${this.randomNumber(1, 255)}`;
  },
};

/**
 * Assert error with specific code
 */
export function assertError(error: any, expectedCode: string): void {
  if (!error) {
    throw new Error("Expected error but got none");
  }

  if (error.code !== expectedCode) {
    throw new Error(`Expected error code ${expectedCode} but got ${error.code}`);
  }
}

/**
 * Assert response status
 */
export function assertStatus(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}`
    );
  }
}

/**
 * Load test runner
 */
export async function runLoadTest(options: {
  name: string;
  fn: () => Promise<void>;
  concurrency: number;
  iterations: number;
  warmup?: number;
}): Promise<{
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successCount: number;
  failureCount: number;
  throughput: number;
}> {
  const { name, fn, concurrency, iterations, warmup = 0 } = options;

  console.log(`\n🔥 Load Test: ${name}`);
  console.log(`Concurrency: ${concurrency}, Iterations: ${iterations}`);

  // Warmup
  if (warmup > 0) {
    console.log(`Warming up (${warmup} iterations)...`);
    for (let i = 0; i < warmup; i++) {
      await fn();
    }
  }

  const times: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  const startTime = Date.now();

  // Run load test
  const batches = Math.ceil(iterations / concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, iterations - batch * concurrency);

    const promises = Array.from({ length: batchSize }, async () => {
      const iterationStart = Date.now();

      try {
        await fn();
        const iterationTime = Date.now() - iterationStart;
        times.push(iterationTime);
        successCount++;
      } catch (error) {
        failureCount++;
        console.error("Load test iteration failed:", error);
      }
    });

    await Promise.all(promises);

    // Progress update
    const completed = (batch + 1) * concurrency;
    const progress = Math.min(100, Math.floor((completed / iterations) * 100));
    process.stdout.write(`\rProgress: ${progress}% (${completed}/${iterations})`);
  }

  const totalTime = Date.now() - startTime;

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const throughput = (successCount / totalTime) * 1000; // requests per second

  console.log(`\n\n📊 Results:`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Avg Time: ${avgTime.toFixed(2)}ms`);
  console.log(`Min Time: ${minTime}ms`);
  console.log(`Max Time: ${maxTime}ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
  console.log(`Success: ${successCount}, Failures: ${failureCount}`);

  return {
    totalTime,
    avgTime,
    minTime,
    maxTime,
    successCount,
    failureCount,
    throughput,
  };
}
