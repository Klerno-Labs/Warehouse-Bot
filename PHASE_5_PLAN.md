# Phase 5: Quality Control Module - Implementation Plan

**Status:** Planning
**Start Date:** January 2, 2026
**Priority:** High
**Dependencies:** Phase 4 (Manufacturing/BOM Module)

## Overview

Phase 5 adds comprehensive quality control capabilities to the Warehouse Builder ERP system, integrating inspection workflows, non-conformance tracking, and quality metrics with the existing manufacturing and inventory modules.

## Business Requirements

### 1. Quality Inspection Management
- Define inspection plans for items and operations
- Record inspection results (pass/fail/conditional)
- Track inspection measurements and specifications
- Support multiple inspection types:
  - Receiving inspection (from POs)
  - In-process inspection (during production)
  - Final inspection (production output)
  - Random/sampling inspection

### 2. Non-Conformance Tracking
- Record quality issues and defects
- Track root cause and corrective actions
- Link to source transactions (receipts, production)
- Disposition management (scrap, rework, use-as-is, return)
- Cost impact tracking

### 3. Quality Metrics & Reporting
- Defect rate by supplier
- Defect rate by production order
- First-pass yield
- Cost of quality
- Pareto analysis of defect types

### 4. Integration Points
- **Receiving:** Auto-trigger inspection on PO receipt
- **Production:** Inspect output before accepting to inventory
- **Inventory:** Place items on hold pending inspection
- **Suppliers:** Track quality performance

## Database Schema Design

### New Enums

#### InspectionStatus
- PENDING - Inspection scheduled, not started
- IN_PROGRESS - Inspection started
- PASSED - All criteria met
- FAILED - Critical criteria not met
- CONDITIONAL - Passed with minor issues
- WAIVED - Inspection waived/skipped

#### InspectionType
- RECEIVING - Incoming material inspection
- IN_PROCESS - Work-in-process inspection
- FINAL - Final product inspection
- RANDOM - Random sampling inspection
- FIRST_ARTICLE - First piece inspection

#### NCRStatus (Non-Conformance Report)
- OPEN - NCR created, under investigation
- IN_REVIEW - Root cause analysis in progress
- CORRECTIVE_ACTION - Implementing correction
- CLOSED - Issue resolved
- CANCELLED - NCR cancelled

#### NCRDisposition
- SCRAP - Material scrapped
- REWORK - Material to be reworked
- USE_AS_IS - Accept material as-is
- RETURN_TO_SUPPLIER - Return to vendor
- PENDING - Awaiting disposition decision

#### MeasurementType
- NUMERIC - Numeric measurement (e.g., length, weight)
- PASS_FAIL - Binary pass/fail
- VISUAL - Visual inspection notes
- ATTRIBUTE - Categorical attribute

### New Models

#### 1. InspectionPlan
Defines what to inspect and acceptance criteria.

```prisma
model InspectionPlan {
  id              String            @id @default(uuid())
  tenantId        String
  code            String
  name            String
  description     String?
  type            InspectionType

  // Applicability
  itemId          String?           // If item-specific
  processStep     String?           // If process-specific

  // Sampling
  sampleSize      Int               @default(1)
  samplePercent   Float?            // % of lot to sample

  // Criteria
  isActive        Boolean           @default(true)
  requiresApproval Boolean          @default(false)

  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  item            Item?             @relation(fields: [itemId], references: [id], onDelete: SetNull)
  checkpoints     InspectionCheckpoint[]
  inspections     QualityInspection[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([itemId])
  @@index([type])
}
```

#### 2. InspectionCheckpoint
Individual inspection criteria within a plan.

```prisma
model InspectionCheckpoint {
  id                  String            @id @default(uuid())
  inspectionPlanId    String
  sequence            Int

  // What to check
  characteristic      String            // e.g., "Length", "Color", "Finish"
  measurementType     MeasurementType

  // Specifications (for numeric)
  targetValue         Float?
  lowerLimit          Float?
  upperLimit          Float?
  uom                 String?

  // Acceptance (for pass/fail)
  passCriteria        String?           // Description of pass

  isCritical          Boolean           @default(false)
  notes               String?

  // Relations
  inspectionPlan      InspectionPlan    @relation(fields: [inspectionPlanId], references: [id], onDelete: Cascade)
  results             InspectionResult[]

  @@unique([inspectionPlanId, sequence])
  @@index([inspectionPlanId])
}
```

#### 3. QualityInspection
Inspection execution record.

```prisma
model QualityInspection {
  id                  String            @id @default(uuid())
  tenantId            String
  inspectionNumber    String
  inspectionPlanId    String
  status              InspectionStatus  @default(PENDING)
  type                InspectionType

  // What's being inspected
  itemId              String
  lotNumber           String?

  // Source transaction
  purchaseReceiptId   String?           // If from receiving
  productionOutputId  String?           // If from production

  // Inspection details
  qtyInspected        Float
  qtySampled          Float
  qtyPassed           Float             @default(0)
  qtyFailed           Float             @default(0)

  // When
  scheduledDate       DateTime?
  inspectionDate      DateTime?
  completedDate       DateTime?

  // Who
  inspectorUserId     String?
  approvedByUserId    String?
  approvedAt          DateTime?

  // Results
  overallResult       String?           // Summary
  notes               String?

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  // Relations
  tenant              Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inspectionPlan      InspectionPlan    @relation(fields: [inspectionPlanId], references: [id], onDelete: Restrict)
  item                Item              @relation(fields: [itemId], references: [id], onDelete: Restrict)
  inspector           User?             @relation("InspectorInspections", fields: [inspectorUserId], references: [id], onDelete: SetNull)
  approvedBy          User?             @relation("ApprovedInspections", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  results             InspectionResult[]
  ncrs                NonConformanceReport[]

  @@unique([tenantId, inspectionNumber])
  @@index([tenantId])
  @@index([inspectionPlanId])
  @@index([itemId])
  @@index([status])
  @@index([type])
}
```

#### 4. InspectionResult
Individual checkpoint measurement/result.

```prisma
model InspectionResult {
  id                      String                @id @default(uuid())
  qualityInspectionId     String
  inspectionCheckpointId  String

  // Measured value
  numericValue            Float?
  passFailValue           Boolean?
  textValue               String?

  // Result
  isPass                  Boolean
  notes                   String?

  measuredByUserId        String?
  measuredAt              DateTime              @default(now())

  // Relations
  inspection              QualityInspection     @relation(fields: [qualityInspectionId], references: [id], onDelete: Cascade)
  checkpoint              InspectionCheckpoint  @relation(fields: [inspectionCheckpointId], references: [id], onDelete: Restrict)
  measuredBy              User?                 @relation(fields: [measuredByUserId], references: [id], onDelete: SetNull)

  @@index([qualityInspectionId])
  @@index([inspectionCheckpointId])
}
```

#### 5. NonConformanceReport (NCR)
Quality issue tracking.

```prisma
model NonConformanceReport {
  id                    String            @id @default(uuid())
  tenantId              String
  ncrNumber             String
  status                NCRStatus         @default(OPEN)
  disposition           NCRDisposition    @default(PENDING)

  // What's the issue
  title                 String
  description           String
  defectType            String?           // Category
  severity              String?           // LOW, MEDIUM, HIGH, CRITICAL

  // Where found
  qualityInspectionId   String?
  itemId                String
  lotNumber             String?
  qtyAffected           Float

  // Source
  supplierId            String?           // If supplier issue
  productionOrderId     String?           // If production issue

  // Root cause
  rootCause             String?
  correctiveAction      String?
  preventiveAction      String?

  // Cost impact
  costImpact            Float?            @default(0)

  // Responsibility
  reportedByUserId      String
  assignedToUserId      String?

  // Dates
  reportedDate          DateTime          @default(now())
  targetCloseDate       DateTime?
  actualCloseDate       DateTime?

  notes                 String?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // Relations
  tenant                Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inspection            QualityInspection? @relation(fields: [qualityInspectionId], references: [id], onDelete: SetNull)
  item                  Item              @relation(fields: [itemId], references: [id], onDelete: Restrict)
  supplier              Supplier?         @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  productionOrder       ProductionOrder?  @relation(fields: [productionOrderId], references: [id], onDelete: SetNull)
  reportedBy            User              @relation("ReportedNCRs", fields: [reportedByUserId], references: [id], onDelete: Restrict)
  assignedTo            User?             @relation("AssignedNCRs", fields: [assignedToUserId], references: [id], onDelete: SetNull)

  @@unique([tenantId, ncrNumber])
  @@index([tenantId])
  @@index([status])
  @@index([disposition])
  @@index([qualityInspectionId])
  @@index([itemId])
  @@index([supplierId])
  @@index([productionOrderId])
}
```

### Model Updates

#### Existing Models Requiring Relations

**Tenant:**
```prisma
inspectionPlans         InspectionPlan[]
qualityInspections      QualityInspection[]
ncrs                    NonConformanceReport[]
```

**Item:**
```prisma
inspectionPlans         InspectionPlan[]
qualityInspections      QualityInspection[]
ncrs                    NonConformanceReport[]
```

**User:**
```prisma
inspectionsPerformed    QualityInspection[] @relation("InspectorInspections")
inspectionsApproved     QualityInspection[] @relation("ApprovedInspections")
measurementsTaken       InspectionResult[]
ncrsReported            NonConformanceReport[] @relation("ReportedNCRs")
ncrsAssigned            NonConformanceReport[] @relation("AssignedNCRs")
```

**Supplier:**
```prisma
ncrs                    NonConformanceReport[]
```

**ProductionOrder:**
```prisma
ncrs                    NonConformanceReport[]
```

## API Endpoints

### Inspection Plans (5 endpoints)

1. **GET /api/quality/inspection-plans**
   - List all inspection plans
   - Filter by type, item, active status

2. **POST /api/quality/inspection-plans**
   - Create new inspection plan with checkpoints
   - Validate checkpoint specifications

3. **GET /api/quality/inspection-plans/[id]**
   - Get single plan with checkpoints

4. **PUT /api/quality/inspection-plans/[id]**
   - Update plan and checkpoints

5. **DELETE /api/quality/inspection-plans/[id]**
   - Delete plan (if no inspections exist)

### Quality Inspections (7 endpoints)

1. **GET /api/quality/inspections**
   - List all inspections
   - Filter by status, type, date range

2. **POST /api/quality/inspections**
   - Create new inspection from plan
   - Auto-populate checkpoints

3. **GET /api/quality/inspections/[id]**
   - Get inspection with all results

4. **PUT /api/quality/inspections/[id]**
   - Update inspection status/notes

5. **POST /api/quality/inspections/[id]/results**
   - Record checkpoint results
   - Auto-calculate overall pass/fail

6. **POST /api/quality/inspections/[id]/complete**
   - Complete inspection
   - Update qtys (passed/failed)
   - Create NCR if failed

7. **GET /api/quality/inspections/[id]/certificate**
   - Generate inspection certificate (PDF/print)

### Non-Conformance Reports (6 endpoints)

1. **GET /api/quality/ncrs**
   - List all NCRs
   - Filter by status, disposition, severity

2. **POST /api/quality/ncrs**
   - Create new NCR
   - Auto-assign NCR number

3. **GET /api/quality/ncrs/[id]**
   - Get NCR details

4. **PUT /api/quality/ncrs/[id]**
   - Update NCR (root cause, actions)

5. **POST /api/quality/ncrs/[id]/disposition**
   - Set disposition (scrap/rework/etc)
   - Execute disposition actions

6. **POST /api/quality/ncrs/[id]/close**
   - Close NCR
   - Validate corrective action complete

### Quality Metrics (4 endpoints)

1. **GET /api/quality/metrics/supplier**
   - Defect rate by supplier
   - Accept/reject ratios

2. **GET /api/quality/metrics/production**
   - First-pass yield
   - Defect rate by production order

3. **GET /api/quality/metrics/cost**
   - Cost of quality
   - Scrap costs, rework costs

4. **GET /api/quality/metrics/pareto**
   - Top defect types
   - Frequency analysis

## Storage Layer Methods

```typescript
// Inspection Plans
async getInspectionPlans(tenantId: string, filters?)
async getInspectionPlanById(planId: string)
async createInspectionPlan(data)
async updateInspectionPlan(planId: string, data)
async deleteInspectionPlan(planId: string)

// Quality Inspections
async getQualityInspections(tenantId: string, filters?)
async getQualityInspectionById(inspectionId: string)
async createQualityInspection(data)
async updateQualityInspection(inspectionId: string, data)
async createInspectionResult(data)
async completeInspection(inspectionId: string, data)

// NCRs
async getNCRs(tenantId: string, filters?)
async getNCRById(ncrId: string)
async createNCR(data)
async updateNCR(ncrId: string, data)
async setNCRDisposition(ncrId: string, disposition, data)
async closeNCR(ncrId: string, data)
```

## Business Logic Functions

### 1. createInspectionFromPlan()
Auto-populate inspection from plan template.

```typescript
function createInspectionFromPlan(
  planId: string,
  data: {
    itemId: string;
    lotNumber?: string;
    qtyInspected: number;
    type: InspectionType;
  }
): Promise<QualityInspection>
```

### 2. calculateInspectionResult()
Determine overall pass/fail from checkpoint results.

```typescript
function calculateInspectionResult(
  inspectionId: string
): Promise<{
  overallResult: InspectionStatus;
  criticalFailures: number;
  minorFailures: number;
  passRate: number;
}>
```

### 3. executeDisposition()
Perform disposition action (scrap, rework, etc).

```typescript
function executeDisposition(
  ncrId: string,
  disposition: NCRDisposition,
  data: {
    toLocationId?: string; // For rework/return
    reasonCodeId?: string; // For scrap
  }
): Promise<{
  inventoryAdjustments: InventoryEvent[];
  updated NCR: NonConformanceReport;
}>
```

### 4. calculateSupplierQuality()
Generate supplier quality scorecard.

```typescript
function calculateSupplierQuality(
  supplierId: string,
  dateRange: { from: Date; to: Date }
): Promise<{
  totalReceipts: number;
  totalInspected: number;
  passedInspections: number;
  failedInspections: number;
  defectRate: number; // %
  topDefects: Array<{ defectType: string; count: number }>;
  costImpact: number;
}>
```

## UI Components

### 1. Inspection Plans Page
**Route:** `/quality/inspection-plans`

**Features:**
- List all inspection plans
- Create new plan with checkpoint builder
- Edit existing plans
- Activate/deactivate plans
- View checkpoint specifications

### 2. Quality Inspections Page
**Route:** `/quality/inspections`

**Features:**
- List inspections with status
- Create new inspection from plan
- Record inspection results
- Complete inspections
- View inspection history
- Print certificates

### 3. Inspection Execution Dialog
**Component:** Modal for recording results

**Features:**
- Show all checkpoints
- Enter measurements
- Pass/fail each checkpoint
- Auto-calculate overall result
- Create NCR for failures

### 4. Non-Conformance Reports Page
**Route:** `/quality/ncrs`

**Features:**
- List all NCRs
- Create new NCR
- Update root cause/actions
- Set disposition
- Close NCRs
- Filter by status/severity

### 5. Quality Metrics Dashboard
**Route:** `/quality/metrics`

**Features:**
- Supplier quality scorecard
- Production quality trends
- Cost of quality
- Pareto chart of defects
- First-pass yield trends

## Integration Points

### Production Output Integration
When recording production output:
```typescript
// In POST /api/manufacturing/production-orders/[id]/output
if (requiresInspection) {
  // Create pending inspection
  const inspection = await createInspectionFromPlan({
    planId: item.finalInspectionPlanId,
    itemId: order.itemId,
    lotNumber: outputData.lotNumber,
    qtyInspected: outputData.qtyProduced,
    type: "FINAL",
  });

  // Don't accept to inventory yet - hold pending inspection
  // Set inspectionStatus = "PENDING_INSPECTION"
}
```

### Purchase Receipt Integration
When receiving material:
```typescript
// In POST /api/purchasing/receipts
if (requiresInspection) {
  // Create receiving inspection
  const inspection = await createInspectionFromPlan({
    planId: item.receivingInspectionPlanId,
    itemId: receipt.itemId,
    lotNumber: receipt.lotNumber,
    qtyInspected: receipt.qtyReceived,
    type: "RECEIVING",
  });

  // Place in inspection hold location
}
```

## Testing Checklist

### Database
- [ ] All models created correctly
- [ ] All relations working
- [ ] Unique constraints enforced
- [ ] Enums accessible

### API Endpoints
- [ ] Inspection plan CRUD
- [ ] Quality inspection CRUD
- [ ] Inspection result recording
- [ ] NCR CRUD
- [ ] NCR disposition
- [ ] Metrics calculations

### Business Logic
- [ ] Create inspection from plan
- [ ] Calculate overall result
- [ ] Execute disposition
- [ ] Supplier quality metrics

### UI
- [ ] Inspection plans page
- [ ] Inspections page
- [ ] Inspection execution
- [ ] NCR management
- [ ] Metrics dashboard

### Integration
- [ ] Production output triggers inspection
- [ ] Receipt triggers inspection
- [ ] Failed inspection creates NCR
- [ ] Disposition updates inventory

## Future Enhancements

### Statistical Process Control (SPC)
- Control charts (X-bar, R, p, c)
- Cpk/Ppk calculations
- Trend analysis
- Out-of-control alerts

### Advanced Quality Tools
- FMEA (Failure Mode Effects Analysis)
- APQP (Advanced Product Quality Planning)
- PPAP (Production Part Approval Process)
- MSA (Measurement Systems Analysis)

### Supplier Portal
- Supplier self-service NCR response
- CAPA (Corrective/Preventive Action) tracking
- Quality agreements
- Supplier certifications

### Document Control
- Quality manual version control
- Procedure attachments
- Training records
- Calibration tracking

## Success Criteria

Phase 5 will be considered complete when:

1. ✅ All database models created and migrated
2. ✅ All API endpoints implemented and tested
3. ✅ All UI components functional
4. ✅ Integration with production and receiving works
5. ✅ Can create and execute complete inspection workflow
6. ✅ Can track NCRs from creation to closure
7. ✅ Quality metrics calculate correctly
8. ✅ Zero TypeScript errors
9. ✅ Documentation complete

## Timeline Estimate

- Database Schema: 1-2 hours
- Storage Layer: 2-3 hours
- API Endpoints: 4-5 hours
- Business Logic: 2-3 hours
- UI Components: 5-6 hours
- Integration: 2-3 hours
- Testing: 2-3 hours

**Total: 18-25 hours of development time**
