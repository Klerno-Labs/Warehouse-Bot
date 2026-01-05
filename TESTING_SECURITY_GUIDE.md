# Testing & Security Guide

## Overview

This document describes the comprehensive testing and security infrastructure for the Warehouse Builder application.

## Test Structure

```
tests/
├── unit/                   # Business logic unit tests
│   └── inventory.test.ts   # Inventory calculations, validation
├── integration/            # API integration tests
│   └── api.test.ts         # Mocked database tests
├── chaos/                  # Resilience & failure tests
│   └── resilience.test.ts  # DB failures, crash recovery
├── security/               # Security tests (OWASP)
│   └── owasp.test.ts       # SQL injection, XSS, auth tests
├── load/                   # K6 load/stress tests
│   ├── order-flow.js       # End-to-end order flow
│   ├── database-stress.js  # DB write spikes
│   └── api-flood.js        # API rate limit testing
├── validation.test.ts      # Input validation tests
└── setup.ts                # Test configuration
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:chaos       # Chaos/resilience tests
npm run test:security    # Security tests

# Watch mode (during development)
npm run test:watch

# With coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
```

### Load Testing with K6

K6 must be installed separately: https://k6.io/docs/get-started/installation/

```bash
# Set environment variables
set BASE_URL=http://localhost:3000
set AUTH_TOKEN=your-auth-token

# Run load tests
k6 run tests/load/order-flow.js          # Full order flow stress test
k6 run tests/load/database-stress.js     # Database stress test
k6 run tests/load/api-flood.js           # API flood test

# Run with specific scenarios
k6 run --env SCENARIO=smoke tests/load/order-flow.js
k6 run --env SCENARIO=stress tests/load/order-flow.js
k6 run --env SCENARIO=spike tests/load/order-flow.js
```

## Test Coverage

| Suite | Tests | Coverage |
|-------|-------|----------|
| Unit Tests | 45 | Business logic, calculations |
| Integration | 23 | API endpoints, database ops |
| Validation | 46 | Input sanitization, formats |
| Chaos | 24 | Failure scenarios, recovery |
| Security | 62 | OWASP Top 10, auth, RBAC |
| **Total** | **200** | Full coverage |

## Security Testing

### OWASP Top 10 Coverage

1. **Broken Access Control** ✅
   - Tenant isolation tests
   - Object-level authorization (BOLA)
   - RBAC enforcement

2. **Cryptographic Failures** ✅
   - Password strength validation
   - Secure session tokens

3. **Injection** ✅
   - SQL injection prevention (10+ payloads tested)
   - XSS prevention (15+ payloads tested)

4. **Insecure Design** ✅
   - Rate limiting tests
   - Input bounds validation

5. **Security Misconfiguration** ✅
   - Content-Type enforcement
   - Cookie security (SameSite, HttpOnly, Secure)

6. **Vulnerable Components** ⚠️
   - npm audit integrated
   - 7 moderate vulnerabilities (dev deps)
   - 1 critical (jsPDF - mitigated by input validation)

7. **Authentication Failures** ✅
   - Password policy enforcement
   - Session validation
   - Email header injection prevention

8. **Software/Data Integrity** ✅
   - Transaction integrity tests
   - Rollback verification

9. **Logging/Monitoring Failures** ✅
   - Audit trail tests
   - Error logging

10. **SSRF** ✅
    - URL validation
    - External service controls

### Running Security Audit

```bash
# npm dependency audit
npm run security:audit

# Full security test suite
npm run test:security
```

## Load Test Scenarios

### Order Flow Test (`order-flow.js`)

Simulates complete order lifecycle:
1. Check inventory availability
2. Create sales order
3. Allocate inventory
4. Pick order
5. Pack order
6. Ship order
7. Verify order status

**Scenarios:**
- **Smoke**: 5 VUs, 1 minute
- **Load**: Ramp to 100 VUs, 17 minutes
- **Stress**: Ramp to 1000 VUs, 12 minutes
- **Spike**: Instant 1000 VU spikes

**Thresholds:**
- 95% requests under 2s
- 99% requests under 5s
- Error rate < 10%

### Database Stress Test (`database-stress.js`)

Tests database under write pressure:
- Write stress: Up to 1000 writes/sec
- Mixed read/write: 70/30 ratio
- Transaction stress: Complex multi-operation transactions

**Thresholds:**
- 95% writes under 1s
- 95% reads under 200ms
- Error rate < 10%

### API Flood Test (`api-flood.js`)

Tests rate limiting and API resilience:
- Constant: 1000 requests/sec for 5 minutes
- Burst: Up to 3000 requests/sec spikes

**Thresholds:**
- 90% responses under 1s
- Error rate < 20%
- Rate limiting should activate

## Chaos Testing

### Failure Scenarios Tested

1. **Database Connection Failures**
   - Connection timeout
   - Connection refused
   - Mid-query disconnect
   - Connection pool exhaustion

2. **Transaction Failures**
   - Transaction timeout
   - Deadlock detection
   - Partial rollback

3. **Service Crashes**
   - Crash during inventory update
   - Crash during order creation

4. **Network Failures**
   - DNS resolution failure
   - Network partition
   - SSL handshake failure

5. **Resource Exhaustion**
   - File descriptor exhaustion
   - Disk space exhaustion

### Recovery Mechanisms

1. **Retry Logic**: Automatic retry with exponential backoff for transient failures
2. **Circuit Breaker**: Opens after 5 consecutive failures, prevents cascade
3. **Graceful Degradation**: Falls back to cached data when database unavailable

## Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run test:all
      - run: npm run test:coverage
      
      # Security audit
      - run: npm audit --audit-level=high
      
      # Upload coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  load-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/order-flow.js
          flags: --vus 10 --duration 30s
```

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API Response (p95) | < 200ms | TBD |
| API Response (p99) | < 500ms | TBD |
| Order Creation | < 500ms | TBD |
| Inventory Check | < 100ms | TBD |
| Concurrent Users | 1000+ | TBD |

### Running Benchmarks

```bash
# Quick benchmark
k6 run --vus 50 --duration 1m tests/load/order-flow.js

# Full stress test
k6 run tests/load/order-flow.js
```

## Known Vulnerabilities

### Currently Tracked

| Package | Severity | Status | Notes |
|---------|----------|--------|-------|
| jspdf | Critical | Mitigated | Path traversal - inputs validated |
| esbuild | Moderate | Acceptable | Dev dependency only |
| vitest | Moderate | Acceptable | Dev dependency only |

### Mitigation Strategies

1. **jsPDF Path Traversal**: All file paths are generated server-side, no user input in file operations
2. **Development Tools**: esbuild/vitest vulnerabilities only affect local development, not production

## Recommendations

### For Production Deployment

1. ✅ Enable rate limiting middleware
2. ✅ Enable CORS with strict origin policy
3. ✅ Use HTTPS only
4. ✅ Set secure cookie flags
5. ✅ Enable CSP headers
6. ⚠️ Update jsPDF to v4 when stable
7. ⚠️ Monitor vitest updates for security fixes

### For Ongoing Security

1. Run `npm audit` weekly
2. Update dependencies monthly
3. Run full test suite on every PR
4. Run load tests before major releases
5. Review security tests quarterly
