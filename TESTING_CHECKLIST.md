# Testing Checklist - Warehouse Builder

**Date:** January 14, 2026
**Version:** Post Next.js 15 Migration
**Status:** Ready for Testing

## Pre-Deployment Verification ✅

### Build & Deployment
- [x] Build completes without errors
- [x] TypeScript compilation successful
- [x] All linting checks pass
- [x] Security vulnerabilities fixed (0 remaining)
- [x] Vercel deployment live

## Critical User Flows

### 1. Authentication & Authorization

#### Login Flow
- [ ] Navigate to `/` (should show landing page or redirect to login)
- [ ] Click "Sign in" or navigate to `/login`
- [ ] Enter credentials:
  - Email: `admin@example.com`
  - Password: `password123`
- [ ] Submit form
- [ ] **Expected:** Redirect to `/modules/inventory` or dashboard
- [ ] **Verify:** User name appears in top navigation
- [ ] **Verify:** Session persists on page refresh

#### Role-Based Access
- [ ] Login as different role tiers
- [ ] **SuperAdmin:** Can access all modules
- [ ] **Executive:** Can see company-wide data
- [ ] **Admin:** Can manage departments
- [ ] **Manager:** Limited to assigned teams
- [ ] **Operator:** Can execute tasks only
- [ ] **Guest:** Read-only access

#### Logout
- [ ] Click user menu → Logout
- [ ] **Expected:** Redirect to landing page
- [ ] **Verify:** Cannot access protected routes without re-login

### 2. Inventory Management

#### View Items
- [ ] Navigate to Inventory → Items
- [ ] **Expected:** List of items loads
- [ ] **Verify:** Table displays SKU, name, quantity, location
- [ ] **Verify:** Search functionality works
- [ ] **Verify:** Filters apply correctly

#### Create Item
- [ ] Click "Add Item" button
- [ ] Fill in required fields:
  - SKU
  - Name
  - Base UOM
  - Default Location
- [ ] Submit form
- [ ] **Expected:** Success toast notification
- [ ] **Verify:** Item appears in list
- [ ] **Verify:** Item detail page accessible

#### Edit Item
- [ ] Click on an item to view details
- [ ] Click "Edit" button
- [ ] Modify fields
- [ ] Save changes
- [ ] **Expected:** Success notification
- [ ] **Verify:** Changes reflected immediately

#### Inventory Transactions
- [ ] Navigate to Inventory → Transactions
- [ ] Create new transaction:
  - Select item
  - Choose type (receipt, shipment, adjustment)
  - Enter quantity
  - Select from/to locations
- [ ] Submit
- [ ] **Expected:** Transaction recorded
- [ ] **Verify:** Balance updates correctly

### 3. Manufacturing

#### Production Orders
- [ ] Navigate to Manufacturing → Production Orders
- [ ] Create new order:
  - Select item to produce
  - Enter quantity
  - Set due date
  - Choose routing (if applicable)
- [ ] **Expected:** Order created with DRAFT status
- [ ] **Verify:** BOM components calculated

#### Release Production Order
- [ ] Open a DRAFT order
- [ ] Click "Release" button
- [ ] **Expected:** Status changes to RELEASED
- [ ] **Verify:** Materials can be consumed

#### Backflush Materials
- [ ] Open a RELEASED order
- [ ] Navigate to "Backflush" tab
- [ ] Enter quantity produced
- [ ] Select source location
- [ ] Submit
- [ ] **Expected:** Materials consumed automatically
- [ ] **Verify:** Inventory balances decrease

### 4. Quality Management

#### Create Inspection
- [ ] Navigate to Quality → Inspections
- [ ] Create new inspection:
  - Select lot or serial number
  - Choose inspection plan
  - Record measurements
  - Mark pass/fail
- [ ] Submit
- [ ] **Expected:** Inspection saved
- [ ] **Verify:** Lot status updates if failed

#### CAPA (Corrective Action)
- [ ] Navigate to Quality → CAPAs
- [ ] Create CAPA from failed inspection
- [ ] Assign to user
- [ ] Set due date
- [ ] **Expected:** CAPA created
- [ ] **Verify:** Appears in assignee's dashboard

### 5. Sales & Shipping

#### Create Sales Order
- [ ] Navigate to Sales → Orders
- [ ] Click "New Order"
- [ ] Select customer
- [ ] Add line items:
  - Select items
  - Enter quantities
  - Set prices
- [ ] Submit
- [ ] **Expected:** Order created with DRAFT status
- [ ] **Verify:** Totals calculated correctly

#### Confirm and Allocate
- [ ] Open a DRAFT order
- [ ] Click "Confirm"
- [ ] **Expected:** Status changes to CONFIRMED
- [ ] Click "Allocate"
- [ ] **Expected:** Inventory reserved
- [ ] **Verify:** Available quantities decrease

#### Pick and Pack
- [ ] Navigate to Warehouse Ops → Picking
- [ ] Select order to pick
- [ ] Scan or enter items
- [ ] Confirm picks
- [ ] **Expected:** Order moves to PACKED
- [ ] Generate packing slip
- [ ] **Verify:** PDF downloads correctly

### 6. Mobile Operator Flow

#### Job Scanning
- [ ] Navigate to `/mobile/operator` (or login at `/mobile/login`)
- [ ] **Expected:** Camera opens for scanning
- [ ] Scan job card QR code
- [ ] **Expected:** Job details display
- [ ] Mark job as complete
- [ ] **Verify:** Status updates in main app

#### Offline Mode
- [ ] Disconnect from internet
- [ ] Complete a job
- [ ] **Expected:** "Offline" indicator shows
- [ ] **Verify:** Transaction queued locally
- [ ] Reconnect to internet
- [ ] **Expected:** Transaction syncs automatically

### 7. PWA Functionality

#### Installation
- [ ] Visit app on mobile device
- [ ] **Expected:** "Install App" prompt appears
- [ ] Install to home screen
- [ ] Launch from home screen
- [ ] **Expected:** App opens in standalone mode

#### Offline Access
- [ ] Install PWA
- [ ] Go offline
- [ ] Navigate to cached pages
- [ ] **Expected:** Pages load from cache
- [ ] **Expected:** Offline page shows for uncached routes

#### Service Worker Updates
- [ ] Deploy new version
- [ ] Revisit app
- [ ] **Expected:** Update notification appears
- [ ] Refresh page
- [ ] **Expected:** New version loads

### 8. Admin Functions

#### User Management
- [ ] Navigate to Admin → Users
- [ ] Create new user:
  - Email
  - Name
  - Role
  - Department
  - Site assignments
- [ ] Save
- [ ] **Expected:** User receives welcome email
- [ ] **Verify:** User can login

#### Badge Management
- [ ] Navigate to Admin → Badges
- [ ] Assign badge to user
- [ ] Set badge number
- [ ] Activate badge
- [ ] **Expected:** Badge can be scanned
- [ ] Test deactivation
- [ ] **Expected:** Badge scanning fails

#### Department Setup
- [ ] Navigate to Admin → Departments
- [ ] Create department
- [ ] Assign users
- [ ] Set permissions
- [ ] **Expected:** Users see department-specific data

### 9. Reporting & Analytics

#### Dashboard Widgets
- [ ] Navigate to Dashboard
- [ ] **Verify:** All widgets load
- [ ] **Verify:** Charts render correctly
- [ ] **Verify:** Numbers are accurate
- [ ] Customize dashboard
- [ ] **Expected:** Layout saves

#### Export Reports
- [ ] Navigate to any report page
- [ ] Click "Export" button
- [ ] Choose format (CSV, Excel, PDF)
- [ ] **Expected:** Download starts
- [ ] Open file
- [ ] **Verify:** Data is complete and formatted correctly

### 10. Real-time Updates

#### Live Dashboard
- [ ] Open dashboard in two browser windows
- [ ] Make a change in one window (e.g., create item)
- [ ] **Expected:** Other window updates automatically
- [ ] **Verify:** No need to refresh

#### Notifications
- [ ] Trigger an event (e.g., order confirmed)
- [ ] **Expected:** Toast notification appears
- [ ] Check notification center
- [ ] **Expected:** Notification appears in list

## API Endpoint Testing

### Authentication Endpoints
```bash
# Health check (create if doesn't exist)
curl https://your-app.vercel.app/api/health

# Login
curl -X POST https://your-app.vercel.app/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"password123"}'

# Check session
curl https://your-app.vercel.app/api/auth/me \\
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Inventory Endpoints
```bash
# Get items
curl https://your-app.vercel.app/api/inventory/items \\
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Create item
curl -X POST https://your-app.vercel.app/api/inventory/items \\
  -H "Cookie: session=YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"sku":"TEST-001","name":"Test Item"}'
```

## Performance Testing

### Core Web Vitals
- [ ] Test with Lighthouse (target score > 90)
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### Load Testing
- [ ] Simulate 100 concurrent users
- [ ] Monitor response times
- [ ] Check database connection pool
- [ ] Verify no memory leaks

## Security Testing

### Authentication
- [ ] Try accessing protected routes without login
- [ ] **Expected:** Redirect to login or 401 error
- [ ] Test invalid credentials
- [ ] **Expected:** Error message, no sensitive info leaked

### Authorization
- [ ] Login as Operator
- [ ] Try accessing Admin pages
- [ ] **Expected:** 403 Forbidden or redirect

### Input Validation
- [ ] Submit forms with invalid data
- [ ] **Expected:** Validation errors shown
- [ ] Try SQL injection in search fields
- [ ] **Expected:** Input sanitized, no errors

### CSRF Protection
- [ ] Submit POST request without session
- [ ] **Expected:** Request rejected

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility Testing

- [ ] Navigate with keyboard only
- [ ] Test with screen reader
- [ ] Check color contrast ratios
- [ ] Verify ARIA labels
- [ ] Test form validation announcements

## Edge Cases

### Empty States
- [ ] View pages with no data
- [ ] **Expected:** Friendly empty state message
- [ ] **Expected:** Clear call-to-action

### Error Handling
- [ ] Simulate API failure (disconnect internet)
- [ ] **Expected:** Error message shown
- [ ] **Expected:** Retry option available

### Large Datasets
- [ ] Load page with 1000+ items
- [ ] **Expected:** Pagination or virtualization works
- [ ] **Expected:** No UI freezing

### Concurrent Users
- [ ] Two users edit same record
- [ ] **Expected:** Conflict resolution or last-write-wins
- [ ] **Expected:** No data corruption

## Regression Testing

After any code change, verify:
- [ ] No console errors
- [ ] No broken links
- [ ] All forms submit correctly
- [ ] Search still works
- [ ] Filters apply correctly
- [ ] Sorting works
- [ ] Pagination functions

## Post-Deployment Checklist

- [ ] Verify production environment variables
- [ ] Check database connection
- [ ] Verify email sending works
- [ ] Test external integrations
- [ ] Monitor error logs for 24 hours
- [ ] Check analytics for abnormal patterns

## Known Issues

### Current Limitations
1. Manifest.json returns 404 on Vercel (needs investigation)
2. Some console.log statements remain (intentional for PWA debugging)
3. Bundle size can be optimized further

### Planned Improvements
1. Implement bundle splitting for heavy components
2. Add virtualization for large lists
3. Optimize database queries with indexes
4. Add Redis caching layer

---

**Testing Team:**
- [ ] QA Engineer: ___________
- [ ] Product Manager: ___________
- [ ] Developer: ___________

**Sign-off Date:** ___________

**Notes:**
_Add any observations, bugs found, or recommendations here_
