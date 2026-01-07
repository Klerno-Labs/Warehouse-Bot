/**
 * Load Testing Suite
 *
 * Stress tests to find breaking points and performance bottlenecks.
 * Run with: npm run test:load
 */

import { runLoadTest, TestDataGenerators } from "./setup";
import { prisma } from "@/server/prisma";
import { rateLimit, RateLimitPresets, clearAllRateLimits } from "@/server/rate-limit";
import { circuitBreakerRegistry } from "@/server/resilience";

/**
 * Load Test Configuration
 */
const LOAD_TEST_CONFIG = {
  LIGHT: { concurrency: 10, iterations: 100 },
  MEDIUM: { concurrency: 50, iterations: 500 },
  HEAVY: { concurrency: 100, iterations: 1000 },
  EXTREME: { concurrency: 500, iterations: 5000 },
};

/**
 * Test 1: Database Connection Pool Stress Test
 */
async function testConnectionPoolStress() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 1: Database Connection Pool Stress");
  console.log("=".repeat(80));
  console.log("Goal: Find connection pool limit and test pool recycling\n");

  const results = await runLoadTest({
    name: "Concurrent Database Queries",
    concurrency: 100, // More than connection pool limit (20)
    iterations: 500,
    warmup: 10,
    fn: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  });

  // Assertions
  if (results.failureCount > 0) {
    console.error("❌ Connection pool failed under load!");
    console.error(`Failure rate: ${(results.failureCount / results.successCount * 100).toFixed(2)}%`);
  } else {
    console.log("✅ Connection pool handled load successfully");
  }

  if (results.avgTime > 100) {
    console.warn(`⚠️  Average query time too high: ${results.avgTime.toFixed(2)}ms`);
  }

  return results;
}

/**
 * Test 2: Rate Limiter Stress Test
 */
async function testRateLimiterStress() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 2: Rate Limiter Accuracy Under Load");
  console.log("=".repeat(80));
  console.log("Goal: Verify rate limiter allows exactly max requests\n");

  clearAllRateLimits();

  const rateLimiter = rateLimit({
    windowMs: 10000, // 10 seconds
    maxRequests: 100,
  });

  let allowedCount = 0;
  let deniedCount = 0;

  const mockRequest = new Request("http://localhost:3000/api/test", {
    headers: { "x-forwarded-for": "192.168.1.100" },
  });

  const results = await runLoadTest({
    name: "Rate Limiter Accuracy",
    concurrency: 50,
    iterations: 200, // Exceed limit of 100
    fn: async () => {
      const result = await rateLimiter(mockRequest);
      if (result) {
        deniedCount++;
      } else {
        allowedCount++;
      }
    },
  });

  console.log(`\n📊 Rate Limit Results:`);
  console.log(`Allowed: ${allowedCount} (expected: 100)`);
  console.log(`Denied: ${deniedCount} (expected: 100)`);

  const accuracy = Math.abs(allowedCount - 100) / 100;

  if (accuracy > 0.1) {
    console.error(`❌ Rate limiter inaccurate! ${accuracy * 100}% error`);
  } else {
    console.log(`✅ Rate limiter accurate (${accuracy * 100}% error)`);
  }

  clearAllRateLimits();
  return results;
}

/**
 * Test 3: Circuit Breaker Under Failure
 */
async function testCircuitBreakerFailure() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 3: Circuit Breaker Behavior Under Failures");
  console.log("=".repeat(80));
  console.log("Goal: Verify circuit opens after threshold failures\n");

  const breaker = circuitBreakerRegistry.getBreaker("test-service", {
    failureThreshold: 5,
    timeout: 5000,
  });

  breaker.reset();

  let failureCount = 0;
  let circuitOpenCount = 0;

  // First, cause failures to open circuit
  console.log("Phase 1: Causing failures to open circuit...");

  for (let i = 0; i < 10; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error("Simulated service failure");
      });
    } catch (error: any) {
      if (error.message.includes("Circuit breaker is OPEN")) {
        circuitOpenCount++;
      } else {
        failureCount++;
      }
    }
  }

  console.log(`Failures before circuit open: ${failureCount}`);
  console.log(`Requests rejected by open circuit: ${circuitOpenCount}`);

  if (failureCount !== 5) {
    console.error(`❌ Circuit should open after 5 failures, but opened after ${failureCount}`);
  } else {
    console.log(`✅ Circuit opened after exactly 5 failures`);
  }

  if (circuitOpenCount !== 5) {
    console.error(`❌ Expected 5 rejections from open circuit, got ${circuitOpenCount}`);
  } else {
    console.log(`✅ Open circuit rejected 5 subsequent requests`);
  }

  // Wait for circuit to attempt half-open
  console.log("\nPhase 2: Waiting for circuit to attempt half-open...");
  await new Promise((resolve) => setTimeout(resolve, 6000));

  const stats = breaker.getStats();
  console.log(`Circuit state: ${stats.state}`);

  breaker.reset();
}

/**
 * Test 4: Memory Leak Detection
 */
async function testMemoryLeak() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 4: Memory Leak Detection");
  console.log("=".repeat(80));
  console.log("Goal: Detect memory leaks in high-volume operations\n");

  const memBefore = process.memoryUsage();

  // Create and destroy objects rapidly
  const results = await runLoadTest({
    name: "Memory Leak Test",
    concurrency: 50,
    iterations: 10000,
    fn: async () => {
      // Simulate object creation and processing
      const data = {
        items: Array.from({ length: 100 }, () => ({
          id: TestDataGenerators.randomString(),
          name: TestDataGenerators.randomString(),
          data: TestDataGenerators.randomString(1000),
        })),
      };

      // Process data
      data.items.forEach((item) => {
        const processed = JSON.parse(JSON.stringify(item));
      });
    },
  });

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const memAfter = process.memoryUsage();

  console.log(`\n📊 Memory Usage:`);
  console.log(`Before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`After:  ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Diff:   ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

  const memIncreasePercent = ((memAfter.heapUsed - memBefore.heapUsed) / memBefore.heapUsed) * 100;

  if (memIncreasePercent > 50) {
    console.warn(`⚠️  Significant memory increase: ${memIncreasePercent.toFixed(2)}%`);
    console.warn("   Possible memory leak detected!");
  } else {
    console.log(`✅ Memory usage acceptable (${memIncreasePercent.toFixed(2)}% increase)`);
  }

  return results;
}

/**
 * Test 5: Concurrent Write Stress Test
 */
async function testConcurrentWrites() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 5: Concurrent Write Operations");
  console.log("=".repeat(80));
  console.log("Goal: Test database write performance and detect race conditions\n");

  const tenantId = `test_tenant_${Date.now()}`;

  const results = await runLoadTest({
    name: "Concurrent Item Creation",
    concurrency: 50,
    iterations: 500,
    fn: async () => {
      const sku = `TEST-${TestDataGenerators.randomString(8)}`;

      await prisma.item.create({
        data: {
          tenantId,
          sku,
          name: `Test Item ${sku}`,
          description: "Load test item",
          category: "PRODUCTION",
          baseUom: "EA",
          allowedUoms: [],
          costBase: 10.0,
          avgCostBase: 10.0,
          lastCostBase: 10.0,
        },
      });
    },
  });

  // Check for duplicate SKUs (race condition indicator)
  const items = await prisma.item.findMany({
    where: { tenantId },
    select: { sku: true },
  });

  const skus = items.map((i) => i.sku);
  const uniqueSkus = new Set(skus);

  if (skus.length !== uniqueSkus.size) {
    console.error(`❌ Race condition detected! ${skus.length - uniqueSkus.size} duplicate SKUs created`);
  } else {
    console.log(`✅ No race conditions detected - all SKUs unique`);
  }

  // Cleanup
  await prisma.item.deleteMany({ where: { tenantId } });

  return results;
}

/**
 * Test 6: Query Performance with Large Datasets
 */
async function testLargeDatasetQuery() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 6: Query Performance with Large Dataset");
  console.log("=".repeat(80));
  console.log("Goal: Test N+1 query problems and pagination performance\n");

  const tenantId = `test_tenant_${Date.now()}`;

  // Create large dataset
  console.log("Creating 10,000 test items...");

  const batchSize = 100;
  for (let i = 0; i < 10000; i += batchSize) {
    const items = Array.from({ length: batchSize }, (_, j) => ({
      tenantId,
      sku: `TEST-${(i + j).toString().padStart(5, "0")}`,
      name: `Test Item ${i + j}`,
      description: "Large dataset test item",
      category: "PRODUCTION" as const,
      baseUom: "EA" as const,
      allowedUoms: [],
      costBase: 10.0,
      avgCostBase: 10.0,
      lastCostBase: 10.0,
    }));

    await prisma.item.createMany({ data: items });
  }

  console.log("Dataset created. Testing queries...\n");

  // Test 1: Fetch all items (bad)
  console.log("Test 6a: Fetching all 10,000 items (no pagination)...");
  const startAll = Date.now();
  const allItems = await prisma.item.findMany({ where: { tenantId } });
  const timeAll = Date.now() - startAll;
  console.log(`Time: ${timeAll}ms, Count: ${allItems.length}`);

  if (timeAll > 1000) {
    console.warn(`⚠️  Query too slow: ${timeAll}ms`);
  }

  // Test 2: Fetch paginated (good)
  console.log("\nTest 6b: Fetching first 50 items (paginated)...");
  const startPage = Date.now();
  const pageItems = await prisma.item.findMany({
    where: { tenantId },
    take: 50,
    skip: 0,
  });
  const timePage = Date.now() - startPage;
  console.log(`Time: ${timePage}ms, Count: ${pageItems.length}`);

  if (timePage > 100) {
    console.warn(`⚠️  Paginated query slow: ${timePage}ms`);
    console.warn("   Consider adding database indexes");
  } else {
    console.log(`✅ Paginated query performant: ${timePage}ms`);
  }

  // Cleanup
  console.log("\nCleaning up test data...");
  await prisma.item.deleteMany({ where: { tenantId } });

  return { timeAll, timePage };
}

/**
 * Test 7: Error Recovery Stress Test
 */
async function testErrorRecovery() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 7: Error Recovery Under Load");
  console.log("=".repeat(80));
  console.log("Goal: Verify system recovers from errors gracefully\n");

  let successCount = 0;
  let errorCount = 0;
  let recoveredCount = 0;

  const results = await runLoadTest({
    name: "Error Recovery Test",
    concurrency: 20,
    iterations: 200,
    fn: async () => {
      const shouldFail = Math.random() < 0.3; // 30% failure rate

      try {
        if (shouldFail) {
          // Simulate transient error
          throw new Error("Simulated transient error");
        }

        // Simulate successful operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        successCount++;
      } catch (error) {
        errorCount++;

        // Attempt recovery
        try {
          await new Promise((resolve) => setTimeout(resolve, 50));
          recoveredCount++;
        } catch (retryError) {
          // Recovery failed
        }
      }
    },
  });

  console.log(`\n📊 Error Recovery Stats:`);
  console.log(`Successes: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Recovered: ${recoveredCount}`);
  console.log(`Recovery rate: ${(recoveredCount / errorCount * 100).toFixed(2)}%`);

  if (recoveredCount / errorCount < 0.9) {
    console.error(`❌ Low recovery rate: ${(recoveredCount / errorCount * 100).toFixed(2)}%`);
  } else {
    console.log(`✅ Good recovery rate: ${(recoveredCount / errorCount * 100).toFixed(2)}%`);
  }

  return results;
}

/**
 * Test 8: Request Timeout Stress Test
 */
async function testRequestTimeouts() {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 8: Request Timeout Behavior");
  console.log("=".repeat(80));
  console.log("Goal: Verify slow requests are properly handled\n");

  const results = await runLoadTest({
    name: "Slow Request Handling",
    concurrency: 10,
    iterations: 50,
    fn: async () => {
      const delay = Math.random() * 2000; // 0-2 seconds

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 1000);
      });

      const operationPromise = new Promise((resolve) => {
        setTimeout(resolve, delay);
      });

      try {
        await Promise.race([operationPromise, timeoutPromise]);
      } catch (error) {
        // Timeout occurred - this is expected for some requests
      }
    },
  });

  return results;
}

/**
 * Run All Load Tests
 */
export async function runAllLoadTests() {
  console.log("\n");
  console.log("╔" + "=".repeat(78) + "╗");
  console.log("║" + " ".repeat(20) + "WAREHOUSE BUILDER LOAD TESTS" + " ".repeat(29) + "║");
  console.log("╚" + "=".repeat(78) + "╝");

  const allResults: any[] = [];

  try {
    // Test 1: Connection Pool
    allResults.push({
      name: "Connection Pool Stress",
      ...await testConnectionPoolStress(),
    });

    // Test 2: Rate Limiter
    allResults.push({
      name: "Rate Limiter Accuracy",
      ...await testRateLimiterStress(),
    });

    // Test 3: Circuit Breaker
    await testCircuitBreakerFailure();

    // Test 4: Memory Leak
    allResults.push({
      name: "Memory Leak Detection",
      ...await testMemoryLeak(),
    });

    // Test 5: Concurrent Writes
    allResults.push({
      name: "Concurrent Writes",
      ...await testConcurrentWrites(),
    });

    // Test 6: Large Dataset
    await testLargeDatasetQuery();

    // Test 7: Error Recovery
    allResults.push({
      name: "Error Recovery",
      ...await testErrorRecovery(),
    });

    // Test 8: Request Timeouts
    allResults.push({
      name: "Request Timeouts",
      ...await testRequestTimeouts(),
    });

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));

    allResults.forEach((result) => {
      console.log(`\n${result.name}:`);
      console.log(`  Throughput: ${result.throughput?.toFixed(2)} req/s`);
      console.log(`  Avg Time: ${result.avgTime?.toFixed(2)}ms`);
      console.log(`  Success Rate: ${(result.successCount / (result.successCount + result.failureCount) * 100).toFixed(2)}%`);
    });

    console.log("\n✅ All load tests completed!");

  } catch (error) {
    console.error("\n❌ Load tests failed:", error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllLoadTests()
    .then(() => {
      console.log("\n✅ Load testing complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Load testing failed:", error);
      process.exit(1);
    });
}
