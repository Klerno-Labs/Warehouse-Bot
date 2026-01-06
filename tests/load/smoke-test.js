/**
 * K6 Smoke Test - Load test for Warehouse Builder
 * 
 * Usage:
 *   Mock mode (no server needed):
 *     k6 run -e MOCK_MODE=true tests/load/smoke-test.js
 * 
 *   Against Vercel deployment:
 *     k6 run -e BASE_URL=https://your-app.vercel.app tests/load/smoke-test.js
 * 
 *   Against local server (start server first):
 *     k6 run tests/load/smoke-test.js
 * 
 * This is a lightweight test suitable for:
 * - Production smoke testing on Vercel
 * - Quick API validation
 * - Baseline performance metrics
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const healthCheckTime = new Trend('health_check_time');
const apiCallTime = new Trend('api_call_time');
const successRate = new Rate('success_rate');
const requestCount = new Counter('request_count');

// Check if running in mock mode (for testing without server)
const MOCK_MODE = __ENV.MOCK_MODE === 'true';

// Test configuration - light load for dev server
export const options = {
  scenarios: {
    // Just a simple ramp up/down
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: MOCK_MODE ? [
        { duration: '5s', target: 2 },    // Quick test in mock mode
        { duration: '5s', target: 0 },
      ] : [
        { duration: '10s', target: 5 },   // Ramp up to 5 users
        { duration: '30s', target: 5 },   // Stay at 5 users
        { duration: '10s', target: 10 },  // Ramp to 10 users
        { duration: '30s', target: 10 },  // Stay at 10
        { duration: '10s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    success_rate: ['rate>0.99'],         // 99%+ of our custom checks pass
  },
};

// BASE_URL defaults to localhost, override with -e BASE_URL=https://your-app.vercel.app

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Mock response generator for testing without server
function mockResponse(endpoint) {
  const mockResponses = {
    '/api/health': { status: 200, body: JSON.stringify({ status: 'ok', timestamp: Date.now() }) },
    '/api/dashboard/stats': { status: 200, body: JSON.stringify({ items: 100, orders: 50, alerts: 5 }) },
    '/api/inventory/items': { status: 200, body: JSON.stringify({ items: [], total: 0 }) },
    '/api/inventory/balances': { status: 200, body: JSON.stringify({ balances: [], total: 0 }) },
  };
  return mockResponses[endpoint] || { status: 200, body: '{}' };
}

// Wrapper to handle mock mode
function httpGet(url, options = {}) {
  if (MOCK_MODE) {
    const endpoint = url.replace(BASE_URL, '');
    const mock = mockResponse(endpoint);
    sleep(0.01 + Math.random() * 0.05); // Simulate 10-60ms response time
    return { status: mock.status, body: mock.body };
  }
  return http.get(url, options);
}

export default function () {
  group('Health Check', function () {
    const start = Date.now();
    const res = httpGet(`${BASE_URL}/api/health`);
    healthCheckTime.add(Date.now() - start);
    requestCount.add(1);
    
    // Health endpoint should always return 200
    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
    });
    
    // Only check body if status is 200
    if (res.status === 200) {
      check(res, {
        'health check has status field': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.status !== undefined;
          } catch {
            return false;
          }
        },
      });
    }
    successRate.add(success);
  });

  sleep(0.5);

  group('Dashboard Stats', function () {
    const start = Date.now();
    const res = httpGet(`${BASE_URL}/api/dashboard/stats`, {
      headers: { 'Content-Type': 'application/json' },
    });
    apiCallTime.add(Date.now() - start);
    requestCount.add(1);
    
    // Accept both 200 (authenticated) and 401 (unauthenticated) as valid
    const success = check(res, {
      'dashboard responds correctly': (r) => r.status === 200 || r.status === 401,
    });
    successRate.add(success);
  });

  sleep(0.5);

  group('Items List', function () {
    const start = Date.now();
    const res = httpGet(`${BASE_URL}/api/inventory/items`, {
      headers: { 'Content-Type': 'application/json' },
    });
    apiCallTime.add(Date.now() - start);
    requestCount.add(1);
    
    // Accept both 200 (authenticated) and 401 (unauthenticated) as valid
    const success = check(res, {
      'items endpoint responds correctly': (r) => r.status === 200 || r.status === 401,
    });
    successRate.add(success);
  });

  sleep(0.5);

  group('Inventory Balances', function () {
    const start = Date.now();
    const res = httpGet(`${BASE_URL}/api/inventory/balances`, {
      headers: { 'Content-Type': 'application/json' },
    });
    apiCallTime.add(Date.now() - start);
    requestCount.add(1);
    
    // Accept both 200 (authenticated) and 401 (unauthenticated) as valid
    const success = check(res, {
      'balances endpoint responds': (r) => r.status === 200 || r.status === 401,
    });
    successRate.add(success);
  });

  sleep(1);
}

export function handleSummary(data) {
  const customSuccessRate = data.metrics.success_rate?.values?.rate || 0;
  const passed = customSuccessRate >= 0.99 && data.metrics.http_req_duration.values['p(95)'] < 3000;
  
  console.log('\n' + '='.repeat(60));
  console.log('SMOKE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Custom Success Rate: ${(customSuccessRate * 100).toFixed(1)}%`);
  console.log(`HTTP Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(1)}%`);
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(0)}ms`);
  console.log(`P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms`);
  console.log('='.repeat(60));
  console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  return {};
}
