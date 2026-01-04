# Load Testing Quick Start Guide

## 🚀 Run Load Tests to Find Breaking Points

This guide will help you stress test the Warehouse Builder system to identify performance bottlenecks and breaking points.

---

## Prerequisites

1. **Database must be running**
   ```bash
   # Ensure PostgreSQL is accessible
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Environment variables set**
   ```bash
   # Required
   export SESSION_SECRET="$(openssl rand -base64 32)"
   export DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_dev?connection_limit=20"
   export NODE_ENV="development"
   ```

3. **Dependencies installed**
   ```bash
   npm install
   ```

---

## Running Load Tests

### Option 1: Run All Tests (Recommended)

```bash
# This will run all 8 load test scenarios
npm run test:load

# Or directly:
ts-node tests/load-test.ts
```

**Expected Duration:** 5-10 minutes

**Tests Included:**
1. Connection Pool Stress (100 concurrent, 500 iterations)
2. Rate Limiter Accuracy (50 concurrent, 200 iterations)
3. Circuit Breaker Behavior (10 iterations with failures)
4. Memory Leak Detection (50 concurrent, 10,000 iterations)
5. Concurrent Writes (50 concurrent, 500 iterations)
6. Large Dataset Query (10,000 items)
7. Error Recovery (20 concurrent, 200 iterations)
8. Request Timeouts (10 concurrent, 50 iterations)

---

### Option 2: Run Validation Tests

```bash
# Run input validation tests
npm test tests/validation.test.ts

# Or with Jest:
npx jest tests/validation.test.ts --verbose
```

**Expected Duration:** 1-2 minutes

**Tests Included:**
- SQL injection detection (10+ attack patterns)
- XSS prevention
- Password strength validation
- Email validation
- Pagination validation
- Date/number validation
- JSON validation

---

## Understanding Test Output

### Load Test Results

```
🔥 Load Test: Connection Pool Stress
Concurrency: 100, Iterations: 500
Warming up (10 iterations)...
Progress: 100% (500/500)

📊 Results:
Total Time: 2847ms
Avg Time: 22.45ms
Min Time: 8ms
Max Time: 156ms
Throughput: 175.62 req/s
Success: 500, Failures: 0

✅ Connection pool handled load successfully
```

**What to Look For:**
- ✅ **Success Rate:** Should be 100% or very close
- ⚠️  **Average Time:** Should be <100ms for database queries
- ❌ **Failures:** Any failures indicate issues under load

---

### Breaking Point Detection

The tests are designed to push the system beyond normal limits to find breaking points:

**1. Connection Pool Test**
- **Purpose:** Find the maximum concurrent database connections
- **Breaking Point:** If DB_CONNECTION_LIMIT=20, expect failures at >20 concurrent connections
- **Fix:** Increase DB_CONNECTION_LIMIT if failures occur

**2. Rate Limiter Test**
- **Purpose:** Verify rate limits are enforced accurately
- **Breaking Point:** Should allow exactly `maxRequests` in the time window
- **Fix:** If inaccurate (>10% error), check sliding window implementation

**3. Memory Leak Test**
- **Purpose:** Detect memory that isn't being garbage collected
- **Breaking Point:** Memory usage should increase <10% after 10,000 operations
- **Fix:** If >50% increase, investigate object retention

**4. Large Dataset Test**
- **Purpose:** Find N+1 query problems
- **Breaking Point:** Queries taking >1 second indicate missing indexes
- **Fix:** Add database indexes for frequently queried columns

---

## Common Issues & Fixes

### Issue: Connection Pool Failures

```
❌ Connection pool failed under load!
Failure rate: 15.00%
```

**Cause:** Too many concurrent connections exceeding pool limit

**Fix:**
```bash
# Increase connection limit
export DB_CONNECTION_LIMIT=50

# Or in .env
DB_CONNECTION_LIMIT=50
```

---

### Issue: Rate Limiter Inaccurate

```
❌ Rate limiter inaccurate! 15% error
Allowed: 115 (expected: 100)
Denied: 85 (expected: 100)
```

**Cause:** Race conditions in sliding window algorithm under extreme load

**Fix:** This is expected at very high concurrency. In production with Redis, accuracy improves.

**Workaround:** Increase `windowMs` or decrease concurrency if critical

---

### Issue: Memory Leak Detected

```
⚠️  Significant memory increase: 78.45%
    Possible memory leak detected!
```

**Cause:** Objects not being garbage collected

**Debug Steps:**
1. Run with `--expose-gc` flag to force garbage collection
2. Use heap profiler: `node --inspect tests/load-test.ts`
3. Check for global variables or closures retaining references

---

### Issue: Slow Query Performance

```
Test 6a: Fetching all 10,000 items (no pagination)...
Time: 4523ms, Count: 10000
⚠️  Query too slow: 4523ms
```

**Cause:** Missing database indexes or N+1 query problem

**Fix:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_inventory_event_tenant ON "InventoryEvent"("tenantId");
CREATE INDEX idx_inventory_event_tenant_created ON "InventoryEvent"("tenantId", "createdAt");
CREATE INDEX idx_item_tenant ON "Item"("tenantId");
CREATE INDEX idx_item_category ON "Item"("category");
```

---

## Stress Testing Scenarios

### Scenario 1: Maximum Throughput

**Goal:** Find the maximum requests per second the system can handle

```typescript
// Gradually increase concurrency until failures occur
const configs = [
  { concurrency: 50, iterations: 500 },
  { concurrency: 100, iterations: 1000 },
  { concurrency: 200, iterations: 2000 },
  { concurrency: 500, iterations: 5000 },
];

for (const config of configs) {
  const result = await runLoadTest({
    name: "Max Throughput Test",
    ...config,
    fn: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  });

  console.log(`${config.concurrency} concurrent: ${result.throughput} req/s`);

  if (result.failureCount > 0) {
    console.log(`Breaking point found at ${config.concurrency} concurrent connections`);
    break;
  }
}
```

---

### Scenario 2: Sustained Load

**Goal:** Test system stability under sustained load (find memory leaks)

```typescript
// Run for 10 minutes at moderate load
const startMem = process.memoryUsage().heapUsed;

for (let i = 0; i < 60; i++) {
  await runLoadTest({
    name: `Sustained Load - Minute ${i + 1}`,
    concurrency: 20,
    iterations: 100,
    fn: async () => {
      await prisma.item.findMany({ take: 50 });
    },
  });

  const currentMem = process.memoryUsage().heapUsed;
  const increase = ((currentMem - startMem) / startMem) * 100;

  console.log(`Memory increase after ${i + 1} minutes: ${increase.toFixed(2)}%`);

  if (increase > 100) {
    console.error("Memory leak detected!");
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s rest
}
```

---

### Scenario 3: Spike Test

**Goal:** Test how system handles sudden traffic spikes

```typescript
// Normal load
await runLoadTest({
  name: "Normal Load",
  concurrency: 10,
  iterations: 100,
  fn: async () => await prisma.$queryRaw`SELECT 1`,
});

// Sudden spike (10x)
await runLoadTest({
  name: "Traffic Spike",
  concurrency: 100,
  iterations: 1000,
  fn: async () => await prisma.$queryRaw`SELECT 1`,
});

// Return to normal
await runLoadTest({
  name: "Post-Spike Normal Load",
  concurrency: 10,
  iterations: 100,
  fn: async () => await prisma.$queryRaw`SELECT 1`,
});
```

---

## Production Load Testing

### Safety Precautions

⚠️  **DO NOT run load tests on production database!**

**Safe Approaches:**
1. **Staging Environment:** Replicate production data to staging
2. **Load Balancer:** Use read-only replica for read-heavy tests
3. **Off-Hours:** Run during low-traffic periods
4. **Gradual Ramp:** Start small, increase slowly

---

### Recommended Test Schedule

**Weekly:**
- Run all validation tests
- Run light load tests (LIGHT config)

**Before Each Release:**
- Run full load test suite
- Run stress tests to find new breaking points
- Document performance baselines

**Monthly:**
- Run sustained load test (1+ hours)
- Profile memory usage
- Analyze slow query logs

---

## Interpreting Results

### Good Results ✅

```
Connection Pool Stress:
  Throughput: 450 req/s
  Avg Time: 22ms
  Success Rate: 100%
  ✅ Connection pool handled load successfully

Memory Leak Test:
  Memory increase: 5.23%
  ✅ Memory usage acceptable
```

### Warning Signs ⚠️

```
Large Dataset Query:
  Time: 1250ms
  ⚠️  Query too slow: 1250ms
  ⚠️  Consider adding database indexes
```

### Critical Issues ❌

```
Concurrent Writes:
  ❌ Race condition detected! 15 duplicate SKUs created
  ❌ Connection pool failed under load! Failure rate: 25%
```

---

## Next Steps After Load Testing

1. **Document Baselines**
   - Record current performance metrics
   - Set up monitoring alerts based on baselines

2. **Fix Critical Issues**
   - Prioritize failures and race conditions
   - Add database indexes for slow queries
   - Implement missing transaction handling

3. **Optimize Bottlenecks**
   - Address N+1 query problems
   - Add caching for frequently accessed data
   - Optimize slow database queries

4. **Re-test**
   - Verify fixes improved performance
   - Update baseline metrics
   - Test at higher loads

5. **Set Up Continuous Monitoring**
   - Track query performance in production
   - Monitor circuit breaker states
   - Alert on rate limit violations

---

## Advanced: Custom Load Tests

Create your own load tests by extending the test suite:

```typescript
// tests/custom-load-test.ts
import { runLoadTest } from "./setup";
import { prisma } from "@/server/prisma";

async function testMyCustomScenario() {
  const results = await runLoadTest({
    name: "My Custom Test",
    concurrency: 50,
    iterations: 500,
    warmup: 10,
    fn: async () => {
      // Your test logic here
      const items = await prisma.item.findMany({
        where: { tenantId: "test" },
        take: 100,
      });

      // Process items
      items.forEach((item) => {
        // Do something with item
      });
    },
  });

  console.log(`Throughput: ${results.throughput} req/s`);
  console.log(`P99 Latency: ${results.maxTime}ms`);
}

testMyCustomScenario();
```

---

## Troubleshooting Test Failures

### Test Won't Run

```bash
# Check Node version (need 18+)
node --version

# Check dependencies
npm install

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check environment variables
echo $SESSION_SECRET
```

### Test Crashes

```bash
# Increase memory limit
node --max-old-space-size=4096 tests/load-test.ts

# Run with debugging
node --inspect-brk tests/load-test.ts
```

### Inconsistent Results

```bash
# Clear database between runs
npm run prisma:reset

# Clear rate limit cache
# Restart the application

# Run tests multiple times and average results
for i in {1..5}; do npm run test:load; done
```

---

## Summary

Load testing helps you:
- ✅ Find breaking points before users do
- ✅ Identify performance bottlenecks
- ✅ Detect memory leaks
- ✅ Verify rate limiting and circuit breakers work
- ✅ Establish performance baselines
- ✅ Validate database indexes
- ✅ Test error recovery mechanisms

**Run tests regularly** to catch regressions early and maintain system reliability.

---

**Happy Load Testing! 🚀**

For questions or issues, check [SYSTEM_HARDENING_COMPLETE.md](./SYSTEM_HARDENING_COMPLETE.md) for full documentation.
