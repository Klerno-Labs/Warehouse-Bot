# Enterprise Roadmap Part 2: Advanced Features & Implementation

## Part 7: Advanced Analytics & AI

### ✅ ALREADY IMPLEMENTED
- Basic dashboard KPIs at [app/api/dashboard/route.ts](app/api/dashboard/route.ts)
- Manufacturing analytics at [app/api/manufacturing/analytics/route.ts](app/api/manufacturing/analytics/route.ts)
- ABC analysis for inventory
- Cycle time tracking by department

### 🔨 WHAT NEEDS TO BE ADDED

#### 7.1 Demand Forecasting (HIGH PRIORITY)
**Current:** Basic forecasting skeleton at [app/modules/inventory/forecasting/page.tsx](app/modules/inventory/forecasting/page.tsx)
**Needed:** Statistical forecasting algorithms

**Implementation:**
```typescript
// Forecasting methods
enum ForecastMethod {
  MOVING_AVERAGE
  EXPONENTIAL_SMOOTHING
  LINEAR_REGRESSION
  SEASONAL_DECOMPOSITION
}

// New API endpoints
POST /api/analytics/forecast
{
  itemId: "abc123",
  method: "EXPONENTIAL_SMOOTHING",
  periods: 12, // forecast 12 periods ahead
  historicalPeriods: 24 // use last 24 periods
}

// Response
{
  forecasts: [
    { period: "2026-02", quantity: 450, confidence: 0.85 },
    { period: "2026-03", quantity: 478, confidence: 0.82 }
  ],
  accuracy: 0.87, // historical accuracy
  trend: "INCREASING"
}
```

**Files to create:**
- [server/analytics/forecasting.ts](server/analytics/forecasting.ts) - Forecasting algorithms
- [app/api/analytics/forecast/route.ts](app/api/analytics/forecast/route.ts) - Forecast API
- [app/modules/inventory/forecasting/page.tsx](app/modules/inventory/forecasting/page.tsx) - Enhanced UI with charts

**Files to modify:**
- [app/api/dashboard/route.ts](app/api/dashboard/route.ts) - Add forecast-based reorder suggestions

#### 7.2 Production Bottleneck Detection (MEDIUM PRIORITY)
**Needed:** ML-based identification of bottlenecks

**Implementation:**
```typescript
// Analyze department performance
GET /api/analytics/bottlenecks?dateRange=last30days

// Response identifies bottlenecks
{
  bottlenecks: [
    {
      department: "PLEATING",
      severity: "HIGH",
      avgWaitTime: 180, // minutes
      utilizationRate: 0.95,
      recommendation: "Add second pleating station or extend hours",
      impactedJobs: 45
    }
  ],
  departmentFlow: {
    PICKING: { avgCycleTime: 15, throughput: 120 },
    ASSEMBLY: { avgCycleTime: 45, throughput: 80 },
    PLEATING: { avgCycleTime: 120, throughput: 25 } // bottleneck!
  }
}
```

**Files to create:**
- [server/analytics/bottleneck-detection.ts](server/analytics/bottleneck-detection.ts) - Analysis logic
- [app/api/analytics/bottlenecks/route.ts](app/api/analytics/bottlenecks/route.ts) - Bottleneck API
- [app/manufacturing/analytics/bottlenecks/page.tsx](app/manufacturing/analytics/bottlenecks/page.tsx) - Visualization

#### 7.3 Custom Dashboards & Reports (MEDIUM PRIORITY)
**Needed:** User-configurable dashboards and scheduled reports

**Implementation:**
```typescript
model CustomReport {
  id          String   @id @default(cuid())
  tenantId    String
  createdBy   String
  name        String
  type        ReportType // INVENTORY, PRODUCTION, SALES, FINANCIAL, CUSTOM
  schedule    String?  // Cron expression for scheduled reports
  recipients  String[] // Email addresses
  filters     Json     // Dynamic filters
  columns     String[] // Selected columns
  chartType   String?  // BAR, LINE, PIE, TABLE

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  creator     User     @relation(fields: [createdBy], references: [id])
}
```

**Files to create:**
- [app/admin/reports/builder/page.tsx](app/admin/reports/builder/page.tsx) - Report builder UI
- [app/api/reports/generate/route.ts](app/api/reports/generate/route.ts) - Generate report
- [app/api/reports/schedule/route.ts](app/api/reports/schedule/route.ts) - Schedule reports
- [server/reports/report-engine.ts](server/reports/report-engine.ts) - Report generation logic

#### 7.4 Predictive Maintenance (LOW PRIORITY - Future)
**Needed:** Equipment maintenance scheduling based on usage

**Implementation:**
- Track equipment run hours
- Schedule maintenance at intervals
- Alert before equipment failure
- Integration with Workcell model

---

## Part 8: Batch/Wave Picking Optimization

### ✅ ALREADY IMPLEMENTED
- PickTask model with lines
- Basic picking workflow
- Location-based inventory

### 🔨 WHAT NEEDS TO BE ADDED

#### 8.1 Wave Planning (HIGH PRIORITY)
**Current:** Pick tasks created one-by-one
**Needed:** Group orders into waves for efficient picking

**Implementation:**
```typescript
model PickWave {
  id              String   @id @default(cuid())
  tenantId        String
  waveNumber      String   @unique
  status          WaveStatus // PLANNING, RELEASED, IN_PROGRESS, COMPLETED
  strategy        PickStrategy // BATCH, ZONE, DISCRETE, CLUSTER
  priority        Int      @default(5)

  releasedAt      DateTime?
  completedAt     DateTime?

  pickTasks       PickTask[]

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
}

enum PickStrategy {
  DISCRETE   // One order at a time
  BATCH      // Multiple orders, same SKU picked together
  ZONE       // Picker stays in one zone
  CLUSTER    // Pick multiple orders simultaneously
}
```

**Files to create:**
- [app/sales/waves/page.tsx](app/sales/waves/page.tsx) - Wave planning UI
- [app/api/sales/waves/route.ts](app/api/sales/waves/route.ts) - Wave CRUD
- [app/api/sales/waves/optimize/route.ts](app/api/sales/waves/optimize/route.ts) - Auto-wave planning
- [server/picking/wave-optimizer.ts](server/picking/wave-optimizer.ts) - Optimization algorithms

#### 8.2 Pick Path Optimization (MEDIUM PRIORITY)
**Needed:** Optimize picking route through warehouse

**Implementation:**
```typescript
// Calculate optimal pick path
POST /api/sales/pick-tasks/{id}/optimize-path

// Response includes ordered pick list
{
  optimizedPath: [
    { location: "A-01-02", item: "Widget A", quantity: 5 },
    { location: "A-01-05", item: "Widget B", quantity: 10 },
    { location: "B-02-01", item: "Gadget C", quantity: 3 }
  ],
  totalDistance: 450, // feet
  estimatedTime: 18 // minutes
}
```

**Files to create:**
- [server/picking/path-optimizer.ts](server/picking/path-optimizer.ts) - TSP/routing algorithm
- [app/api/sales/pick-tasks/[id]/optimize-path/route.ts](app/api/sales/pick-tasks/[id]/optimize-path/route.ts) - API endpoint

#### 8.3 Zone Picking (LOW PRIORITY)
**Needed:** Assign pickers to specific warehouse zones

**Implementation:**
- Define zones in Location model (already has zone field)
- Assign users to zones
- Split pick tasks by zone
- Consolidation station for multi-zone picks

---

## Part 9: Security & Compliance

### ✅ ALREADY IMPLEMENTED
- Session-based authentication
- Role-based access control (9 roles)
- Audit logging in [app/api/audit/route.ts](app/api/audit/route.ts)
- Tenant data isolation

### 🔨 WHAT NEEDS TO BE ADDED

#### 9.1 Granular Permissions (HIGH PRIORITY)
**Current:** Role-based only (one role per user)
**Needed:** Permission-based with fine-grained control

**Implementation:**
```typescript
model Permission {
  id          String   @id @default(cuid())
  code        String   @unique // "inventory:items:create"
  name        String
  category    String   // "Inventory", "Manufacturing", etc.
  description String?
}

model RolePermission {
  roleId       String
  permissionId String

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

// Permission codes
inventory:items:read
inventory:items:create
inventory:items:update
inventory:items:delete
inventory:balances:adjust
manufacturing:boms:create
manufacturing:production-orders:approve
purchasing:pos:create
purchasing:pos:approve
sales:orders:discount
admin:users:manage
```

**Files to create:**
- [app/admin/permissions/page.tsx](app/admin/permissions/page.tsx) - Permission management
- [app/api/permissions/route.ts](app/api/permissions/route.ts) - Permission CRUD
- [server/auth/permissions.ts](server/auth/permissions.ts) - Permission checking utilities

**Files to modify:**
- [app/api/_utils/requireAuth.ts](app/api/_utils/requireAuth.ts) - Add permission checking
- All API routes - Add permission checks

#### 9.2 Field-Level Security (MEDIUM PRIORITY)
**Needed:** Hide sensitive fields from certain roles

**Implementation:**
```typescript
// Hide cost fields from Operators
const fieldPermissions = {
  'Item.cost': ['Admin', 'Purchasing', 'Supervisor'],
  'Item.price': ['Admin', 'Sales', 'Supervisor'],
  'User.salary': ['Admin'],
  'Supplier.paymentTerms': ['Admin', 'Purchasing']
}

// API filtering
function filterFields(data, role, modelType) {
  // Remove fields user doesn't have permission to see
}
```

**Files to create:**
- [server/auth/field-permissions.ts](server/auth/field-permissions.ts) - Field-level access control
- [app/api/_utils/filterResponse.ts](app/api/_utils/filterResponse.ts) - Response filtering middleware

#### 9.3 Enhanced Audit Logging (MEDIUM PRIORITY)
**Current:** Basic audit events
**Needed:** Comprehensive activity tracking

**Enhancement:**
```typescript
model AuditEvent {
  // ... existing fields

  // Add these
  ipAddress    String?
  userAgent    String?
  before       Json?    // Old values
  after        Json?    // New values
  success      Boolean  @default(true)
  errorMessage String?
}
```

**Files to modify:**
- [server/storage.ts](server/storage.ts) - Add audit tracking to all mutations
- [app/admin/audit/page.tsx](app/admin/audit/page.tsx) - Enhanced audit viewer with before/after diff

#### 9.4 Two-Factor Authentication (LOW PRIORITY)
**Needed:** 2FA for enhanced security

**Implementation:**
- TOTP (Time-based One-Time Password) via authenticator app
- SMS backup codes
- Remember device option

**Files to create:**
- [app/api/auth/2fa/enable/route.ts](app/api/auth/2fa/enable/route.ts)
- [app/api/auth/2fa/verify/route.ts](app/api/auth/2fa/verify/route.ts)
- [app/account/security/page.tsx](app/account/security/page.tsx) - 2FA setup

#### 9.5 Data Export & GDPR Compliance (MEDIUM PRIORITY)
**Needed:** Allow users to export their data

**Implementation:**
```typescript
// Export user's data
GET /api/account/export

// Response: ZIP file with JSON files
{
  user.json,
  inventory_events.json,
  production_orders.json,
  audit_log.json
}

// Delete account (GDPR right to erasure)
DELETE /api/account
```

**Files to create:**
- [app/api/account/export/route.ts](app/api/account/export/route.ts) - Data export
- [app/api/account/delete/route.ts](app/api/account/delete/route.ts) - Account deletion
- [app/account/privacy/page.tsx](app/account/privacy/page.tsx) - Privacy controls

---

## Part 10: Integration & API Capabilities

### ✅ ALREADY IMPLEMENTED
- RESTful API endpoints (all /api routes)
- JSON response format
- Session-based authentication

### 🔨 WHAT NEEDS TO BE ADDED

#### 10.1 Public API with API Keys (HIGH PRIORITY)
**Current:** Session-based only
**Needed:** Token-based API access for integrations

**Implementation:**
```typescript
model APIKey {
  id           String   @id @default(cuid())
  tenantId     String
  name         String   // "Shopify Integration"
  key          String   @unique // Hashed
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  scopes       String[] // ["read:inventory", "write:sales"]
  rateLimit    Int      @default(1000) // Requests per hour

  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  @@index([key])
}
```

**Files to create:**
- [app/admin/api-keys/page.tsx](app/admin/api-keys/page.tsx) - API key management
- [app/api/api-keys/route.ts](app/api/api-keys/route.ts) - Create/revoke keys
- [app/api/_utils/apiKeyAuth.ts](app/api/_utils/apiKeyAuth.ts) - API key authentication middleware

**Files to modify:**
- All API routes - Support both session and API key auth

#### 10.2 Webhooks (MEDIUM PRIORITY)
**Needed:** Notify external systems of events

**Implementation:**
```typescript
model Webhook {
  id          String   @id @default(cuid())
  tenantId    String
  url         String
  events      String[] // ["inventory.item.created", "production.order.completed"]
  secret      String   // For HMAC signature
  active      Boolean  @default(true)

  deliveries  WebhookDelivery[]

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  webhookId   String
  event       String
  payload     Json
  status      Int      // HTTP status code
  attempts    Int      @default(1)
  createdAt   DateTime @default(now())

  webhook     Webhook  @relation(fields: [webhookId], references: [id])
}
```

**Files to create:**
- [app/admin/webhooks/page.tsx](app/admin/webhooks/page.tsx) - Webhook setup
- [app/api/webhooks/route.ts](app/api/webhooks/route.ts) - Webhook CRUD
- [server/webhooks/dispatcher.ts](server/webhooks/dispatcher.ts) - Event dispatcher with retry logic

#### 10.3 Pre-Built Integrations (LOW PRIORITY - Future)
**Needed:** Connect to popular platforms

**Integration Ideas:**
- **Accounting:** QuickBooks, Xero (sync inventory, POs, invoices)
- **E-commerce:** Shopify, WooCommerce (auto-create sales orders)
- **Shipping:** UPS, FedEx, USPS (rate shopping, label generation)
- **ERP:** SAP, Oracle, NetSuite (bi-directional sync)
- **Messaging:** Slack, Microsoft Teams (alerts and notifications)

**Files to create:**
- [app/admin/integrations/page.tsx](app/admin/integrations/page.tsx) - Integration marketplace
- [server/integrations/quickbooks.ts](server/integrations/quickbooks.ts) - QuickBooks connector
- [server/integrations/shopify.ts](server/integrations/shopify.ts) - Shopify connector

---

## Part 11: UX Improvements for Simplicity

### 🔨 WHAT NEEDS TO BE ADDED

#### 11.1 Guided Onboarding Wizard (HIGH PRIORITY)
**Current:** Basic onboarding tracking in Tenant model
**Needed:** Step-by-step setup wizard

**Implementation:**
```typescript
// Onboarding steps
1. Company Info (name, address, logo)
2. Facilities (add warehouses/sites)
3. Departments (customize workflow stages)
4. Users (invite team members)
5. Inventory Items (import CSV or add manually)
6. Suppliers (add vendors)
7. Go Live!

// Track progress
model Tenant {
  onboardingCompleted Boolean @default(false)
  onboardingStep      Int     @default(1)
}
```

**Files to create:**
- [app/onboarding/page.tsx](app/onboarding/page.tsx) - Wizard UI
- [app/onboarding/steps/company/page.tsx](app/onboarding/steps/company/page.tsx) - Step 1
- [app/onboarding/steps/facilities/page.tsx](app/onboarding/steps/facilities/page.tsx) - Step 2
- [app/api/onboarding/complete/route.ts](app/api/onboarding/complete/route.ts) - Mark complete

#### 11.2 In-App Help & Tooltips (MEDIUM PRIORITY)
**Needed:** Contextual help throughout the app

**Implementation:**
- Tooltip component with hover/click
- Help icon (?) next to complex fields
- Video tutorials embedded
- Search help docs from command palette (K menu)

**Files to create:**
- [client/src/components/help/Tooltip.tsx](client/src/components/help/Tooltip.tsx) - Tooltip component
- [client/src/components/help/HelpPanel.tsx](client/src/components/help/HelpPanel.tsx) - Slide-out help
- [app/help/page.tsx](app/help/page.tsx) - Help center

#### 11.3 Smart Suggestions (MEDIUM PRIORITY)
**Needed:** Proactive recommendations

**Examples:**
- "You haven't set reorder points for 45 items. Set them now?"
- "3 suppliers have >90 day lead times. Review them?"
- "Station PLEATING has been idle for 2 hours. Check equipment?"

**Files to create:**
- [server/suggestions/suggestion-engine.ts](server/suggestions/suggestion-engine.ts) - Suggestion logic
- [app/api/suggestions/route.ts](app/api/suggestions/route.ts) - Get suggestions
- [client/src/components/dashboard/SuggestionCard.tsx](client/src/components/dashboard/SuggestionCard.tsx) - Display suggestions

#### 11.4 Keyboard Shortcuts (LOW PRIORITY)
**Current:** K for search
**Needed:** More shortcuts

**Shortcuts to add:**
- N - New item/order/job (context-aware)
- R - Receive inventory
- / - Focus search
- Ctrl+S - Save everywhere
- ? - Show shortcut help

**Files to modify:**
- [client/src/hooks/useKeyboardShortcuts.ts](client/src/hooks/useKeyboardShortcuts.ts) - New hook
- [app/layout.tsx](app/layout.tsx) - Global shortcuts
- [client/src/components/help/ShortcutHelp.tsx](client/src/components/help/ShortcutHelp.tsx) - Help modal

#### 11.5 Clean Up Homepage (HIGH PRIORITY)
**Current:** Information overload on [app/page.tsx](app/page.tsx)
**Needed:** Simplified, role-based home

**New Structure:**
```tsx
<Dashboard>
  {/* Top: Critical alerts only */}
  <AlertBanner>
    <Alert severity="high">2 items below reorder point</Alert>
  </AlertBanner>

  {/* Middle: Quick actions */}
  <QuickActions role={user.role}>
    <ActionCard icon="Receive" href="/receiving" />
    <ActionCard icon="Pick" href="/picking" />
    <ActionCard icon="Produce" href="/production" />
  </QuickActions>

  {/* Bottom: Today's priorities */}
  <PriorityList role={user.role}>
    <PriorityItem>5 POs awaiting approval</PriorityItem>
    <PriorityItem>Job #2026-0008 at Pleating (45% complete)</PriorityItem>
  </PriorityList>

  {/* Everything else hidden in nav */}
</Dashboard>
```

**Files to modify:**
- [app/page.tsx](app/page.tsx) - Simplify dashboard
- [client/src/components/dashboard/AlertBanner.tsx](client/src/components/dashboard/AlertBanner.tsx) - Alert component
- [client/src/components/dashboard/QuickActions.tsx](client/src/components/dashboard/QuickActions.tsx) - Action cards

---

## Part 12: Prioritized Implementation Roadmap

Based on business impact, technical dependencies, and your requirements analysis, here's the recommended implementation sequence:

### **PHASE 1: Multi-Company Foundation (Weeks 1-3)**
**Goal:** Enable true multi-company usage

**Must-Have:**
1. ✅ Company Switcher UI
   - Add UserTenantAccess model
   - Build company dropdown in header
   - Implement /api/auth/switch-tenant endpoint
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/api/auth/switch-tenant/route.ts](app/api/auth/switch-tenant/route.ts), [client/src/components/layout/Header.tsx](client/src/components/layout/Header.tsx)

2. ✅ Per-Company Branding
   - Add branding fields to Tenant model
   - Build branding settings UI
   - Apply custom colors/logo throughout app
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/api/tenant/branding/route.ts](app/api/tenant/branding/route.ts), [app/admin/settings/page.tsx](app/admin/settings/page.tsx)

3. ✅ Enhanced Company Settings
   - Add TenantSettings model
   - Build settings management UI
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/api/tenant/settings/route.ts](app/api/tenant/settings/route.ts), [app/admin/settings/company/page.tsx](app/admin/settings/company/page.tsx)

**Success Criteria:**
- Users can switch between multiple companies
- Each company has custom branding
- Company-specific settings working

---

### **PHASE 2: Role-Based UX (Weeks 4-6)**
**Goal:** Tailor experience to each department

**Must-Have:**
1. ✅ Role-Specific Dashboards
   - Create 5 dashboards: Purchasing, Production, Inventory, QC, Sales
   - Add role-based routing in [app/page.tsx](app/page.tsx)
   - **Files:** [client/src/pages/dashboards/*.tsx](client/src/pages/dashboards) (5 files), [app/page.tsx](app/page.tsx)

2. ✅ Simplified Homepage
   - Reduce clutter on main dashboard
   - Show only relevant quick actions per role
   - Display personalized priorities
   - **Files:** [app/page.tsx](app/page.tsx), [client/src/components/dashboard/QuickActions.tsx](client/src/components/dashboard/QuickActions.tsx)

3. ✅ Enhanced Station Kiosk Mode
   - Large touch targets (60px+ buttons)
   - Auto-refresh every 30s
   - Worker clock-in/out
   - **Files:** [app/stations/[stationId]/page.tsx](app/stations/[stationId]/page.tsx), [client/src/components/stations/KioskLayout.tsx](client/src/components/stations/KioskLayout.tsx)

**Success Criteria:**
- Each role sees relevant dashboard
- Station kiosks are touch-friendly
- Homepage is clean and actionable

---

### **PHASE 3: Workflow Customization (Weeks 7-9)**
**Goal:** Let companies define their own processes

**Must-Have:**
1. ✅ Visual Workflow Builder
   - Drag-and-drop workflow designer
   - Node-based editor with React Flow
   - Template library for common workflows
   - **Files:** [app/admin/workflows/builder/page.tsx](app/admin/workflows/builder/page.tsx), [client/src/components/workflows/*.tsx](client/src/components/workflows) (3 files)

2. ✅ Custom Department Configuration
   - Add CustomDepartment and ProductionRouting models
   - Build department management UI
   - Create routing designer
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/admin/departments/page.tsx](app/admin/departments/page.tsx), [app/admin/routings/page.tsx](app/admin/routings/page.tsx)

3. ✅ Enhanced Production Board
   - Kanban-style board with drag-drop
   - Real-time updates
   - Visual progress indicators
   - **Files:** [app/manufacturing/production-board/page.tsx](app/manufacturing/production-board/page.tsx), [client/src/components/manufacturing/ProductionKanban.tsx](client/src/components/manufacturing/ProductionKanban.tsx)

**Success Criteria:**
- Companies can create custom workflows visually
- Departments are configurable per company
- Production board is interactive and real-time

---

### **PHASE 4: Traceability & Quality (Weeks 10-12)**
**Goal:** Complete quality management and traceability

**Must-Have:**
1. ✅ Lot/Serial Traceability
   - Forward/backward traceability APIs
   - Traceability report UI
   - Where-used queries
   - **Files:** [app/api/traceability/*.ts](app/api/traceability) (3 files), [app/manufacturing/traceability/page.tsx](app/manufacturing/traceability/page.tsx)

2. ✅ Quality Management System
   - Add inspection models (QualityInspection, QualityDefect)
   - Build inspection checklist designer
   - Create inspection queue and forms
   - Defect tracking and disposition
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/quality/*.tsx](app/quality) (4 files), [app/api/quality/*.ts](app/api/quality) (2 files)

3. ✅ BOM Tree Visualization
   - Recursive BOM tree component
   - Cost rollup display
   - **Files:** [client/src/components/manufacturing/BOMTreeView.tsx](client/src/components/manufacturing/BOMTreeView.tsx), [app/api/manufacturing/boms/[id]/tree/route.ts](app/api/manufacturing/boms/[id]/tree/route.ts)

**Success Criteria:**
- Full forward/backward traceability working
- Quality inspections can be performed and tracked
- Multi-level BOMs display as tree

---

### **PHASE 5: Advanced Features (Weeks 13-16)**
**Goal:** Add analytics, forecasting, and optimizations

**Should-Have:**
1. ✅ Demand Forecasting
   - Implement forecasting algorithms
   - Add forecast visualization
   - Integrate with reorder point calculations
   - **Files:** [server/analytics/forecasting.ts](server/analytics/forecasting.ts), [app/api/analytics/forecast/route.ts](app/api/analytics/forecast/route.ts), [app/modules/inventory/forecasting/page.tsx](app/modules/inventory/forecasting/page.tsx)

2. ✅ Bottleneck Detection
   - Analyze department performance
   - Identify bottlenecks with ML
   - Provide recommendations
   - **Files:** [server/analytics/bottleneck-detection.ts](server/analytics/bottleneck-detection.ts), [app/api/analytics/bottlenecks/route.ts](app/api/analytics/bottlenecks/route.ts), [app/manufacturing/analytics/bottlenecks/page.tsx](app/manufacturing/analytics/bottlenecks/page.tsx)

3. ✅ Wave Picking
   - Add PickWave model
   - Build wave planning UI
   - Implement optimization algorithms
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/sales/waves/page.tsx](app/sales/waves/page.tsx), [server/picking/wave-optimizer.ts](server/picking/wave-optimizer.ts)

4. ✅ Custom Reports
   - Add CustomReport model
   - Build report designer
   - Scheduled report execution
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/admin/reports/builder/page.tsx](app/admin/reports/builder/page.tsx), [server/reports/report-engine.ts](server/reports/report-engine.ts)

**Success Criteria:**
- Forecasting provides accurate predictions
- Bottlenecks are automatically identified
- Wave picking reduces pick time by 30%+
- Users can create custom reports

---

### **PHASE 6: Security & Integrations (Weeks 17-20)**
**Goal:** Enterprise-grade security and external integrations

**Should-Have:**
1. ✅ Granular Permissions
   - Add Permission and RolePermission models
   - Build permission management UI
   - Implement permission checks in all APIs
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/admin/permissions/page.tsx](app/admin/permissions/page.tsx), [server/auth/permissions.ts](server/auth/permissions.ts)

2. ✅ Enhanced Audit Logging
   - Add before/after values to audit log
   - Track IP address and user agent
   - Build audit diff viewer
   - **Files:** [server/storage.ts](server/storage.ts), [app/admin/audit/page.tsx](app/admin/audit/page.tsx)

3. ✅ Public API with API Keys
   - Add APIKey model
   - Build API key management UI
   - Implement token authentication
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/admin/api-keys/page.tsx](app/admin/api-keys/page.tsx), [app/api/_utils/apiKeyAuth.ts](app/api/_utils/apiKeyAuth.ts)

4. ✅ Webhooks
   - Add Webhook and WebhookDelivery models
   - Build webhook setup UI
   - Implement event dispatcher with retries
   - **Files:** [prisma/schema.prisma](prisma/schema.prisma), [app/admin/webhooks/page.tsx](app/admin/webhooks/page.tsx), [server/webhooks/dispatcher.ts](server/webhooks/dispatcher.ts)

**Success Criteria:**
- Fine-grained permissions working
- Comprehensive audit trail with diffs
- External systems can access via API
- Webhooks notify external systems reliably

---

### **PHASE 7: Polish & Onboarding (Weeks 21-24)**
**Goal:** Make the system easy to adopt

**Nice-to-Have:**
1. ✅ Guided Onboarding Wizard
   - 7-step setup wizard
   - CSV import for items/suppliers
   - Team invitation flow
   - **Files:** [app/onboarding/*.tsx](app/onboarding) (8 files)

2. ✅ In-App Help
   - Contextual tooltips
   - Embedded video tutorials
   - Help panel
   - **Files:** [client/src/components/help/*.tsx](client/src/components/help) (3 files)

3. ✅ Smart Suggestions
   - Proactive recommendations
   - Dashboard suggestion cards
   - **Files:** [server/suggestions/suggestion-engine.ts](server/suggestions/suggestion-engine.ts), [app/api/suggestions/route.ts](app/api/suggestions/route.ts)

4. ✅ Mobile PWA Optimization
   - Bottom navigation for mobile
   - Install prompt
   - Camera barcode scanning
   - **Files:** [public/manifest.json](public/manifest.json), [client/src/components/layout/MobileNav.tsx](client/src/components/layout/MobileNav.tsx)

**Success Criteria:**
- New companies onboard in <30 minutes
- Users find help without leaving app
- Mobile experience is native-like

---

## Summary: Files That Need Creation/Modification

### **New Database Models (schema.prisma):**
- UserTenantAccess (multi-company access)
- TenantSettings (company-specific settings)
- CustomDepartment, ProductionRouting, RoutingStep (custom workflows)
- QualityInspection, InspectionCheckItem, QualityDefect, DefectType (QMS)
- PickWave (wave picking)
- CustomReport (report builder)
- Permission, RolePermission (granular permissions)
- APIKey (API access)
- Webhook, WebhookDelivery (integrations)

### **New Pages (~50 pages):**
- Multi-company: Company switcher, branding settings
- Dashboards: 5 role-specific dashboards
- Workflows: Visual builder, department config, routing designer
- Quality: Inspection queue, inspection forms, defect tracking, checklist designer
- Traceability: Forward/backward trace, where-used
- Analytics: Forecasting, bottlenecks, custom reports
- Wave Picking: Wave planner, optimization
- Security: Permissions, API keys, webhooks
- Onboarding: 7-step wizard
- Help: Tooltips, help panel, shortcuts

### **New API Endpoints (~40 endpoints):**
- /api/auth/switch-tenant
- /api/tenant/branding
- /api/tenant/settings
- /api/departments
- /api/routings
- /api/quality/inspections
- /api/traceability/{forward,backward,where-used}
- /api/analytics/{forecast,bottlenecks}
- /api/sales/waves
- /api/reports/{generate,schedule}
- /api/permissions
- /api/api-keys
- /api/webhooks
- /api/suggestions

### **Enhanced Existing Features:**
- Production board → Kanban with drag-drop
- Station mode → Kiosk mode with large buttons
- Homepage → Simplified, role-based
- BOM page → Add tree visualization
- Audit log → Add before/after diff

---

## Estimated Development Effort

**Total:** ~24 weeks (6 months) for full enterprise readiness

**By Priority:**
- **Phase 1-2 (Must-Have):** 6 weeks - Multi-company + Role-based UX
- **Phase 3-4 (Must-Have):** 6 weeks - Workflows + Quality
- **Phase 5 (Should-Have):** 4 weeks - Analytics + Forecasting
- **Phase 6 (Should-Have):** 4 weeks - Security + Integrations
- **Phase 7 (Nice-to-Have):** 4 weeks - Polish + Onboarding

**Quick Win (MVP for Launch):** Focus on Phases 1-4 (12 weeks) to have a solid enterprise-ready system with:
- Multi-company support
- Role-based UX
- Custom workflows
- Quality management
- Full traceability

---

## Key Architectural Decisions

1. **Multi-Tenancy:** Keep current single-tenant-per-session approach, add UserTenantAccess for multi-company switching
2. **Workflow Engine:** Build visual designer on top of existing workflow foundation in [server/workflows.ts](server/workflows.ts)
3. **Permissions:** Migrate from role-based to permission-based gradually (backwards compatible)
4. **Mobile:** Progressive Web App (PWA) approach, not native apps
5. **Integrations:** Webhooks + API keys, pre-built connectors as future enhancement
6. **Analytics:** Server-side calculations, cache results, use background jobs for heavy processing

---

**This completes the comprehensive enterprise roadmap. All features from your analysis have been addressed and prioritized.**
