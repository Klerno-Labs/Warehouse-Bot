/**
 * K6 Load Test - Database Stress Test
 * 
 * Spikes database writes to find performance bottlenecks.
 * 
 * Run: k6 run tests/load/database-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const writeSuccess = new Counter('db_writes_success');
const writeFailed = new Counter('db_writes_failed');
const readSuccess = new Counter('db_reads_success');
const readFailed = new Counter('db_reads_failed');
const writeLatency = new Trend('write_latency');
const readLatency = new Trend('read_latency');
const txnLatency = new Trend('transaction_latency');
const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    // Write-heavy stress test
    write_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },    // 50 writes/sec
        { duration: '2m', target: 100 },   // 100 writes/sec
        { duration: '2m', target: 200 },   // 200 writes/sec
        { duration: '2m', target: 500 },   // 500 writes/sec - spike
        { duration: '2m', target: 1000 },  // 1000 writes/sec - extreme
        { duration: '1m', target: 100 },   // Recovery
      ],
    },
    // Concurrent read/write test
    mixed_load: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      startTime: '10m',
      env: { MIX_TYPE: 'mixed' },
    },
    // Transaction stress - multiple operations in single transaction
    transaction_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '15m',
      env: { MIX_TYPE: 'transaction' },
    },
  },
  thresholds: {
    write_latency: ['p(95)<1000', 'p(99)<3000'],  // 95% writes under 1s
    read_latency: ['p(95)<200', 'p(99)<500'],     // 95% reads under 200ms
    transaction_latency: ['p(95)<2000'],          // Transactions under 2s
    errors: ['rate<0.1'],                         // Less than 10% error rate
    db_writes_success: ['count>1000'],            // At least 1000 successful writes
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

// Write operations
function performWrite() {
  const timestamp = Date.now();
  const startTime = Date.now();
  
  // Create inventory transaction (heavy write operation)
  const txnData = {
    txnType: 'ADJUSTMENT',
    itemId: `item-stress-${Math.floor(Math.random() * 100)}`,
    siteId: 'site-1',
    locationId: 'loc-1',
    qty: Math.floor(Math.random() * 100) - 50, // -50 to +50
    reason: `Stress test ${timestamp}`,
    reference: `STRESS-${timestamp}`,
  };

  const res = http.post(
    `${BASE_URL}/api/txns`,
    JSON.stringify(txnData),
    { headers: getHeaders(), tags: { name: 'WriteTransaction' } }
  );

  writeLatency.add(Date.now() - startTime);

  const success = check(res, {
    'write returns success': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    writeSuccess.add(1);
    errorRate.add(0);
  } else {
    writeFailed.add(1);
    errorRate.add(1);
  }

  return success;
}

// Read operations
function performRead() {
  const startTime = Date.now();
  
  // Read inventory balances (heavy read operation with aggregation)
  const res = http.get(
    `${BASE_URL}/api/inventory/balances?limit=100&includeZero=true`,
    { headers: getHeaders(), tags: { name: 'ReadBalances' } }
  );

  readLatency.add(Date.now() - startTime);

  const success = check(res, {
    'read returns 200': (r) => r.status === 200,
    'read returns data': (r) => {
      try {
        return JSON.parse(r.body) !== null;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    readSuccess.add(1);
    errorRate.add(0);
  } else {
    readFailed.add(1);
    errorRate.add(1);
  }

  return success;
}

// Complex transaction (multiple operations)
function performComplexTransaction() {
  const startTime = Date.now();
  const timestamp = Date.now();

  group('Complex Transaction', function() {
    // Step 1: Create item
    const itemRes = http.post(
      `${BASE_URL}/api/items`,
      JSON.stringify({
        sku: `STRESS-${timestamp}`,
        name: `Stress Test Item ${timestamp}`,
        description: 'Load test item',
        category: 'STRESS_TEST',
        unitOfMeasure: 'EA',
      }),
      { headers: getHeaders(), tags: { name: 'CreateItem' } }
    );

    if (itemRes.status !== 201) {
      errorRate.add(1);
      return;
    }

    // Step 2: Add inventory
    const receiptRes = http.post(
      `${BASE_URL}/api/txns`,
      JSON.stringify({
        txnType: 'RECEIPT',
        itemSku: `STRESS-${timestamp}`,
        siteId: 'site-1',
        locationId: 'loc-1',
        qty: 1000,
        reference: `RCV-${timestamp}`,
      }),
      { headers: getHeaders(), tags: { name: 'AddInventory' } }
    );

    // Step 3: Multiple adjustments
    for (let i = 0; i < 5; i++) {
      http.post(
        `${BASE_URL}/api/txns`,
        JSON.stringify({
          txnType: 'ADJUSTMENT',
          itemSku: `STRESS-${timestamp}`,
          siteId: 'site-1',
          locationId: 'loc-1',
          qty: -10,
          reason: `Adjustment ${i + 1}`,
        }),
        { headers: getHeaders(), tags: { name: 'Adjustment' } }
      );
    }

    // Step 4: Verify balance
    const balanceRes = http.get(
      `${BASE_URL}/api/inventory/balances?itemSku=STRESS-${timestamp}`,
      { headers: getHeaders(), tags: { name: 'VerifyBalance' } }
    );

    check(balanceRes, {
      'transaction completed': (r) => r.status === 200,
    });
  });

  txnLatency.add(Date.now() - startTime);
  errorRate.add(0);
}

// Bulk write test
function performBulkWrite() {
  const startTime = Date.now();
  const timestamp = Date.now();

  // Bulk create items
  const items = [];
  for (let i = 0; i < 50; i++) {
    items.push({
      sku: `BULK-${timestamp}-${i}`,
      name: `Bulk Item ${i}`,
      description: 'Bulk test item',
      category: 'BULK_TEST',
      unitOfMeasure: 'EA',
    });
  }

  const res = http.post(
    `${BASE_URL}/api/items/bulk`,
    JSON.stringify({ items }),
    { headers: getHeaders(), tags: { name: 'BulkCreate' } }
  );

  writeLatency.add(Date.now() - startTime);

  const success = check(res, {
    'bulk write returns success': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    writeSuccess.add(50);
    errorRate.add(0);
  } else {
    writeFailed.add(50);
    errorRate.add(1);
  }
}

export default function() {
  const mixType = __ENV.MIX_TYPE || 'write';

  if (mixType === 'mixed') {
    // 70% reads, 30% writes
    if (Math.random() < 0.7) {
      performRead();
    } else {
      performWrite();
    }
  } else if (mixType === 'transaction') {
    performComplexTransaction();
  } else {
    // Write-heavy by default
    if (Math.random() < 0.1) {
      performBulkWrite();
    } else {
      performWrite();
    }
  }

  // Small delay between operations
  sleep(Math.random() * 0.5);
}

export function setup() {
  console.log('Starting database stress test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Warm up connection pool
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/api/inventory/balances?limit=1`, { headers: getHeaders() });
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Database stress test completed in ${duration.toFixed(2)} seconds`);
}
