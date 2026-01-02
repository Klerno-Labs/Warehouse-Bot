# Phase 4: Manufacturing & Bill of Materials (BOM) - Implementation Plan

## Overview
Phase 4 adds manufacturing capabilities to the Warehouse Builder, enabling users to define product structures, create production orders, track component consumption, and analyze manufacturing yield.

## Business Requirements

### Core Capabilities
1. **Bill of Materials (BOM) Management**
   - Multi-level BOMs (finished goods contain sub-assemblies)
   - Component quantities with UOM
   - Scrap/waste factors
   - Effectivity dates (version control)
   - BOM copying and versioning

2. **Production Order Management**
   - Create production orders from BOMs
   - Schedule production runs
   - Track order status (Planned → Released → In Progress → Completed → Closed)
   - Batch/lot tracking
   - Work order routing (optional for Phase 4)

3. **Component Consumption**
   - Issue components to production
   - Backflush consumption (auto-issue based on BOM)
   - Manual adjustments
   - Scrap/waste tracking
   - Return unused components

4. **Production Output**
   - Receive finished goods
   - By-product handling
   - Quality inspection integration (Phase 5)
   - Lot/batch number generation

5. **Yield Analysis**
   - Actual vs. planned consumption
   - Scrap/waste reporting
   - Efficiency metrics
   - Cost analysis (material cost)

## Database Schema Design

### New Enums

```prisma
enum BOMStatus {
  DRAFT           // Being designed
  ACTIVE          // In use
  INACTIVE        // Deprecated
  SUPERSEDED      // Replaced by newer version
}

enum ProductionOrderStatus {
  PLANNED         // Created but not released
  RELEASED        // Released for production
  IN_PROGRESS     // Active production
  COMPLETED       // Production finished
  CLOSED          // Accounting closed
  CANCELLED       // Cancelled order
}

enum ComponentIssueMethod {
  MANUAL          // Manually issued
  BACKFLUSH       // Auto-issued on completion
  PREISSUE        // Issued before production starts
}
```

### New Models

#### BillOfMaterial (BOM Header)
```prisma
model BillOfMaterial {
  id              String      @id @default(uuid())
  tenantId        String
  itemId          String      // Finished good/assembly
  bomNumber       String      // BOM-FG-001
  version         Int         @default(1)
  description     String?
  status          BOMStatus   @default(DRAFT)

  // Quantities
  baseQty         Float       @default(1)    // Qty this BOM produces
  baseUom         UOM         @default(EA)

  // Effectivity
  effectiveFrom   DateTime    @default(now())
  effectiveTo     DateTime?

  // Metadata
  notes           String?
  createdByUserId String?
  approvedByUserId String?
  approvedAt      DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  tenant          Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  item            Item                 @relation("BOMFinishedGood", fields: [itemId], references: [id], onDelete: Restrict)
  createdBy       User?                @relation("BOMCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  approvedBy      User?                @relation("BOMApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)

  components      BOMComponent[]
  productionOrders ProductionOrder[]

  @@unique([tenantId, bomNumber, version])
  @@index([tenantId])
  @@index([itemId])
  @@index([status])
}
```

#### BOMComponent (BOM Line)
```prisma
model BOMComponent {
  id              String      @id @default(uuid())
  bomId           String
  itemId          String      // Component item
  sequence        Int         // Line number/sequence

  // Quantities
  qtyPer          Float       // Qty per base qty of parent
  uom             UOM
  scrapFactor     Float       @default(0)  // % scrap (0-100)

  // Planning
  isOptional      Boolean     @default(false)
  isPurchased     Boolean     @default(false)  // vs manufactured
  leadTimeOffset  Int?        @default(0)      // Days before needed

  // Issue method
  issueMethod     ComponentIssueMethod @default(BACKFLUSH)

  // Metadata
  notes           String?
  referenceDesignator String?  // Engineering ref (e.g., "C1, C2")

  bom             BillOfMaterial @relation(fields: [bomId], references: [id], onDelete: Cascade)
  item            Item           @relation("BOMComponentItem", fields: [itemId], references: [id], onDelete: Restrict)

  consumptions    ProductionConsumption[]

  @@index([bomId])
  @@index([itemId])
  @@unique([bomId, sequence])
}
```

#### ProductionOrder (Production Header)
```prisma
model ProductionOrder {
  id                String                @id @default(uuid())
  tenantId          String
  siteId            String
  bomId             String
  orderNumber       String                // PO-2024-001
  status            ProductionOrderStatus @default(PLANNED)

  // What to produce
  itemId            String                // Finished good
  qtyOrdered        Float
  qtyCompleted      Float                 @default(0)
  qtyRejected       Float                 @default(0)
  uom               UOM

  // When
  scheduledStart    DateTime
  scheduledEnd      DateTime?
  actualStart       DateTime?
  actualEnd         DateTime?

  // Where (optional workcell routing)
  workcellId        String?

  // Lot/Batch tracking
  lotNumber         String?
  batchNumber       String?

  // Metadata
  priority          Int                   @default(5)  // 1=highest, 10=lowest
  notes             String?
  createdByUserId   String?
  releasedByUserId  String?
  releasedAt        DateTime?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  tenant            Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  site              Site                  @relation(fields: [siteId], references: [id], onDelete: Cascade)
  bom               BillOfMaterial        @relation(fields: [bomId], references: [id], onDelete: Restrict)
  item              Item                  @relation("ProductionOrderItem", fields: [itemId], references: [id], onDelete: Restrict)
  workcell          Workcell?             @relation(fields: [workcellId], references: [id], onDelete: SetNull)
  createdBy         User?                 @relation("ProductionOrderCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  releasedBy        User?                 @relation("ProductionOrderReleasedBy", fields: [releasedByUserId], references: [id], onDelete: SetNull)

  consumptions      ProductionConsumption[]
  outputs           ProductionOutput[]

  @@unique([tenantId, orderNumber])
  @@index([tenantId])
  @@index([siteId])
  @@index([bomId])
  @@index([itemId])
  @@index([status])
  @@index([scheduledStart])
}
```

#### ProductionConsumption (Component Usage)
```prisma
model ProductionConsumption {
  id                    String          @id @default(uuid())
  productionOrderId     String
  bomComponentId        String?         // Link to BOM if backflushed
  itemId                String          // Component consumed

  // Quantities
  qtyConsumed           Float
  uom                   UOM
  qtyBase               Float           // Converted to base UOM

  // Source
  fromLocationId        String
  lotNumber             String?
  serialNumber          String?

  // Tracking
  isBackflushed         Boolean         @default(false)
  isScrap               Boolean         @default(false)
  reasonCodeId          String?

  // Reference
  referenceId           String?         // Link to inventory event
  notes                 String?
  createdByUserId       String?
  createdAt             DateTime        @default(now())

  productionOrder       ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  bomComponent          BOMComponent?   @relation(fields: [bomComponentId], references: [id], onDelete: SetNull)
  item                  Item            @relation("ConsumptionItem", fields: [itemId], references: [id], onDelete: Restrict)
  fromLocation          Location        @relation("ConsumptionLocation", fields: [fromLocationId], references: [id], onDelete: Restrict)
  reasonCode            ReasonCode?     @relation(fields: [reasonCodeId], references: [id], onDelete: SetNull)
  createdBy             User?           @relation("ConsumptionCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([productionOrderId])
  @@index([itemId])
  @@index([fromLocationId])
}
```

#### ProductionOutput (Finished Goods Produced)
```prisma
model ProductionOutput {
  id                    String          @id @default(uuid())
  productionOrderId     String
  itemId                String          // Output item (usually finished good)

  // Quantities
  qtyProduced           Float
  qtyRejected           Float           @default(0)
  uom                   UOM
  qtyBase               Float           // Converted to base UOM

  // Destination
  toLocationId          String
  lotNumber             String?
  batchNumber           String?
  expirationDate        DateTime?

  // Quality
  inspectionStatus      String?         // PENDING, PASSED, FAILED (Phase 5)

  // Reference
  referenceId           String?         // Link to inventory event
  notes                 String?
  createdByUserId       String?
  createdAt             DateTime        @default(now())

  productionOrder       ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  item                  Item            @relation("OutputItem", fields: [itemId], references: [id], onDelete: Restrict)
  toLocation            Location        @relation("OutputLocation", fields: [toLocationId], references: [id], onDelete: Restrict)
  createdBy             User?           @relation("OutputCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([productionOrderId])
  @@index([itemId])
  @@index([toLocationId])
}
```

### Model Updates

Update existing models to add relations:

```prisma
// In Tenant model, add:
billsOfMaterial     BillOfMaterial[]
productionOrders    ProductionOrder[]

// In Site model, add:
productionOrders    ProductionOrder[]

// In Item model, add:
boms                BillOfMaterial[]   @relation("BOMFinishedGood")
bomComponents       BOMComponent[]     @relation("BOMComponentItem")
productionOrders    ProductionOrder[]  @relation("ProductionOrderItem")
consumptions        ProductionConsumption[] @relation("ConsumptionItem")
outputs             ProductionOutput[] @relation("OutputItem")

// In Location model, add:
consumptions        ProductionConsumption[] @relation("ConsumptionLocation")
outputs             ProductionOutput[] @relation("OutputLocation")

// In Workcell model, add:
productionOrders    ProductionOrder[]

// In User model, add:
bomsCreated         BillOfMaterial[]   @relation("BOMCreatedBy")
bomsApproved        BillOfMaterial[]   @relation("BOMApprovedBy")
productionOrdersCreated ProductionOrder[] @relation("ProductionOrderCreatedBy")
productionOrdersReleased ProductionOrder[] @relation("ProductionOrderReleasedBy")
consumptionsCreated ProductionConsumption[] @relation("ConsumptionCreatedBy")
outputsCreated      ProductionOutput[] @relation("OutputCreatedBy")

// In ReasonCode model, add:
consumptions        ProductionConsumption[]
```

## API Endpoints

### BOM Management

**GET /api/manufacturing/boms**
- Query: status, itemId
- Returns: List of BOMs with component counts

**POST /api/manufacturing/boms**
- Body: BOM header + components array
- Returns: Created BOM with components

**GET /api/manufacturing/boms/[id]**
- Returns: Full BOM with all components and item details

**PUT /api/manufacturing/boms/[id]**
- Body: Partial BOM update
- Returns: Updated BOM

**DELETE /api/manufacturing/boms/[id]**
- Validation: No active production orders
- Returns: Success

**POST /api/manufacturing/boms/[id]/copy**
- Body: New BOM number, version
- Returns: Copied BOM with new ID

**POST /api/manufacturing/boms/[id]/activate**
- Sets status to ACTIVE, sets approvedAt
- Returns: Updated BOM

### Production Orders

**GET /api/manufacturing/production-orders**
- Query: status, siteId, dateFrom, dateTo
- Returns: List of production orders

**POST /api/manufacturing/production-orders**
- Body: Order details, BOM ID, qty ordered
- Auto-generates order number
- Returns: Created production order

**GET /api/manufacturing/production-orders/[id]**
- Returns: Full order with BOM, consumptions, outputs

**PUT /api/manufacturing/production-orders/[id]**
- Body: Partial update (status, dates, notes)
- Business logic for status transitions
- Returns: Updated order

**DELETE /api/manufacturing/production-orders/[id]**
- Validation: Must be PLANNED status
- Returns: Success

**POST /api/manufacturing/production-orders/[id]/release**
- Changes status from PLANNED → RELEASED
- Sets releasedBy and releasedAt
- Returns: Updated order

**POST /api/manufacturing/production-orders/[id]/start**
- Changes status to IN_PROGRESS
- Sets actualStart
- Optionally pre-issues components
- Returns: Updated order

**POST /api/manufacturing/production-orders/[id]/complete**
- Requires: All consumptions recorded
- Backflushes remaining components if configured
- Creates output record
- Creates RECEIVE inventory event
- Changes status to COMPLETED
- Returns: Updated order with output

### Component Consumption

**POST /api/manufacturing/production-orders/[id]/consume**
- Body: Array of component consumptions
- Validates: Item exists in BOM or allows manual additions
- Creates ISSUE_TO_WORKCELL inventory events
- Updates inventory balances
- Returns: Created consumption records

**POST /api/manufacturing/production-orders/[id]/backflush**
- Auto-calculates component consumption based on:
  - BOM quantities
  - Qty produced
  - Scrap factors
- Creates consumption records
- Creates inventory events
- Returns: Backflushed consumption records

**GET /api/manufacturing/production-orders/[id]/consumption**
- Returns: All consumption records for order

### Production Output

**POST /api/manufacturing/production-orders/[id]/output**
- Body: Qty produced, qty rejected, location, lot/batch
- Creates output record
- Creates RECEIVE inventory event for finished goods
- Updates production order qtyCompleted
- Returns: Created output record

**GET /api/manufacturing/production-orders/[id]/outputs**
- Returns: All output records for order

### Reporting

**GET /api/manufacturing/reports/yield**
- Query: dateFrom, dateTo, itemId
- Calculates: Actual vs planned consumption, scrap %
- Returns: Yield analysis data

**GET /api/manufacturing/reports/wip**
- Returns: Work in progress summary
- Orders IN_PROGRESS with material value

## Storage Layer Methods

```typescript
// BOM Methods
getBOMsByTenant(tenantId: string)
getBOMById(bomId: string)
getBOMByItem(itemId: string)
createBOM(data: BOMCreateData)
updateBOM(bomId: string, data: BOMUpdateData)
deleteBOM(bomId: string)
copyBOM(bomId: string, newBOMNumber: string, newVersion: number)

// BOM Component Methods
getBOMComponents(bomId: string)
createBOMComponent(data: BOMComponentData)
updateBOMComponent(componentId: string, data: BOMComponentData)
deleteBOMComponent(componentId: string)

// Production Order Methods
getProductionOrdersByTenant(tenantId: string, filters?)
getProductionOrderById(orderId: string)
createProductionOrder(data: ProductionOrderData)
updateProductionOrder(orderId: string, data: ProductionOrderUpdateData)
deleteProductionOrder(orderId: string)

// Consumption Methods
getConsumptionsByOrder(orderId: string)
createConsumption(data: ConsumptionData)
backflushConsumption(orderId: string, qtyProduced: number)

// Output Methods
getOutputsByOrder(orderId: string)
createOutput(data: OutputData)

// Reporting
getYieldAnalysis(filters: YieldFilters)
getWIPSummary(siteId: string)
```

## User Interface

### BOM Management Page (`/manufacturing/boms`)

**Features:**
- List view with search and status filter
- Create BOM dialog
- BOM detail view showing tree structure
- Copy BOM function
- Activate/deactivate BOM
- Multi-level component display

**Create BOM Dialog:**
- Select finished good item
- BOM number (auto-generated or manual)
- Base quantity and UOM
- Effective dates
- Add components with:
  - Item selection
  - Qty per base qty
  - UOM
  - Scrap factor %
  - Issue method
  - Optional flag

### Production Orders Page (`/manufacturing/production-orders`)

**Features:**
- List view with status filter, date range
- Create order dialog
- Order detail view
- Status workflow buttons:
  - PLANNED → Release
  - RELEASED → Start Production
  - IN_PROGRESS → Record Output
  - IN_PROGRESS → Complete
- Material requirements display
- Consumption tracking

**Create Order Dialog:**
- Select BOM (dropdown shows active BOMs)
- Qty to produce
- Scheduled start/end dates
- Workcell selection (optional)
- Lot/batch number
- Priority

**Order Detail View:**
- Header info (order #, item, qty, dates, status)
- Material Requirements table:
  - Component item
  - Required qty (calculated from BOM)
  - Consumed qty
  - Remaining qty
  - Status
- Consumption history
- Output history
- Action buttons based on status

### Production Execution Page (`/manufacturing/execute/[id]`)

**Simplified UI for shop floor:**
- Large fonts, touch-friendly
- Current order info
- Quick consume components:
  - Scan/select item
  - Enter qty
  - Select source location
  - Quick submit
- Record output:
  - Qty produced
  - Qty rejected
  - Destination location
  - Auto-generate lot number
- Complete order button

### Yield Analysis Page (`/manufacturing/reports/yield`)

**Features:**
- Date range selector
- Item filter
- Summary metrics:
  - Total orders completed
  - Avg yield %
  - Total scrap value
- Detailed table:
  - Order number
  - Item produced
  - Planned vs actual consumption
  - Variance
  - Scrap %
- Export to Excel/CSV

## Business Logic & Workflows

### BOM Lifecycle
1. **DRAFT** - Creating and editing
   - Can add/remove/edit components
   - Can delete entire BOM

2. **ACTIVE** - Approved for use
   - Cannot modify (must create new version)
   - Can be used for production orders
   - Can deactivate

3. **INACTIVE** - Temporarily disabled
   - Cannot create new orders
   - Existing orders can continue

4. **SUPERSEDED** - Replaced by newer version
   - Read-only
   - Historical reference only

### Production Order Lifecycle
1. **PLANNED** - Initial creation
   - Material requirements calculated
   - Can edit all fields
   - Can delete

2. **RELEASED** - Ready for production
   - Can start production
   - Can pre-issue materials
   - Cannot delete

3. **IN_PROGRESS** - Active production
   - Record component consumption
   - Record output
   - Can complete

4. **COMPLETED** - Production finished
   - All materials consumed/returned
   - Output recorded
   - Can close

5. **CLOSED** - Accounting closed
   - Read-only
   - No further transactions

6. **CANCELLED** - Cancelled order
   - Return any issued materials
   - No further transactions

### Component Consumption Logic

**Manual Issue:**
1. User selects component from BOM
2. Enters qty to consume
3. Selects source location
4. System:
   - Validates qty available
   - Converts to base UOM
   - Creates consumption record
   - Creates ISSUE_TO_WORKCELL inventory event
   - Updates inventory balance

**Backflush:**
1. User records output qty
2. System calculates:
   - Required component qty = (BOM qty per) × (output qty) × (1 + scrap factor)
3. For each component with BACKFLUSH method:
   - Create consumption record
   - Create inventory event
   - Update balance

**Pre-issue:**
1. When order is started
2. System issues all PRE-ISSUE components
3. Same process as manual issue

### Output Recording Logic
1. User enters:
   - Qty produced
   - Qty rejected (optional)
   - Destination location
   - Lot/batch number
2. System:
   - Creates output record
   - Creates RECEIVE inventory event
   - Updates inventory balance
   - Updates production order qtyCompleted
   - Triggers backflush if configured

### Yield Calculation
```
Material Yield % = (Actual Qty Used / Planned Qty) × 100
Scrap % = (Qty Scrapped / Total Qty Issued) × 100
Production Efficiency = (Qty Produced / Qty Ordered) × 100
```

## Integration Points

### Inventory System
- Component consumption creates ISSUE_TO_WORKCELL events
- Output creates RECEIVE events
- All events update InventoryBalance
- Supports multi-UOM conversion
- Location-based tracking

### Purchasing Module (Phase 3)
- BOM data drives material requirements
- Can generate purchase requisitions for components
- Link PO items to production orders

### Quality Control (Phase 5)
- Output can have inspection status
- Failed inspections → scrap or rework
- Certificate of Analysis for lots

## Testing Checklist

### BOM Management
- [ ] Create BOM with single-level components
- [ ] Create multi-level BOM (sub-assemblies)
- [ ] Edit BOM in DRAFT status
- [ ] Activate BOM
- [ ] Attempt edit of ACTIVE BOM (should fail)
- [ ] Copy BOM to new version
- [ ] Delete unused BOM
- [ ] Validate scrap factor calculations

### Production Orders
- [ ] Create order from active BOM
- [ ] Material requirements calculated correctly
- [ ] Release order
- [ ] Start production
- [ ] Record component consumption manually
- [ ] Record multiple consumptions
- [ ] Record output with lot number
- [ ] Complete order
- [ ] Verify inventory updated correctly

### Backflushing
- [ ] Create order with BACKFLUSH components
- [ ] Record output
- [ ] Verify components auto-consumed
- [ ] Check qty with scrap factor applied
- [ ] Verify inventory events created

### Yield Analysis
- [ ] Complete several orders
- [ ] View yield report
- [ ] Verify calculations accurate
- [ ] Filter by date range
- [ ] Filter by item
- [ ] Export report

### Integration
- [ ] Verify ISSUE_TO_WORKCELL events appear
- [ ] Verify RECEIVE events for output
- [ ] Check inventory balances updated
- [ ] Test multi-UOM consumption
- [ ] Verify audit trail

## Future Enhancements

1. **Work Order Routing**
   - Operations/steps within production
   - Time tracking per operation
   - Move between work centers

2. **Advanced Costing**
   - Standard cost rollup
   - Actual cost tracking
   - Variance analysis

3. **Planning & Scheduling**
   - MRP (Material Requirements Planning)
   - Capacity planning
   - Gantt chart scheduling

4. **Mobile Shop Floor App**
   - Barcode scanning for consumption
   - Touch-optimized execution
   - Offline capability

5. **Advanced Reporting**
   - OEE (Overall Equipment Effectiveness)
   - Downtime tracking
   - Production analytics

## File Structure

```
app/
├── api/
│   └── manufacturing/
│       ├── boms/
│       │   ├── route.ts (GET, POST)
│       │   └── [id]/
│       │       ├── route.ts (GET, PUT, DELETE)
│       │       ├── copy/route.ts
│       │       └── activate/route.ts
│       ├── production-orders/
│       │   ├── route.ts (GET, POST)
│       │   └── [id]/
│       │       ├── route.ts (GET, PUT, DELETE)
│       │       ├── release/route.ts
│       │       ├── start/route.ts
│       │       ├── complete/route.ts
│       │       ├── consume/route.ts
│       │       ├── backflush/route.ts
│       │       ├── output/route.ts
│       │       └── consumption/route.ts
│       └── reports/
│           ├── yield/route.ts
│           └── wip/route.ts
│
├── (app)/
│   └── manufacturing/
│       ├── page.tsx (hub)
│       ├── boms/
│       │   └── page.tsx
│       ├── production-orders/
│       │   └── page.tsx
│       ├── execute/
│       │   └── [id]/page.tsx
│       └── reports/
│           └── yield/page.tsx
│
client/src/pages/manufacturing/
├── boms.tsx
├── production-orders.tsx
├── execute.tsx
└── yield-analysis.tsx

server/
└── manufacturing.ts (business logic)
```

## Success Criteria

Phase 4 is complete when:
- ✅ Can create and manage multi-level BOMs
- ✅ Can create production orders from BOMs
- ✅ Can manually consume components with inventory updates
- ✅ Can backflush components automatically
- ✅ Can record production output with lot tracking
- ✅ Can view yield analysis and variance
- ✅ All inventory events created correctly
- ✅ Multi-UOM conversions work properly
- ✅ Zero TypeScript errors
- ✅ Production build successful
- ✅ Comprehensive documentation created

## Estimated Timeline
- Database schema: 1 day
- Storage layer: 2 days
- API endpoints: 3 days
- BOM UI: 2 days
- Production Order UI: 2 days
- Execution UI: 2 days
- Testing & debugging: 2 days

**Total: ~14 days (2-3 weeks)**
