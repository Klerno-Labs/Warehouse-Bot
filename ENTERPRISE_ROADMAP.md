# Enterprise Readmap: Warehouse Builder Enhancement Plan

## Executive Summary

Based on comprehensive analysis of your current Warehouse Builder application and the detailed requirements, this document outlines what needs to be added to make your system enterprise-ready for multiple companies with complete raw materials → finished goods workflow.

**Current State:** Your system is already mature with:
- ✅ Multi-tenant architecture with data isolation
- ✅ Bill of Materials (BOM) with component tracking
- ✅ Production Orders with consumption/output tracking
- ✅ Department-based job routing (8 departments)
- ✅ Station mode for floor operations
- ✅ Lot/batch tracking capability
- ✅ Role-based access control (9 roles)
- ✅ Barcode scanning and offline PWA support
- ✅ Workflow engine foundation

**What's Missing:** Focus areas for enterprise readiness:
- ❌ Multi-company switcher UI
- ❌ Role-based dashboard customization
- ❌ Visual workflow designer
- ❌ Enhanced mobile/station UX
- ❌ Advanced analytics and forecasting
- ❌ Quality Management System (QMS)
- ❌ Batch/wave picking optimization

---

## Part 1: Multi-Company/Multi-Tenant Enhancements

### ✅ ALREADY IMPLEMENTED
Your system already has solid multi-tenant infrastructure:
- Tenant-based data isolation via `tenantId` on all entities
- SaaS subscription management with plan tiers (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- Per-tenant usage tracking and limits
- Site-based access control (users assigned to specific sites)

### 🔨 WHAT NEEDS TO BE ADDED

#### 1.1 Company Switcher UI (HIGH PRIORITY)
**Current:** Single tenant per session
**Needed:** Allow users to switch between multiple companies they have access to

**Implementation:**
```typescript
// New model in schema.prisma
model UserTenantAccess {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      Role     // Role can differ per tenant
  isDefault Boolean  @default(false)

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([userId])
}
```

**UI Changes:**
- Replace "Warehouse Core" header with company dropdown
- Add `/api/auth/switch-tenant` endpoint
- Store selected tenant in session
- Show company logo/name in header from `Tenant.brandLogo` and `Tenant.name`

**Files to modify:**
- [prisma/schema.prisma](prisma/schema.prisma) - Add UserTenantAccess model
- [app/api/auth/switch-tenant/route.ts](app/api/auth/switch-tenant/route.ts) - New endpoint
- [client/src/components/layout/Header.tsx](client/src/components/layout/Header.tsx) - Add company switcher
- [app/api/_utils/getSessionUser.ts](app/api/_utils/getSessionUser.ts) - Support multi-tenant sessions

#### 1.2 Per-Company Branding (MEDIUM PRIORITY)
**Current:** Basic tenant info exists (name, slug)
**Needed:** Full branding customization

**Schema Enhancement:**
```typescript
// Add to Tenant model
model Tenant {
  // ... existing fields
  brandLogo        String?   // Logo URL
  brandColor       String?   // Primary color hex
  brandColorSecondary String? // Secondary color
  favicon          String?   // Custom favicon
  customCSS        String?   @db.Text // Custom styling
}
```

**Files to modify:**
- [prisma/schema.prisma](prisma/schema.prisma) - Add branding fields
- [app/api/tenant/branding/route.ts](app/api/tenant/branding/route.ts) - New endpoint for branding CRUD
- [client/src/components/layout/Layout.tsx](client/src/components/layout/Layout.tsx) - Apply custom branding
- [app/admin/settings/page.tsx](app/admin/settings/page.tsx) - Add branding configuration UI

#### 1.3 Company-Specific Settings (MEDIUM PRIORITY)
**Current:** Basic currency and locale in Tenant model
**Needed:** Expanded configuration options

**Schema Enhancement:**
```typescript
model TenantSettings {
  id                String   @id @default(cuid())
  tenantId          String   @unique

  // Regional settings
  currency          String   @default("USD")
  locale            String   @default("en-US")
  timezone          String   @default("America/New_York")
  dateFormat        String   @default("MM/DD/YYYY")

  // Business settings
  fiscalYearStart   Int      @default(1) // Month 1-12
  workWeekDays      Int[]    // [1,2,3,4,5] = Mon-Fri
  defaultUOM        String   @default("EA")

  // Workflow settings
  requirePOApproval Boolean  @default(true)
  poApprovalLimit   Decimal? @db.Decimal(15,2)
  autoReceivePos    Boolean  @default(false)

  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

**Files to create:**
- [app/api/tenant/settings/route.ts](app/api/tenant/settings/route.ts) - Settings CRUD
- [app/admin/settings/company/page.tsx](app/admin/settings/company/page.tsx) - Settings UI

---

## Part 2: Enhanced Raw Materials → Finished Goods Workflow

### ✅ ALREADY IMPLEMENTED
Excellent foundation already exists:
- BillOfMaterial with BOMComponent (multi-level BOMs supported)
- ProductionOrder with PLANNED → RELEASED → IN_PROGRESS → COMPLETED flow
- ProductionConsumption tracking (backflush and manual)
- ProductionOutput tracking with lot/serial numbers
- JobOperation with 8 departments and scan events
- ComponentScan for BOM validation during assembly

### 🔨 WHAT NEEDS TO BE ADDED

#### 2.1 Multi-Level BOM Visualization (HIGH PRIORITY)
**Current:** BOM data exists, no tree visualization
**Needed:** Visual BOM tree showing assemblies and sub-assemblies

**Implementation:**
- New component: `BOMTreeView.tsx`
- Recursive rendering of BOM structure
- Indented tree with expand/collapse
- Cost rollup display (sum of component costs)

**Files to create:**
- [client/src/components/manufacturing/BOMTreeView.tsx](client/src/components/manufacturing/BOMTreeView.tsx) - Tree visualization
- [app/api/manufacturing/boms/[id]/tree/route.ts](app/api/manufacturing/boms/[id]/tree/route.ts) - Recursive BOM fetch
- [client/src/pages/BOMDetailPage.tsx](client/src/pages/BOMDetailPage.tsx) - Add tree tab

#### 2.2 Enhanced Production Board (MEDIUM PRIORITY)
**Current:** Basic production board at [app/manufacturing/production-board/page.tsx](app/manufacturing/production-board/page.tsx)
**Needed:** Kanban-style board with drag-and-drop

**Features to add:**
- Drag jobs between departments
- Visual progress bars per job
- Color-coded by priority/status
- Real-time updates via WebSocket or polling
- Filter by product, customer, date range

**Files to modify:**
- [app/manufacturing/production-board/page.tsx](app/manufacturing/production-board/page.tsx) - Add Kanban UI
- [app/api/job-tracking/move-department/route.ts](app/api/job-tracking/move-department/route.ts) - New endpoint for drag-drop
- [client/src/components/manufacturing/ProductionKanban.tsx](client/src/components/manufacturing/ProductionKanban.tsx) - New component

#### 2.3 Lot/Serial Traceability Reports (HIGH PRIORITY)
**Current:** Lot numbers tracked in ProductionConsumption and ProductionOutput
**Needed:** Forward/backward traceability queries

**Implementation:**
```typescript
// New API endpoints
GET /api/traceability/forward?lotNumber=LOT-123
// Returns: All finished goods that used this lot

GET /api/traceability/backward?serialNumber=SN-456
// Returns: All raw materials that went into this serial

GET /api/traceability/where-used?itemId=abc&lotNumber=LOT-789
// Returns: All production orders using this item/lot
```

**Files to create:**
- [app/api/traceability/forward/route.ts](app/api/traceability/forward/route.ts)
- [app/api/traceability/backward/route.ts](app/api/traceability/backward/route.ts)
- [app/api/traceability/where-used/route.ts](app/api/traceability/where-used/route.ts)
- [app/manufacturing/traceability/page.tsx](app/manufacturing/traceability/page.tsx) - Traceability UI

---

## Part 3: Role-Based Dashboard Customization

### ✅ ALREADY IMPLEMENTED
- 9 roles defined: Admin, Supervisor, Inventory, Operator, Sales, Purchasing, Maintenance, QC, Viewer
- Role-based page access control
- Dashboard at [app/page.tsx](app/page.tsx) with inventory metrics

### 🔨 WHAT NEEDS TO BE ADDED

#### 3.1 Role-Specific Dashboards (HIGH PRIORITY)
**Current:** Same dashboard for all users
**Needed:** Tailored dashboards per role

**Implementation:**
```typescript
// New component structure
<DashboardLayout role={user.role}>
  {role === 'Purchasing' && <PurchasingDashboard />}
  {role === 'Operator' && <ProductionDashboard />}
  {role === 'Inventory' && <InventoryDashboard />}
  {role === 'QC' && <QualityDashboard />}
  {role === 'Sales' && <SalesDashboard />}
  {/* Default for Admin/Supervisor */}
  {['Admin', 'Supervisor'].includes(role) && <ExecutiveDashboard />}
</DashboardLayout>
```

**Dashboard Requirements:**

**Purchasing Dashboard:**
- POs awaiting approval
- Overdue deliveries
- Low stock items needing reorder (already exists in [app/api/dashboard/low-stock/route.ts](app/api/dashboard/low-stock/route.ts))
- Supplier performance scorecard
- Budget vs actual spend

**Production/Operator Dashboard:**
- My assigned jobs (filter by assignedTo)
- Department bottlenecks
- Material shortages blocking jobs
- Station efficiency metrics
- Quality reject rates by department

**Inventory Dashboard:**
- Receiving queue
- Picking tasks awaiting fulfillment
- Cycle count schedules
- Location accuracy metrics
- ABC analysis chart

**QC Dashboard:**
- Jobs awaiting inspection
- Failed inspections requiring review
- Defect trends by department
- Non-conformance reports (NCRs)
- Batch hold/release queue

**Files to create:**
- [client/src/pages/dashboards/PurchasingDashboard.tsx](client/src/pages/dashboards/PurchasingDashboard.tsx)
- [client/src/pages/dashboards/ProductionDashboard.tsx](client/src/pages/dashboards/ProductionDashboard.tsx)
- [client/src/pages/dashboards/InventoryDashboard.tsx](client/src/pages/dashboards/InventoryDashboard.tsx)
- [client/src/pages/dashboards/QualityDashboard.tsx](client/src/pages/dashboards/QualityDashboard.tsx)
- [client/src/pages/dashboards/SalesDashboard.tsx](client/src/pages/dashboards/SalesDashboard.tsx)

**Files to modify:**
- [app/page.tsx](app/page.tsx) - Add role-based routing

#### 3.2 Widget Customization (MEDIUM PRIORITY)
**Needed:** Drag-and-drop dashboard builder

**Implementation:**
- New model: `DashboardWidget` with user preferences
- Widget library: Charts, KPIs, Tables, Lists
- Save layout per user
- Default layouts per role

**Files to create:**
- [app/api/dashboard/widgets/route.ts](app/api/dashboard/widgets/route.ts) - Widget CRUD
- [client/src/components/dashboard/WidgetGrid.tsx](client/src/components/dashboard/WidgetGrid.tsx) - Grid layout
- [client/src/components/dashboard/WidgetLibrary.tsx](client/src/components/dashboard/WidgetLibrary.tsx) - Available widgets

---

## Part 4: Enhanced Station/Mobile UX

### ✅ ALREADY IMPLEMENTED
- Station mode at [app/stations/[stationId]/page.tsx](app/stations/[stationId]/page.tsx)
- Barcode scanning support
- Offline queue support
- Predefined stations: receiving, stockroom, pleater1, packing

### 🔨 WHAT NEEDS TO BE ADDED

#### 4.1 Station Kiosk Mode (HIGH PRIORITY)
**Current:** Station pages exist but not optimized for kiosk
**Needed:** Full-screen kiosk interface with large touch targets

**Features:**
- Large buttons (min 60px height)
- Auto-refresh every 30 seconds
- Screensaver mode after 5 minutes idle
- Worker clock-in/out via badge scan
- Hide navigation/header in kiosk mode

**Files to modify:**
- [app/stations/[stationId]/page.tsx](app/stations/[stationId]/page.tsx) - Add kiosk mode toggle
- [client/src/components/stations/KioskLayout.tsx](client/src/components/stations/KioskLayout.tsx) - New layout component
- [app/api/stations/clock-in/route.ts](app/api/stations/clock-in/route.ts) - Time tracking endpoint

#### 4.2 Voice-Guided Picking (LOW PRIORITY - Future)
**Needed:** Text-to-speech instructions for hands-free operation

**Implementation:**
- Use Web Speech API
- Read picking instructions aloud
- Voice confirmation of picks
- Hands-free for gloved workers

#### 4.3 Mobile Progressive Web App (MEDIUM PRIORITY)
**Current:** Some responsive design, but not fully mobile-optimized
**Needed:** Native app-like experience

**Features:**
- Install prompt on mobile
- Bottom navigation for thumb-friendly use
- Swipe gestures
- Camera integration for barcode scanning
- Haptic feedback

**Files to modify:**
- [public/manifest.json](public/manifest.json) - Update manifest for install prompt
- [client/src/components/layout/MobileNav.tsx](client/src/components/layout/MobileNav.tsx) - New bottom nav
- [app/mobile/page.tsx](app/mobile/page.tsx) - Mobile-optimized home

---

## Part 5: Visual Workflow Designer

### ✅ ALREADY IMPLEMENTED
- Workflow engine foundation at [server/workflows.ts](server/workflows.ts)
- Trigger types: ITEM_CREATED, STOCK_BELOW_THRESHOLD, ORDER_COMPLETED, etc.
- Actions: EMAIL, CREATE_PURCHASE_ORDER, ADJUST_INVENTORY, etc.
- Basic workflow API at [app/api/workflows/route.ts](app/api/workflows/route.ts)

### 🔨 WHAT NEEDS TO BE ADDED

#### 5.1 Drag-and-Drop Workflow Builder (HIGH PRIORITY)
**Current:** Workflows created via API only
**Needed:** Visual workflow designer similar to Zapier/n8n

**Implementation:**
- Use React Flow library for node-based editor
- Node types: Trigger, Condition, Action, Delay, Loop
- Visual connections between nodes
- Live preview/test mode
- Template library (common workflows)

**Files to create:**
- [app/admin/workflows/builder/page.tsx](app/admin/workflows/builder/page.tsx) - Visual builder UI
- [client/src/components/workflows/WorkflowCanvas.tsx](client/src/components/workflows/WorkflowCanvas.tsx) - Canvas component
- [client/src/components/workflows/NodeLibrary.tsx](client/src/components/workflows/NodeLibrary.tsx) - Available nodes
- [app/api/workflows/validate/route.ts](app/api/workflows/validate/route.ts) - Validate workflow logic

#### 5.2 Department Routing Customization (MEDIUM PRIORITY)
**Current:** 8 hardcoded departments in [shared/job-tracking.ts](shared/job-tracking.ts)
**Needed:** Per-company customizable departments and routing

**Implementation:**
```typescript
// New models
model CustomDepartment {
  id               String   @id @default(cuid())
  tenantId         String
  name             String
  code             String   // WELDING, PAINTING, etc.
  color            String   // Hex color for UI
  icon             String?  // Icon name
  allowConcurrent  Boolean  @default(true)
  requireQC        Boolean  @default(false)
  defaultDuration  Int?     // Minutes
  order            Int      // Display order

  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, code])
}

model ProductionRouting {
  id               String   @id @default(cuid())
  tenantId         String
  itemId           String   // Which product uses this routing
  name             String   // "Standard Pleated Filter Routing"

  steps            RoutingStep[]

  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  item             Item     @relation(fields: [itemId], references: [id])
}

model RoutingStep {
  id               String   @id @default(cuid())
  routingId        String
  departmentId     String
  sequence         Int
  required         Boolean  @default(true)
  canSkip          Boolean  @default(false)

  routing          ProductionRouting @relation(fields: [routingId], references: [id])
  department       CustomDepartment  @relation(fields: [departmentId], references: [id])

  @@unique([routingId, sequence])
}
```

**Files to create:**
- [app/admin/departments/page.tsx](app/admin/departments/page.tsx) - Department management UI
- [app/admin/routings/page.tsx](app/admin/routings/page.tsx) - Routing designer
- [app/api/departments/route.ts](app/api/departments/route.ts) - Department CRUD
- [app/api/routings/route.ts](app/api/routings/route.ts) - Routing CRUD

---

## Part 6: Quality Management System (QMS)

### ❌ NOT YET IMPLEMENTED
No formal QMS module exists

### 🔨 WHAT NEEDS TO BE ADDED

#### 6.1 Inspection Checklists (HIGH PRIORITY)
**Needed:** Configurable quality checks at each production stage

**Implementation:**
```typescript
model QualityInspection {
  id                String   @id @default(cuid())
  tenantId          String
  productionOrderId String
  departmentId      String
  inspectorId       String
  status            InspectionStatus // PENDING, IN_PROGRESS, PASSED, FAILED

  startedAt         DateTime?
  completedAt       DateTime?

  checklistItems    InspectionCheckItem[]
  defects           QualityDefect[]

  tenant            Tenant           @relation(fields: [tenantId], references: [id])
  productionOrder   ProductionOrder  @relation(fields: [productionOrderId], references: [id])
  inspector         User             @relation(fields: [inspectorId], references: [id])
}

model InspectionCheckItem {
  id               String   @id @default(cuid())
  inspectionId     String
  checklistItemId  String   // Links to master checklist
  result           CheckResult // PASS, FAIL, NA
  measurement      Decimal? @db.Decimal(10,4)
  notes            String?  @db.Text
  photo            String?  // Photo URL of issue

  inspection       QualityInspection @relation(fields: [inspectionId], references: [id])
}

model QualityDefect {
  id               String   @id @default(cuid())
  tenantId         String
  inspectionId     String
  defectTypeId     String
  severity         DefectSeverity // MINOR, MAJOR, CRITICAL
  quantity         Int
  disposition      Disposition // SCRAP, REWORK, USE_AS_IS, RETURN

  inspection       QualityInspection @relation(fields: [inspectionId], references: [id])
  defectType       DefectType        @relation(fields: [defectTypeId], references: [id])
}
```

**Files to create:**
- [app/quality/inspections/page.tsx](app/quality/inspections/page.tsx) - Inspection queue
- [app/quality/inspections/[id]/page.tsx](app/quality/inspections/[id]/page.tsx) - Inspection form
- [app/api/quality/inspections/route.ts](app/api/quality/inspections/route.ts) - Inspection CRUD
- [app/quality/defects/page.tsx](app/quality/defects/page.tsx) - Defect tracking
- [app/admin/quality/checklists/page.tsx](app/admin/quality/checklists/page.tsx) - Checklist designer

---

**This concludes Part 1 of the implementation roadmap. Continue reading ENTERPRISE_ROADMAP_PART2.md for:**
- Part 7: Advanced Analytics
- Part 8: Batch/Wave Picking
- Part 9: Security & Compliance
- Part 10: Implementation Priorities & Timeline
