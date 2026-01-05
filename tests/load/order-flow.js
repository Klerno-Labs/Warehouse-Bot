/**
 * K6 Load Test - Complete Order Flow Stress Test
 * 
 * Simulates thousands of customers ordering products,
 * from inventory check through shipping.
 * 
 * Run: k6 run tests/load/order-flow.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const orderCreated = new Counter('orders_created');
const orderFailed = new Counter('orders_failed');
const inventoryCheckTime = new Trend('inventory_check_time');
const orderCreationTime = new Trend('order_creation_time');
const shipmentTime = new Trend('shipment_time');
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - light load
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      startTime: '0s',
      gracefulStop: '10s',
    },
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '1m', // Start after smoke test
      gracefulStop: '30s',
    },
    // Stress test - push limits
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },  // Ramp up aggressively
        { duration: '3m', target: 500 },  // Push to 500 users
        { duration: '2m', target: 1000 }, // Spike to 1000 users
        { duration: '5m', target: 1000 }, // Hold at peak
        { duration: '2m', target: 0 },    // Recovery
      ],
      startTime: '17m', // Start after load test
      gracefulStop: '60s',
    },
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 }, // Instant spike
        { duration: '1m', target: 1000 },  // Hold spike
        { duration: '10s', target: 0 },    // Instant drop
        { duration: '30s', target: 0 },    // Recovery time
        { duration: '10s', target: 1000 }, // Another spike
        { duration: '1m', target: 1000 },  // Hold
        { duration: '10s', target: 0 },    // Drop
      ],
      startTime: '29m', // Start after stress test
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.1'],                    // Less than 10% failure rate
    errors: ['rate<0.05'],                            // Less than 5% error rate
    orders_created: ['count>100'],                    // At least 100 orders created
    inventory_check_time: ['p(95)<500'],              // Inventory check under 500ms
    order_creation_time: ['p(95)<1000'],              // Order creation under 1s
  },
};

// Test data
const products = new SharedArray('products', function() {
  return [
    { sku: 'TEST-001', name: 'Widget A', price: 25.99 },
    { sku: 'TEST-002', name: 'Widget B', price: 49.99 },
    { sku: 'TEST-003', name: 'Gadget X', price: 99.99 },
    { sku: 'TEST-004', name: 'Gadget Y', price: 149.99 },
    { sku: 'TEST-005', name: 'Premium Z', price: 299.99 },
  ];
});

const customers = new SharedArray('customers', function() {
  const custs = [];
  for (let i = 0; i < 1000; i++) {
    custs.push({
      id: `CUST-${String(i).padStart(4, '0')}`,
      name: `Customer ${i}`,
      email: `customer${i}@test.com`,
    });
  }
  return custs;
});

// Helper functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomQty() {
  return Math.floor(Math.random() * 10) + 1;
}

// Main test function
export default function() {
  const customer = randomItem(customers);
  const product = randomItem(products);
  const qty = randomQty();

  group('Complete Order Flow', function() {
    // Step 1: Check inventory availability
    group('1. Check Inventory', function() {
      const startTime = Date.now();
      
      const inventoryRes = http.get(
        `${BASE_URL}/api/inventory/balances?itemSku=${product.sku}`,
        { headers: getHeaders(), tags: { name: 'CheckInventory' } }
      );

      inventoryCheckTime.add(Date.now() - startTime);

      const inventoryOk = check(inventoryRes, {
        'inventory check returns 200': (r) => r.status === 200,
        'inventory data returned': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data && typeof data === 'object';
          } catch {
            return false;
          }
        },
      });

      if (!inventoryOk) {
        errorRate.add(1);
        return; // Skip rest if inventory check fails
      }
      errorRate.add(0);
    });

    // Step 2: Create sales order
    let orderId;
    group('2. Create Order', function() {
      const startTime = Date.now();

      const orderData = {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        lines: [{
          itemSku: product.sku,
          itemName: product.name,
          qty: qty,
          unitPrice: product.price,
        }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
        },
      };

      const orderRes = http.post(
        `${BASE_URL}/api/sales/orders`,
        JSON.stringify(orderData),
        { headers: getHeaders(), tags: { name: 'CreateOrder' } }
      );

      orderCreationTime.add(Date.now() - startTime);

      const orderOk = check(orderRes, {
        'order created returns 201': (r) => r.status === 201,
        'order has ID': (r) => {
          try {
            const data = JSON.parse(r.body);
            orderId = data.id;
            return !!orderId;
          } catch {
            return false;
          }
        },
      });

      if (orderOk) {
        orderCreated.add(1);
        errorRate.add(0);
      } else {
        orderFailed.add(1);
        errorRate.add(1);
        return;
      }
    });

    // Small delay to simulate processing
    sleep(0.5);

    // Step 3: Allocate inventory
    group('3. Allocate Inventory', function() {
      if (!orderId) return;

      const allocateRes = http.post(
        `${BASE_URL}/api/sales/orders/${orderId}/allocate`,
        null,
        { headers: getHeaders(), tags: { name: 'AllocateInventory' } }
      );

      check(allocateRes, {
        'allocation returns 200': (r) => r.status === 200 || r.status === 201,
      });
    });

    // Step 4: Pick order (create pick list)
    group('4. Pick Order', function() {
      if (!orderId) return;

      const pickRes = http.post(
        `${BASE_URL}/api/sales/orders/${orderId}/pick`,
        null,
        { headers: getHeaders(), tags: { name: 'PickOrder' } }
      );

      check(pickRes, {
        'pick returns success': (r) => r.status === 200 || r.status === 201,
      });
    });

    // Step 5: Pack order
    group('5. Pack Order', function() {
      if (!orderId) return;

      const packData = {
        packages: [{
          weight: qty * 0.5,
          dimensions: { length: 10, width: 8, height: 6 },
        }],
      };

      const packRes = http.post(
        `${BASE_URL}/api/sales/orders/${orderId}/pack`,
        JSON.stringify(packData),
        { headers: getHeaders(), tags: { name: 'PackOrder' } }
      );

      check(packRes, {
        'pack returns success': (r) => r.status === 200 || r.status === 201,
      });
    });

    // Step 6: Ship order
    group('6. Ship Order', function() {
      if (!orderId) return;

      const startTime = Date.now();

      const shipData = {
        carrier: 'TEST_CARRIER',
        trackingNumber: `TRK${Date.now()}`,
      };

      const shipRes = http.post(
        `${BASE_URL}/api/sales/orders/${orderId}/ship`,
        JSON.stringify(shipData),
        { headers: getHeaders(), tags: { name: 'ShipOrder' } }
      );

      shipmentTime.add(Date.now() - startTime);

      check(shipRes, {
        'ship returns success': (r) => r.status === 200 || r.status === 201,
      });
    });

    // Step 7: Verify order status
    group('7. Verify Order Status', function() {
      if (!orderId) return;

      const statusRes = http.get(
        `${BASE_URL}/api/sales/orders/${orderId}`,
        { headers: getHeaders(), tags: { name: 'GetOrderStatus' } }
      );

      check(statusRes, {
        'status check returns 200': (r) => r.status === 200,
        'order is shipped': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.status === 'SHIPPED';
          } catch {
            return false;
          }
        },
      });
    });
  });

  // Random think time between iterations
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before the test
export function setup() {
  console.log('Setting up load test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/api/auth/me`, { headers: getHeaders() });
  
  if (healthRes.status !== 200) {
    console.warn(`Warning: API health check returned ${healthRes.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}
