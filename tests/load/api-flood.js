/**
 * K6 Load Test - API Flood Test
 * 
 * Floods APIs to find rate limiting issues and bottlenecks.
 * 
 * Run: k6 run tests/load/api-flood.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const requestSuccess = new Counter('requests_success');
const requestFailed = new Counter('requests_failed');
const responseTime = new Trend('response_time');
const errorRate = new Rate('errors');
const rateLimited = new Counter('rate_limited');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    // Constant high-rate flood
    flood: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 200,
      maxVUs: 1000,
    },
    // Burst flood - sudden spikes
    burst_flood: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '10s', target: 2000 },  // Spike to 2000 req/s
        { duration: '30s', target: 2000 },  // Hold
        { duration: '10s', target: 100 },   // Drop
        { duration: '20s', target: 100 },   // Recover
        { duration: '10s', target: 3000 },  // Even higher spike
        { duration: '30s', target: 3000 },  // Hold
        { duration: '10s', target: 100 },   // Drop
      ],
      startTime: '5m',
    },
  },
  thresholds: {
    response_time: ['p(90)<1000', 'p(95)<2000'],  // 90% under 1s
    errors: ['rate<0.2'],                          // Less than 20% error rate during flood
    rate_limited: ['count>0'],                     // Expect some rate limiting
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

// API endpoints to flood
const endpoints = [
  { method: 'GET', path: '/api/items', weight: 30 },
  { method: 'GET', path: '/api/inventory/balances', weight: 25 },
  { method: 'GET', path: '/api/sales/orders', weight: 15 },
  { method: 'GET', path: '/api/purchasing/purchase-orders', weight: 10 },
  { method: 'GET', path: '/api/manufacturing/production-orders', weight: 5 },
  { method: 'POST', path: '/api/items', weight: 5, body: () => ({
    sku: `FLOOD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Flood Test Item',
    description: 'API flood test',
    category: 'FLOOD_TEST',
    unitOfMeasure: 'EA',
  })},
  { method: 'POST', path: '/api/txns', weight: 5, body: () => ({
    txnType: 'ADJUSTMENT',
    itemId: 'item-1',
    siteId: 'site-1',
    locationId: 'loc-1',
    qty: 1,
    reason: 'Flood test',
  })},
  { method: 'GET', path: '/api/dashboard/stats', weight: 5 },
];

function selectEndpoint() {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return endpoints[0];
}

export default function() {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();

  let res;
  
  if (endpoint.method === 'GET') {
    res = http.get(url, { 
      headers: getHeaders(),
      tags: { name: endpoint.path },
    });
  } else if (endpoint.method === 'POST') {
    const body = endpoint.body ? endpoint.body() : {};
    res = http.post(url, JSON.stringify(body), { 
      headers: getHeaders(),
      tags: { name: endpoint.path },
    });
  }

  responseTime.add(Date.now() - startTime);

  // Check for rate limiting
  if (res.status === 429) {
    rateLimited.add(1);
    errorRate.add(0); // Rate limiting is expected behavior
    return;
  }

  const success = check(res, {
    'status is success': (r) => r.status >= 200 && r.status < 400,
  });

  if (success) {
    requestSuccess.add(1);
    errorRate.add(0);
  } else {
    requestFailed.add(1);
    errorRate.add(1);
    
    // Log failed requests for debugging
    if (res.status >= 500) {
      console.log(`Server error: ${res.status} on ${endpoint.path}`);
    }
  }
}

// Verify system recovers after flood
export function handleSummary(data) {
  // Recovery check
  const finalCheck = http.get(`${BASE_URL}/api/items?limit=1`, { 
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const recovered = finalCheck.status === 200;
  
  return {
    'stdout': JSON.stringify({
      summary: 'API Flood Test Results',
      totalRequests: data.metrics.http_reqs.values.count,
      successRate: ((data.metrics.requests_success?.values?.count || 0) / 
                    data.metrics.http_reqs.values.count * 100).toFixed(2) + '%',
      avgResponseTime: data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms',
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms',
      rateLimitedRequests: data.metrics.rate_limited?.values?.count || 0,
      systemRecovered: recovered,
    }, null, 2),
    'tests/load/results/api-flood-summary.json': JSON.stringify(data, null, 2),
  };
}

export function setup() {
  console.log('Starting API flood test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('WARNING: This test will generate high load!');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  console.log('API flood test completed');
  console.log('Checking system health post-flood...');
  
  // Wait for system to recover
  sleep(5);
  
  const healthCheck = http.get(`${BASE_URL}/api/items?limit=1`, { 
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });
  
  if (healthCheck.status === 200) {
    console.log('✓ System recovered successfully');
  } else {
    console.log(`✗ System may be degraded: status ${healthCheck.status}`);
  }
}
